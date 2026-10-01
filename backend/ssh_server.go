package main

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"log"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/ssh"
)

var (
	sessionRiskMutex sync.Mutex
	sessionRiskCount = make(map[string]int)
)

const attackHistoryPath = "attack_history.txt"

// AttackHistoryEntry registra una entrada textual del historial de ataques.
type AttackHistoryEntry struct {
	Timestamp time.Time
	Service   string
	EventType string
	Payload   string
	IP        string
	MAC       string
	SessionID string
	Bot       string // human | bot | suspect — marca del detector al momento del evento
}

// TelemetryMessage incluye metadatos del atacante y la sesión para la interfaz.
type TelemetryMessage struct {
	Service   string `json:"service"`
	Type      string `json:"type"`
	Payload   string `json:"payload"`
	IP        string `json:"ip"`
	MAC       string `json:"mac"`
	SessionID string `json:"session_id,omitempty"`
	Timestamp string `json:"timestamp,omitempty"`
	Bot       string `json:"bot,omitempty"`
}

// KeyEvent representa una pulsación individual o un comando completo ejecutado por el atacante.
type KeyEvent struct {
	Timestamp time.Time `json:"timestamp"`
	SessionID string    `json:"session_id"`
	Service   string    `json:"service"`
	IP        string    `json:"ip"`
	MAC       string    `json:"mac"`
	Key       string    `json:"key"`
	Raw       string    `json:"raw,omitempty"`
	Command   string    `json:"command,omitempty"`
	Type      string    `json:"type"`
}

var sensitiveCommands = []string{
	"sudo", "su", "rm", "passwd", "chmod", "chown", "wget", "curl", "nc", "bash", "sh", "iptables",
	"pacman", "apt", "yum", "apk", "dd", "mkfifo", "perl", "python", "ruby", "nc.openbsd", "ncat",
}

var sensitivePatterns = []string{
	":(){", ":|:&", "forkbomb", "rm -rf", "chmod 777", "chmod -R", "> /dev/sda", "/dev/urandom",
}

// getMACAddress lee la tabla ARP del kernel de Linux para obtener la huella física
func getMACAddress(ip string) string {
	data, err := os.ReadFile("/proc/net/arp")
	if err != nil {
		return "Desconocida (Error ARP)"
	}
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) >= 4 && fields[0] == ip {
			return fields[3] // El cuarto campo en /proc/net/arp es la HW address (MAC)
		}
	}
	// Si es localhost (como en tus pruebas), la MAC no pasa por ARP
	if ip == "127.0.0.1" || ip == "::1" {
		return "00:00:00:00:00:00 (Localhost)"
	}
	return "Desconocida (Fuera de LAN)"
}

