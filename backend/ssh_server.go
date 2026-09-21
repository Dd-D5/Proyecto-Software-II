package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"log"
	"net"
	"os"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"
)

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

var sensitiveCommands = []string{"sudo", "su", "rm", "passwd", "chmod", "chown", "wget", "curl", "nc", "bash", "sh", "iptables"}

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

func emitTelemetry(service, eventType, payload, ip, mac, sessionID string) {
	broadcast <- TelemetryMessage{
		Service:   service,
		Type:      eventType,
		Payload:   payload,
		IP:        ip,
		MAC:       mac,
		SessionID: sessionID,
		Timestamp: time.Now().Format(time.RFC3339Nano),
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
	defer channel.Close()

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
		recordKeyEvent(sessionID, ip, mac, "ssh", input)

		if containsEnter(buf[:n]) {
			channel.Write([]byte("\r\n"))

			cleanCmd := strings.TrimSpace(lineBuffer)
			if cleanCmd != "" {
				log.Printf("💻 [Atacante %s] ejecutó: %s", mac, cleanCmd)
				recordCommandEvent(sessionID, ip, mac, "ssh", cleanCmd)
				analyzeCommand(cleanCmd, ip, mac, sessionID)
				simulateOSResponse(channel, cleanCmd)
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

func analyzeCommand(cmdLine, ip, mac, sessionID string) {
	parts := strings.Fields(cmdLine)
	if len(parts) == 0 {
		return
	}
	baseCmd := parts[0]

	for _, bad := range sensitiveCommands {
		if baseCmd == bad {
			alertMsg := fmt.Sprintf("Intento de ejecución crítica: '%s'", cmdLine)
			log.Printf("⚠️ ¡ALERTA! %s (Origen: %s)", alertMsg, mac)

			emitTelemetry("ssh", "alert", alertMsg, ip, mac, sessionID)
			break
		}
	}
}

func simulateOSResponse(channel ssh.Channel, cmdLine string) {
	parts := strings.Fields(cmdLine)
	if len(parts) == 0 {
		return
	}
	baseCmd := parts[0]

	switch baseCmd {
	case "ls":
		channel.Write([]byte("Desktop  Documents  Downloads  snap  .bashrc\r\n"))
	case "whoami":
		channel.Write([]byte("root\r\n"))
	case "pwd":
		channel.Write([]byte("/root\r\n"))
	case "uname":
		channel.Write([]byte("Linux ubuntu 5.4.0-150-generic x86_64 GNU/Linux\r\n"))
	case "id":
		channel.Write([]byte("uid=0(root) gid=0(root) groups=0(root)\r\n"))
	case "cd":
		if len(parts) == 1 || parts[1] == ".." || parts[1] == "/" || parts[1] == "~" {
			return
		}
		errorMsg := fmt.Sprintf("bash: cd: %s: No such file or directory\r\n", parts[1])
		channel.Write([]byte(errorMsg))
	case "clear":
		channel.Write([]byte("\033[H\033[2J"))
	case "exit", "logout":
		channel.Write([]byte("logout\r\n"))
		channel.Close()
	default:
		errorMsg := fmt.Sprintf("bash: %s: command not found\r\n", baseCmd)
		channel.Write([]byte(errorMsg))
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
