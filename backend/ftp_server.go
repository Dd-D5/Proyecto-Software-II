package main

import (
	"bufio"
	"log"
	"net"
	"strings"
)

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

func handleFTPConnection(conn net.Conn) {
	defer conn.Close()
	ip, _, _ := net.SplitHostPort(conn.RemoteAddr().String())
	mac := getMACAddress(ip)
	// ponytail: breach booleano por servicio; sesión concurrente que cierra apaga el indicador.
	// Upgrade path: contador de sesiones activas.
	defer func() {
		broadcast <- TelemetryMessage{Service: "ftp", Type: "connection_end",
			Payload: "El intruso cerró la conexión FTP", IP: ip, MAC: mac}
	}()

	log.Printf("🚨 [FTP] Intrusión detectada - IP: %s | MAC: %s", ip, mac)
	bumpConnCount("ftp")
	broadcast <- TelemetryMessage{
		Service: "ftp",
		Type:    "connection",
		Payload: "Nuevo intruso conectado al puerto FTP",
		IP:      ip,
		MAC:     mac,
	}
	
	// Saludo inicial emulando vsFTPd
	conn.Write([]byte("220 (vsFTPd 3.0.3)\r\n"))
	scanner := bufio.NewScanner(conn)
	
	for scanner.Scan() {
		cmd := strings.TrimSpace(scanner.Text())
		if cmd == "" { continue }
		
		log.Printf("📁 [FTP - %s] ejecutó: %s", mac, cmd)
		broadcast <- TelemetryMessage{
			Service: "ftp",
			Type:    "command",
			Payload: cmd,
			IP:      ip,
			MAC:     mac,
		}
		
		parts := strings.Fields(cmd)
		switch strings.ToUpper(parts[0]) {
		case "USER":
			conn.Write([]byte("331 Please specify the password.\r\n"))
		case "PASS":
			conn.Write([]byte("230 Login successful.\r\n"))
		case "SYST":
			conn.Write([]byte("215 UNIX Type: L8\r\n"))
		case "PWD":
			conn.Write([]byte("257 \"/\" is the current directory\r\n"))
		case "TYPE":
			conn.Write([]byte("200 Switching to Binary mode.\r\n"))
		case "QUIT":
			conn.Write([]byte("221 Goodbye.\r\n"))
			return
		default:
			conn.Write([]byte("500 Unknown command.\r\n"))
		}
	}
}