func startSSHServer() {
	config := &ssh.ServerConfig{
		PasswordCallback: func(c ssh.ConnMetadata, pass []byte) (*ssh.Permissions, error) {
			ip, _, _ := net.SplitHostPort(c.RemoteAddr().String())
			mac := getMACAddress(ip)
			log.Printf("🔑 Intento de login - Usuario: %s, Password: %s | Atacante: %s (%s)", c.User(), string(pass), ip, mac)
			return nil, nil
		},
	}

	keyPath := "honeypot_rsa"
	var signer ssh.Signer

	// Verificar si la llave ya existe en el disco
	if _, err := os.Stat(keyPath); os.IsNotExist(err) {
		log.Println("Generando nueva llave RSA para el Honeypot SSH...")
		privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			log.Fatalf("Error generando llave RSA: %v", err)
		}
		privateKeyDER := x509.MarshalPKCS1PrivateKey(privateKey)
		privateKeyPEM := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: privateKeyDER})

		// Guardar la llave en un archivo físico con permisos restrictivos
		if err := os.WriteFile(keyPath, privateKeyPEM, 0600); err != nil {
			log.Fatalf("Error guardando llave RSA: %v", err)
		}
	}

	// Cargar la llave desde el archivo
	pemBytes, err := os.ReadFile(keyPath)
	if err != nil {
		log.Fatalf("Error leyendo archivo de llave RSA: %v", err)
	}
	signer, err = ssh.ParsePrivateKey(pemBytes)
	if err != nil {
		log.Fatalf("Error parseando llave privada: %v", err)
	}

	config.AddHostKey(signer)

	listener, err := net.Listen("tcp", "0.0.0.0:2222")
	if err != nil {
		log.Fatalf("Error iniciando servidor SSH: %v", err)
	}
	log.Println("Honeypot SSH escuchando en el puerto 2222...")

	for {
		nConn, err := listener.Accept()
		if err != nil {
			log.Printf("Error aceptando conexión: %v", err)
			continue
		}

		ip, _, _ := net.SplitHostPort(nConn.RemoteAddr().String())

		// Intercepción inmediata contra lista negra de IPs / DNS baneados
		if globalBanManager != nil {
			if banned, reason := globalBanManager.IsBanned(ip); banned {
				log.Printf("⛔ CONEXIÓN RECHAZADA - IP Baneada %s: %s", ip, reason)
				nConn.Close()
				continue
			}
		}

		mac := getMACAddress(ip)

		log.Printf("🚨 INTRUSIÓN DETECTADA - IP: %s | MAC: %s", ip, mac)

		sessionID := newSessionID(ip)
		emitTelemetry("ssh", "connection", "Nuevo intruso conectado al puerto 2222", ip, mac, sessionID)

		go handleSSHConnection(nConn, config, ip, mac, sessionID)
	}
}

func handleSSHConnection(nConn net.Conn, config *ssh.ServerConfig, ip, mac, sessionID string) {
	_, chans, reqs, err := ssh.NewServerConn(nConn, config)
	if err != nil {
		log.Printf("Error en el handshake SSH: %v", err)
		return
	}
	go ssh.DiscardRequests(reqs)

	for newChannel := range chans {
		if newChannel.ChannelType() != "session" {
			newChannel.Reject(ssh.UnknownChannelType, "Tipo de canal desconocido")
			continue
		}
		channel, requests, err := newChannel.Accept()
		if err != nil {
			log.Printf("Error aceptando canal: %v", err)
			continue
		}
		go handleSessionRequests(requests)

		// Pasamos la IP y MAC al FakeShell para asociar la telemetría
		go startFakeShell(channel, ip, mac, sessionID)
	}
}

func handleSessionRequests(in <-chan *ssh.Request) {
	for req := range in {
		if req.WantReply {
			req.Reply(true, nil)
		}
	}
}

func newSessionID(ip string) string {
	cleanIP := strings.ReplaceAll(ip, ":", "_")
	if cleanIP == "" {
		cleanIP = "unknown"
	}
	return fmt.Sprintf("%s-%d", cleanIP, time.Now().UnixNano())
}

func appendAttackHistoryEntry(filePath string, entry AttackHistoryEntry) error {
	block := fmt.Sprintf("[ATTACK %s]\nservice=%s\nevent=%s\nip=%s\nmac=%s\nsession_id=%s\nbot=%s\npayload=%q\n---\n",
		entry.Timestamp.Format(time.RFC3339Nano),
		entry.Service,
		entry.EventType,
		entry.IP,
		entry.MAC,
		entry.SessionID,
		entry.Bot,
		entry.Payload,
	)

	file, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.WriteString(block)
	return err
}

