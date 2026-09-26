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
	block := fmt.Sprintf("[ATTACK %s]\nservice=%s\nevent=%s\nip=%s\nmac=%s\nsession_id=%s\npayload=%q\n---\n",
		entry.Timestamp.Format(time.RFC3339Nano),
		entry.Service,
		entry.EventType,
		entry.IP,
		entry.MAC,
		entry.SessionID,
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

	timestamp := time.Now()
	msg := TelemetryMessage{
		Service:   service,
		Type:      eventType,
		Payload:   payload,
		IP:        ip,
		MAC:       mac,
		SessionID: sessionID,
		Timestamp: timestamp.Format(time.RFC3339Nano),
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
	startFakeShellForService(channel, ip, mac, sessionID, "ssh")
}

func startFakeShellForService(channel ssh.Channel, ip, mac, sessionID, serviceName string) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel() // Cancela inmediatamente subprocesos y workers al cerrar/banear sesión

	defer channel.Close()
	defer emitTelemetry(serviceName, "connection_end", "El intruso cerró la terminal", ip, mac, sessionID)

	prompt := "root@ubuntu:~# "
	channel.Write([]byte(prompt))

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
				simulateOSResponseForService(ctx, channel, cleanCmd, ip, mac, sessionID, serviceName)
			}

			channel.Write([]byte(prompt))
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

	// 2. Verificación por comando base
	if !isDangerous {
		parts := strings.Fields(cleanCmd)
		if len(parts) > 0 {
			baseCmd := strings.ToLower(parts[0])
			for _, bad := range sensitiveCommands {
				if baseCmd == bad || strings.Contains(cleanCmd, bad) {
					isDangerous = true
					reason = fmt.Sprintf("Comando de alto riesgo detectado en SSH: '%s'", cleanCmd)
					break
				}
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
	simulateOSResponseForService(context.Background(), channel, cmdLine, ip, mac, sessionID, "ssh")
}

func simulateOSResponseForService(parentCtx context.Context, channel ssh.Channel, cmdLine, ip, mac, sessionID, serviceName string) {
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

	// Manejadores internos inmediatos
	switch baseCmd {
	case "clear":
		channel.Write([]byte("\033[H\033[2J"))
		return
	case "exit", "logout":
		channel.Write([]byte("logout\r\n"))
		channel.Close()
		return
	case "cd":
		if len(parts) > 1 && parts[1] != "~" && parts[1] != "/" && parts[1] != ".." {
			errMsg := fmt.Sprintf("bash: cd: %s: No such file or directory\r\n", parts[1])
			channel.Write([]byte(errMsg))
			emitTelemetry(serviceName, "output", errMsg, ip, mac, sessionID)
		}
		return
	}

	// Ejecución nativa del comando en el sistema mediante Go Sandbox
	cmdCtx, cancel := context.WithTimeout(parentCtx, 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(cmdCtx, "sh", "-c", cmdLine)
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
