package main

import (
	"fmt"
	"log"
	"net"
	"strings"
	"time"
)

var ftpHighRiskPatterns = []string{
	"ransomware", "payload", ".sh", ".exe", "rm -rf", "sudo", "su ", "wget", "curl",
	"nc", "bash", "sh ", "mkfifo", "chmod", "chown", "perl", "python", "ruby", "dd ",
}

func startFTPServer() {
	listener, err := net.Listen("tcp", "0.0.0.0:2121")
	if err != nil {
		log.Fatalf("Error iniciando servidor FTP: %v", err)
	}
	log.Println("Honeypot FTP escuchando en el puerto 2121...")

	for {
		conn, err := listener.Accept()
		if err != nil {
			continue
		}
		go handleFTPConnection(conn)
	}
}

func sendFTPResponse(conn net.Conn, resp string, ip, mac, sessionID string) {
	conn.Write([]byte(resp))
	emitTelemetry("ftp", "output", resp, ip, mac, sessionID)
}

func handleFTPConnection(conn net.Conn) {
	defer conn.Close()
	ip, _, _ := net.SplitHostPort(conn.RemoteAddr().String())

	if globalBanManager != nil {
		if banned, reason := globalBanManager.IsBanned(ip); banned {
			log.Printf("⛔ [FTP] Conexión rechazada para IP baneada %s: %s", ip, reason)
			conn.Write([]byte("421 Service unavailable, IP baneada.\r\n"))
			return
		}
	}

	mac := getMACAddress(ip)
	sessionID := fmt.Sprintf("ftp-%s-%d", strings.ReplaceAll(ip, ":", "_"), time.Now().UnixNano())

	defer func() {
		emitTelemetry("ftp", "connection_end", "El intruso cerró la conexión FTP", ip, mac, sessionID)
	}()

	log.Printf("🚨 [FTP] Intrusión detectada - IP: %s | MAC: %s", ip, mac)
	emitTelemetry("ftp", "connection", "Nuevo intruso conectado al puerto FTP :2121", ip, mac, sessionID)

	// Saludo inicial FTP
	sendFTPResponse(conn, "220 (vsFTPd 3.0.3)\r\n", ip, mac, sessionID)

	buf := make([]byte, 512)
	lineBuffer := ""

	for {
		n, err := conn.Read(buf)
		if err != nil {
			return
		}

		input := string(buf[:n])
		lineBuffer += input

		// 1. Emitir la porción de texto completa directamente a xterm.js sin retrasos artificiales
		emitTelemetry("ftp", "io", input, ip, mac, sessionID)

		// 2. Procesar el comando solo cuando el cliente FTP decida enviarlo (al presionar Enter)
		if containsEnter(buf[:n]) {
			cleanCmd := strings.TrimSpace(lineBuffer)
			lineBuffer = ""

			if cleanCmd != "" {
				log.Printf("📁 [FTP - %s] ejecutó: %s", mac, cleanCmd)
				emitTelemetry("ftp", "command", cleanCmd, ip, mac, sessionID)

				// Verificación de Comandos y Payloads de Alto Riesgo
				lowerCmd := strings.ToLower(cleanCmd)
				isDangerous := false
				matchedPattern := ""
				for _, pattern := range ftpHighRiskPatterns {
					if strings.Contains(lowerCmd, pattern) {
						isDangerous = true
						matchedPattern = pattern
						break
					}
				}

				if isDangerous {
					alertMsg := fmt.Sprintf("⚠️ ¡ALERTA ATAQUE ALTO RIESGO FTP! Comando/Payload crítico: '%s' (Patrón: %s)", cleanCmd, matchedPattern)
					log.Printf("⛔ [FTP - %s] %s", mac, alertMsg)
					emitTelemetry("ftp", "alert", alertMsg, ip, mac, sessionID)

					reason := fmt.Sprintf("Ataque FTP de Alto Riesgo: '%s'", cleanCmd)
					if globalBanManager != nil {
						globalBanManager.Ban(ip, reason, "auto")
					}

					sendFTPResponse(conn, "421 Service unavailable, IP baneada y conexión terminada por seguridad.\r\n", ip, mac, sessionID)
					// Desconexión inmediata por alto riesgo
					return
				}

				parts := strings.Fields(cleanCmd)
				verb := strings.ToUpper(parts[0])

				switch verb {
				case "USER":
					sendFTPResponse(conn, "331 Please specify the password.\r\n", ip, mac, sessionID)
				case "PASS":
					sendFTPResponse(conn, "230 Login successful.\r\n", ip, mac, sessionID)
				case "SYST":
					sendFTPResponse(conn, "215 UNIX Type: L8\r\n", ip, mac, sessionID)
				case "PWD", "XPWD":
					sendFTPResponse(conn, "257 \"/\" is the current directory\r\n", ip, mac, sessionID)
				case "CWD", "XCWD", "CDUP":
					sendFTPResponse(conn, "250 Directory successfully changed.\r\n", ip, mac, sessionID)
				case "TYPE":
					sendFTPResponse(conn, "200 Switching to Binary mode.\r\n", ip, mac, sessionID)
				case "PASV", "EPSV":
					sendFTPResponse(conn, "227 Entering Passive Mode (127,0,0,1,195,17).\r\n", ip, mac, sessionID)
				case "PORT", "EPRT":
					sendFTPResponse(conn, "200 PORT command successful.\r\n", ip, mac, sessionID)
				case "LIST", "NLST":
					sendFTPResponse(conn, "150 Here comes the directory listing.\r\n226 Directory send OK.\r\n", ip, mac, sessionID)
				case "STOR", "STOU", "APPE":
					filename := ""
					if len(parts) > 1 {
						filename = parts[1]
					}
					emitTelemetry("ftp", "alert", fmt.Sprintf("⚠️ INTENTO DE SUBIDA EN FTP: STOR %s", filename), ip, mac, sessionID)
					sendFTPResponse(conn, "150 Ok to send data.\r\n226 Transfer complete.\r\n", ip, mac, sessionID)
				case "RETR":
					sendFTPResponse(conn, "150 Opening BINARY mode data connection.\r\n226 Transfer complete.\r\n", ip, mac, sessionID)
				case "DELE", "MKD", "RMD", "XMKD":
					sendFTPResponse(conn, "250 Operation successful.\r\n", ip, mac, sessionID)
				case "FEAT":
					sendFTPResponse(conn, "211-Features:\r\n EPRT\r\n EPSV\r\n PASV\r\n UTF8\r\n211 End\r\n", ip, mac, sessionID)
				case "OPTS":
					sendFTPResponse(conn, "200 Always in UTF8 mode.\r\n", ip, mac, sessionID)
				case "QUIT", "BYE":
					sendFTPResponse(conn, "221 Goodbye.\r\n", ip, mac, sessionID)
					return
				default:
					sendFTPResponse(conn, "500 Unknown command.\r\n", ip, mac, sessionID)
				}
			}
		}
	}
}