func appendAttackerSessionSummary(filePath string, entries []AttackHistoryEntry) error {
	if len(entries) == 0 {
		return nil
	}

	first := entries[0]
	sessionHeader := fmt.Sprintf("[SESSION %s]\nservice=%s\nip=%s\nmac=%s\nsession_id=%s\n",
		first.Timestamp.Format(time.RFC3339Nano),
		first.Service,
		first.IP,
		first.MAC,
		first.SessionID,
	)

	var body strings.Builder
	body.WriteString(sessionHeader)
	for _, entry := range entries {
		body.WriteString(fmt.Sprintf("timestamp=%s\nevent=%s\npayload=%q\n---\n",
			entry.Timestamp.Format(time.RFC3339Nano),
			entry.EventType,
			entry.Payload,
		))
	}

	file, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.WriteString(body.String())
	return err
}

func emitTelemetry(service, eventType, payload, ip, mac, sessionID string) {
	if eventType == "connection" {
		bumpConnCount(service)
	}
	if eventType == "connection" || eventType == "command" || eventType == "alert" {
		incrementAttackCounter()
	}

	// Detector de bots: observa el evento y estampa la marca de la sesión/IP
	// en el mensaje broadcast y en el registro del historial.
	observeEvent(service, eventType, sessionID, ip, time.Now())
	bot := verdictFor(service, sessionID, ip)

	timestamp := time.Now()
	msg := TelemetryMessage{
		Service:   service,
		Type:      eventType,
		Payload:   payload,
		IP:        ip,
		MAC:       mac,
		SessionID: sessionID,
		Timestamp: timestamp.Format(time.RFC3339Nano),
		Bot:       bot,
	}

	broadcast <- msg

	if err := appendAttackHistoryEntry(attackHistoryPath, AttackHistoryEntry{
		Timestamp: timestamp,
		Service:   service,
		EventType: eventType,
		Payload:   payload,
		IP:        ip,
		MAC:       mac,
		SessionID: sessionID,
		Bot:       bot,
	}); err != nil {
		log.Printf("Error guardando historial de ataque: %v", err)
	}
}

func normalizeInput(input string) string {
	switch input {
	case "\x03":
		return "<CTRL+C>"
	case "\x1b[A", "\x1b[B", "\x1b[C", "\x1b[D":
		return "<ARROW>"
	case "\t":
		return "<TAB>"
	case "\x7f", "\b":
		return "<BACKSPACE>"
	default:
		return input
	}
}

func recordKeyEvent(sessionID, ip, mac, service, raw string) {
	if raw == "" {
		return
	}
	key := normalizeInput(raw)
	if key == "" {
		return
	}
	emitTelemetry(service, "io", key, ip, mac, sessionID)
}

func recordCommandEvent(sessionID, ip, mac, service, cmd string) {
	if strings.TrimSpace(cmd) == "" {
		return
	}
	emitTelemetry(service, "command", cmd, ip, mac, sessionID)
}

func startFakeShell(channel ssh.Channel, ip, mac, sessionID string) {
	startFakeShellForService(channel, ip, mac, sessionID, "ssh", "ubuntu")
}

func startFakeShellForService(channel ssh.Channel, ip, mac, sessionID, serviceName, banner string) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel() // Cancela inmediatamente subprocesos y workers al cerrar/banear sesión

	// sessionStart/End pareado por defer con el connection_end: toda sesión
	// registrada se des-registra (KISS, sin leaks si el canal muere de golpe).
	sessionStart(serviceName, sessionID)
	defer sessionEnd(serviceName, sessionID)

	defer channel.Close()
	defer emitTelemetry(serviceName, "connection_end", "El intruso cerró la terminal", ip, mac, sessionID)

	// Cárcel señuelo: el RCE vive dentro de decoy_home, nunca en la carpeta del
	// backend. cd/pwd/prompt se trackean por sesión (ruta de fantasía).
	cwd := decoyAbs()
	channel.Write([]byte(shellPrompt(banner, cwd)))

	buf := make([]byte, 256)
	lineBuffer := ""

	for {
		n, err := channel.Read(buf)
		if err != nil {
			return
		}

		input := string(buf[:n])
		recordKeyEvent(sessionID, ip, mac, serviceName, input)

		if containsEnter(buf[:n]) {
			channel.Write([]byte("\r\n"))

			cleanCmd := strings.TrimSpace(lineBuffer)
			if cleanCmd != "" {
				log.Printf("💻 [Atacante %s] ejecutó en %s: %s", mac, serviceName, cleanCmd)
				recordCommandEvent(sessionID, ip, mac, serviceName, cleanCmd)
				if analyzeCommandForService(cleanCmd, ip, mac, sessionID, channel, serviceName) {
					return
				}
				simulateOSResponseForService(ctx, channel, cleanCmd, ip, mac, sessionID, serviceName, &cwd)
			}

			channel.Write([]byte(shellPrompt(banner, cwd)))
			lineBuffer = ""
		} else if input == "\x7f" || input == "\b" {
			if len(lineBuffer) > 0 {
				lineBuffer = lineBuffer[:len(lineBuffer)-1]
				channel.Write([]byte("\b \b"))
			}
		} else {
			lineBuffer += input
			channel.Write(buf[:n])
		}
	}
}

func analyzeCommand(cmdLine, ip, mac, sessionID string, channel ssh.Channel) bool {
	return analyzeCommandForService(cmdLine, ip, mac, sessionID, channel, "ssh")
}

func analyzeCommandForService(cmdLine, ip, mac, sessionID string, channel ssh.Channel, serviceName string) bool {
	cleanCmd := strings.TrimSpace(cmdLine)
	if cleanCmd == "" {
		return false
	}

	isDangerous := false
	reason := ""

	// 1. Verificación por patrón (Bash bomb, fork bomb, etc.)
	for _, pattern := range sensitivePatterns {
		if strings.Contains(cleanCmd, pattern) {
			isDangerous = true
			reason = fmt.Sprintf("Patrón crítico/Bash Bomb detectado: '%s'", pattern)
			break
		}
	}

	// 2. Verificación por comando base (matching por TOKEN, no substring:
	// el Contains viejo daba falsos positivos — "firmware" contiene "rm".
	// Se normalizan separadores de comandos encadenados: ; && | )
	if !isDangerous {
		normalized := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(cleanCmd, ";", " "), "&&", " "), "|", " ")
		for _, tok := range strings.Fields(normalized) {
			baseCmd := strings.ToLower(tok)
			for _, bad := range sensitiveCommands {
				if baseCmd == bad {
					isDangerous = true
					reason = fmt.Sprintf("Comando de alto riesgo detectado en SSH: '%s'", cleanCmd)
					break
				}
			}
			if isDangerous {
				break
			}
		}
	}

	if isDangerous {
		sessionRiskMutex.Lock()
		sessionRiskCount[sessionID]++
		strikeCount := sessionRiskCount[sessionID]
		sessionRiskMutex.Unlock()

		if strikeCount == 1 {
			// STRIKE 1: Alerta SILENCIOSA para el Administrador en la Web (Permite continuar al atacante en SSH)
			warnMsg := fmt.Sprintf("⚠️ [ADVERTENCIA 1/2] Comando de alto riesgo detectado en %s: '%s'", serviceName, cleanCmd)
			log.Printf("⚠️ %s (Origen: %s)", warnMsg, mac)

			// Emitir telemetría al Dashboard del Administrador
			emitTelemetry(serviceName, "alert", warnMsg, ip, mac, sessionID)

			// El atacante NO ve ningún mensaje de advertencia en su SSH.
			// La ejecución continúa normalmente en el Sandbox para capturar su comportamiento.
			return false
		} else {
			// STRIKE 2: Reincidencia -> BANEO en el Administrador y Desconexión limpia en SSH
			banMsg := fmt.Sprintf("⛔ [BANEO 2/2] Reincidencia en ejecución de alto riesgo en %s: '%s'", serviceName, cleanCmd)
			log.Printf("⛔ %s (Origen: %s)", banMsg, mac)

			// Notificar al Administrador
			emitTelemetry(serviceName, "alert", banMsg, ip, mac, sessionID)

			if globalBanManager != nil {
				globalBanManager.Ban(ip, reason, "auto")
			}

			// Desconexión silenciosa de la terminal SSH (simula caída natural de conexión)
			channel.Close()

			sessionRiskMutex.Lock()
			delete(sessionRiskCount, sessionID)
			sessionRiskMutex.Unlock()

			return true
		}
	}

	return false
}

func simulateOSResponse(channel ssh.Channel, cmdLine, ip, mac, sessionID string) {
	cwd := decoyAbs()
	simulateOSResponseForService(context.Background(), channel, cmdLine, ip, mac, sessionID, "ssh", &cwd)
}

func simulateOSResponseForService(parentCtx context.Context, channel ssh.Channel, cmdLine, ip, mac, sessionID, serviceName string, cwd *string) {
	parts := strings.Fields(cmdLine)
	if len(parts) == 0 {
		return
	}
	baseCmd := parts[0]

	// Manejador hiper-realista para Fork Bombs y bombas de procesos
	if strings.Contains(cmdLine, ":(){") || strings.Contains(cmdLine, ":|:&") || strings.Contains(cmdLine, "forkbomb") {
		forkErr := "bash: fork: retry: No child processes\r\nbash: fork: Resource temporarily unavailable\r\nbash: fork: retry: No child processes\r\n"
		channel.Write([]byte(forkErr))
		emitTelemetry(serviceName, "output", forkErr, ip, mac, sessionID)

		// Elevar CPU de forma controlada; se liquida al cerrar/banear la sesión (parentCtx) o a los 8s
		go func(ctx context.Context) {
			timer := time.NewTimer(8 * time.Second)
			defer timer.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case <-timer.C:
					return
				default:
					_ = 999999 * 999999
					time.Sleep(1 * time.Millisecond)
				}
			}
		}(parentCtx)
		return
	}

	// GATE DEL CATÁLOGO MALICIOSO: estos comandos NUNCA llegan al exec real
	// (ni en strike 1 — antes de este fix el strike 1 ejecutaba de verdad).
	// Strike/ban sigue corriendo por analyzeCommandForService antes de aquí.
	say := func(s string) {
		channel.Write([]byte(s))
		emitTelemetry(serviceName, "output", s, ip, mac, sessionID)
	}
	rec := func(format string, a ...interface{}) {
		emitTelemetry(serviceName, "alert", fmt.Sprintf(format, a...), ip, mac, sessionID)
	}
	inner := strings.Join(parts[1:], " ")
	switch baseCmd {
	case "clear":
		channel.Write([]byte("\033[H\033[2J"))
		return
	case "exit", "logout":
		say("logout\r\n")
		channel.Close()
		return

	// --- Navegación de la cárcel señuelo ---
	case "cd":
		arg := ""
		if len(parts) > 1 {
			arg = parts[1]
		}
		if target, ok := resolveCd(*cwd, arg); ok {
			*cwd = target
		} else {
			say(fmt.Sprintf("bash: cd: %s: No such file or directory\r\n", arg))
		}
		return
	case "pwd":
		say(displayPath(*cwd) + "\r\n")
		return

	// --- Recon básico (respuestas fijas; el exec real filtraría el host real) ---
	case "whoami":
		say("root\r\n")
		return
	case "id":
		say("uid=0(root) gid=0(root) groups=0(root)\r\n")
		return
	case "uname":
		say("Linux ubuntu 5.15.0-91-generic #101-Ubuntu SMP PREEMPT x86_64 x86_64 x86_64 GNU/Linux\r\n")
		return
	case "hostname":
		say("ubuntu\r\n")
		return
	case "uptime":
		say(fmt.Sprintf(" %s up 12 days, 4:11, 1 user, load average: 0.08, 0.12, 0.09\r\n", time.Now().Format("15:04:05")))
		return
	case "date":
		say(time.Now().Format("Mon Jan 2 15:04:05 MST 2006") + "\r\n")
		return
	case "env":
		// Entorno de fantasía — el real (rutas del daemon) es intel del host
		say("USER=root\r\nHOME=" + displayHome + "\r\nSHELL=/bin/bash\r\nPWD=" + displayPath(*cwd) + "\r\nTERM=xterm\r\nPATH=/usr/local/sbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\r\n")
		return
	case "echo":
		out := inner
		out = strings.ReplaceAll(out, "$HOME", displayHome)
		out = strings.ReplaceAll(out, "$PWD", displayPath(*cwd))
		out = strings.ReplaceAll(out, "$USER", "root")
		say(out + "\r\n")
		return
	case "history":
		if data, err := os.ReadFile(filepath.Join(decoyAbs(), ".bash_history")); err == nil {
			for i, line := range strings.Split(strings.TrimSpace(string(data)), "\n") {
				say(fmt.Sprintf("%4d  %s\r\n", i+1, line))
			}
		}
		return

	// --- Catálogo: escalada / persistencia (SIMULAR, nunca exec) ---
	case "sudo":
		if inner == "" {
			say("usage: sudo command\r\n")
		} else {
			// root ya es root: el comando interno sigue el MISMO flujo (gate incl.)
			simulateOSResponseForService(parentCtx, channel, inner, ip, mac, sessionID, serviceName, cwd)
		}
		return
	case "su":
		say("Password: \r\nsu: Authentication failure\r\n")
		return
	case "bash", "sh":
		if baseCmd == "bash" && strings.HasPrefix(inner, "-c ") {
			simulateOSResponseForService(parentCtx, channel, strings.TrimPrefix(inner, "-c "), ip, mac, sessionID, serviceName, cwd)
			return
		}
		if baseCmd == "sh" && strings.HasPrefix(inner, "-c ") {
			simulateOSResponseForService(parentCtx, channel, strings.TrimPrefix(inner, "-c "), ip, mac, sessionID, serviceName, cwd)
			return
		}
		say(fmt.Sprintf("bash: /bin/%s: Permission denied\r\n", baseCmd))
		return
	case "python", "python3", "perl", "ruby":
		// Payloads scriptados: silencio plausible (el alert del strike ya llegó)
		return
	case "rm":
		if inner != "" {
			say(fmt.Sprintf("rm: cannot remove '%s': Permission denied\r\n", strings.Fields(inner)[len(strings.Fields(inner))-1]))
		}
		return
	case "chmod", "chown":
		return // éxito silencioso (misma sensación que chmod real sobre archivos propios)
	case "passwd":
		say("Changing password for root.\r\nCurrent password: passwd: Authentication token manipulation error\r\npasswd: password unchanged\r\n")
		return
	case "useradd", "adduser":
		say("useradd: Permission denied.\r\nuseradd: could not lock /etc/passwd; try again later.\r\n")
		return
	case "crontab":
		if inner == "-l" || inner == "" {
			say("no crontab for root\r\n")
		} else {
			say("crontab: installing new crontab\r\n")
		}
		return
	case "systemctl", "service":
		say("System has not been booted with systemd as init system (PID 1). In this case, you can try 'systemctl --user'.\r\n")
		return
	case "apt", "apt-get", "yum", "dnf", "pacman", "apk":
		say("E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\r\nE: Unable to acquire the dpkg frontend lock, are you root?\r\n")
		return
	case "iptables":
		say("Fatal: can't open lock file /run/xtables.lock: Permission denied\r\n")
		return
	case "dd":
		say("dd: failed to open '/dev/sda': Permission denied\r\n")
		return
	case "mkfifo":
		if inner != "" {
			say(fmt.Sprintf("mkfifo: cannot create fifo '%s': Permission denied\r\n", strings.Fields(inner)[0]))
		}
		return

	// --- Catálogo: exfiltración / C2 (SIMULAR + registrar IOC) ---
	case "wget", "curl":
		url := inner
		for _, f := range strings.Fields(inner) {
			if !strings.HasPrefix(f, "-") {
				url = f
				break
			}
		}
		host := strings.TrimPrefix(strings.TrimPrefix(url, "http://"), "https://")
		if i := strings.IndexAny(host, "/:@"); i > 0 {
			host = host[:i]
		}
		say(fmt.Sprintf("curl: (6) Could not resolve host: %s\r\n", host))
		rec("IOC: descarga de payload solicitada desde '%s' (falla simulada, sin salida de red)", url)
		return
	case "nc", "ncat", "nc.openbsd":
		say("nc: Permission denied\r\n")
		return
	case "ssh":
		dest := "host"
		for _, f := range strings.Fields(inner) {
			if !strings.HasPrefix(f, "-") {
				dest = f
				break
			}
		}
		say(fmt.Sprintf("ssh: connect to host %s port 22: Connection refused\r\n", dest))
		rec("IOC: intento de movimiento lateral via SSH hacia '%s' (falla simulada)", dest)
		return
	case "nmap", "masscan":
		say("Starting Nmap 7.80 ( https://nmap.org ) at " + time.Now().Format("15:04 MST") + "\r\nNmap scan report for localhost (127.0.0.1)\r\nPORT     STATE SERVICE\r\n2222/tcp open  ssh\r\n8081/tcp open  http-proxy\r\n2121/tcp open  ftp\r\n\r\nNmap done: 1 IP address (1 host up) scanned in 0.12 seconds\r\n")
		return
	case "netstat", "ss":
		say("Active Internet connections (only servers)\r\nProto Recv-Q Send-Q Local Address     Foreign Address  State\r\ntcp       0      0 0.0.0.0:2222      0.0.0.0:*        LISTEN\r\ntcp       0      0 0.0.0.0:8081      0.0.0.0:*        LISTEN\r\ntcp       0      0 0.0.0.0:2121      0.0.0.0:*        LISTEN\r\n")
		return
	}

	// Ejecución nativa del comando en el sistema mediante Go Sandbox
	// (comandos no catalogados: ls/cat/grep/find/less… sobre el señuelo).
	// ponytail: lecturas con ruta ABSOLUTA fuera del señuelo siguen reales y
	// $PWD filtra la ruta real (bash lo setea desde getcwd). Upgrade path:
	// interceptar env/echo $PWD o unshare -m con mount del señuelo.
	cmdCtx, cancel := context.WithTimeout(parentCtx, 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(cmdCtx, "sh", "-c", cmdLine)
	cmd.Dir = *cwd
	cmd.Env = append(os.Environ(), "TERM=xterm", "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin")

	out, err := cmd.CombinedOutput()
	outStr := string(out)

	if cmdCtx.Err() == context.DeadlineExceeded {
		outStr += "\r\n[Sandbox Timeout: Comando excedió el tiempo máximo de 10s]\r\n"
	} else if err != nil && outStr == "" {
		outStr = fmt.Sprintf("bash: %s: command failed\r\n", baseCmd)
	}

	if len(outStr) > 8192 {
		outStr = outStr[:8192] + "\r\n... [Salida truncada por límite Sandbox (8KB)]\r\n"
	}

	// Normalizar saltos de línea para terminal SSH
	outFormatted := strings.ReplaceAll(strings.ReplaceAll(outStr, "\r\n", "\n"), "\n", "\r\n")

	if outFormatted != "" {
		channel.Write([]byte(outFormatted))
		emitTelemetry(serviceName, "output", outFormatted, ip, mac, sessionID)
	}
}

func containsEnter(b []byte) bool {
	for _, v := range b {
		if v == '\r' || v == '\n' {
			return true
		}
	}
	return false
}
