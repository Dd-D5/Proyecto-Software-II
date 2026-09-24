package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/ssh"
)

type HoneypotConfig struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"` // "ssh", "http", "ftp"
	Port      int       `json:"port"`
	Banner    string    `json:"banner"`
	Status    string    `json:"status"` // "running", "stopped", "error"
	CreatedAt time.Time `json:"created_at"`
}

type HoneypotInstance struct {
	Config   HoneypotConfig
	listener net.Listener
	stopChan chan struct{}
}

type HoneypotManager struct {
	mu        sync.RWMutex
	instances map[string]*HoneypotInstance
}

var globalHoneypotManager *HoneypotManager

func initHoneypotManager() *HoneypotManager {
	hm := &HoneypotManager{
		instances: make(map[string]*HoneypotInstance),
	}
	globalHoneypotManager = hm

	// Registrar honeypots por defecto del sistema
	hm.registerDefault("default-ssh", "Honeypot SSH Principal", "ssh", 2222, "Ubuntu 20.04 LTS SSH")
	hm.registerDefault("default-http", "Honeypot HTTP Principal", "http", 8081, "Apache/2.4.41 (Ubuntu)")
	hm.registerDefault("default-ftp", "Honeypot FTP Principal", "ftp", 2121, "vsFTPd 3.0.3")

	return hm
}

func (hm *HoneypotManager) registerDefault(id, name, serviceType string, port int, banner string) {
	inst := &HoneypotInstance{
		Config: HoneypotConfig{
			ID:        id,
			Name:      name,
			Type:      serviceType,
			Port:      port,
			Banner:    banner,
			Status:    "running", // Los por defecto ya inician en main.go
			CreatedAt: time.Now(),
		},
	}
	hm.instances[id] = inst
}

func (hm *HoneypotManager) GetAllConfigs() []HoneypotConfig {
	hm.mu.RLock()
	defer hm.mu.RUnlock()

	list := make([]HoneypotConfig, 0, len(hm.instances))
	for _, inst := range hm.instances {
		list = append(list, inst.Config)
	}
	return list
}

func (hm *HoneypotManager) CreateHoneypot(name, serviceType string, port int, banner string) (*HoneypotConfig, error) {
	hm.mu.Lock()
	defer hm.mu.Unlock()

	// Verificar si el puerto ya está en uso por otro honeypot
	for _, inst := range hm.instances {
		if inst.Config.Port == port && inst.Config.Status == "running" {
			return nil, fmt.Errorf("el puerto %d ya está en uso por otro Honeypot (%s)", port, inst.Config.Name)
		}
	}

	id := fmt.Sprintf("hp-%s-%d", serviceType, time.Now().UnixNano())
	cfg := HoneypotConfig{
		ID:        id,
		Name:      name,
		Type:      serviceType,
		Port:      port,
		Banner:    banner,
		Status:    "stopped",
		CreatedAt: time.Now(),
	}

	inst := &HoneypotInstance{
		Config: cfg,
	}
	hm.instances[id] = inst

	// Iniciar inmediatamente el Honeypot recién creado
	if err := hm.startInstanceLocked(inst); err != nil {
		log.Printf("⚠️ Error al iniciar honeypot %s: %v", name, err)
		return &inst.Config, nil // Se guarda como detenido
	}

	return &inst.Config, nil
}

func (hm *HoneypotManager) ToggleHoneypot(id string) (*HoneypotConfig, error) {
	hm.mu.Lock()
	defer hm.mu.Unlock()

	inst, exists := hm.instances[id]
	if !exists {
		return nil, fmt.Errorf("honeypot no encontrado")
	}

	if inst.Config.Status == "running" {
		hm.stopInstanceLocked(inst)
	} else {
		if err := hm.startInstanceLocked(inst); err != nil {
			return nil, err
		}
	}

	return &inst.Config, nil
}

func (hm *HoneypotManager) DeleteHoneypot(id string) error {
	hm.mu.Lock()
	defer hm.mu.Unlock()

	inst, exists := hm.instances[id]
	if !exists {
		return fmt.Errorf("honeypot no encontrado")
	}

	if inst.Config.ID == "default-ssh" || inst.Config.ID == "default-http" || inst.Config.ID == "default-ftp" {
		return fmt.Errorf("no se pueden eliminar los honeypots principales del sistema")
	}

	if inst.Config.Status == "running" {
		hm.stopInstanceLocked(inst)
	}

	delete(hm.instances, id)
	return nil
}

func (hm *HoneypotManager) startInstanceLocked(inst *HoneypotInstance) error {
	addr := fmt.Sprintf("0.0.0.0:%d", inst.Config.Port)

	switch inst.Config.Type {
	case "http":
		mux := http.NewServeMux()
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			ip, _, _ := net.SplitHostPort(r.RemoteAddr)
			if banned, reason := globalBanManager.IsBanned(ip); banned {
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(renderBannedPageHTML(ip, reason)))
				return
			}
			mac := getMACAddress(ip)
			reqInfo := fmt.Sprintf("%s %s %s", r.Method, r.URL.Path, r.UserAgent())
			// broadcast directo en el handler HTTP: contadores van aquí porque
			// no pasa por emitTelemetry
			bumpConnCount(inst.Config.Type)
			incrementAttackCounter()
			broadcast <- TelemetryMessage{
				Service: fmt.Sprintf("http:%d", inst.Config.Port),
				Type:    "connection",
				Payload: fmt.Sprintf("Conexión entrante a Honeypot HTTP %s (Puerto %d)", inst.Config.Name, inst.Config.Port),
				IP:      ip,
				MAC:     mac,
			}
			broadcast <- TelemetryMessage{
				Service: fmt.Sprintf("http:%d", inst.Config.Port),
				Type:    "command",
				Payload: reqInfo,
				IP:      ip,
				MAC:     mac,
			}

			serverHeader := inst.Config.Banner
			if serverHeader == "" {
				serverHeader = "AegisTrap-SOC/2.0"
			}
			w.Header().Set("Server", serverHeader)
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(renderCloneLoginPageHTML("")))
		})

		server := &http.Server{Addr: addr, Handler: mux}
		listener, err := net.Listen("tcp", addr)
		if err != nil {
			inst.Config.Status = "error"
			return err
		}
		inst.listener = listener
		inst.stopChan = make(chan struct{})

		go func() {
			log.Printf("🍯 Honeypot Dinámico HTTP [%s] escuchando en puerto %d", inst.Config.Name, inst.Config.Port)
			if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
				log.Printf("Servidor HTTP %s cerrado: %v", inst.Config.Name, err)
			}
		}()

	case "ftp":
		listener, err := net.Listen("tcp", addr)
		if err != nil {
			inst.Config.Status = "error"
			return err
		}
		inst.listener = listener
		inst.stopChan = make(chan struct{})

		go func() {
			log.Printf("🍯 Honeypot Dinámico FTP [%s] escuchando en puerto %d", inst.Config.Name, inst.Config.Port)
			for {
				select {
				case <-inst.stopChan:
					return
				default:
				}
				conn, err := listener.Accept()
				if err != nil {
					select {
					case <-inst.stopChan:
						return
					default:
						continue
					}
				}
				go handleDynamicFTPConnection(conn, inst.Config.Banner, inst.Config.Name, inst.Config.Port)
			}
		}()

	case "ssh":
		listener, err := net.Listen("tcp", addr)
		if err != nil {
			inst.Config.Status = "error"
			return err
		}
		inst.listener = listener
		inst.stopChan = make(chan struct{})

		go func() {
			log.Printf("🍯 Honeypot Dinámico SSH [%s] escuchando en puerto %d", inst.Config.Name, inst.Config.Port)
			for {
				select {
				case <-inst.stopChan:
					return
				default:
				}
				conn, err := listener.Accept()
				if err != nil {
					select {
					case <-inst.stopChan:
						return
					default:
						continue
					}
				}
				go handleDynamicSSHConnection(conn, inst.Config.Banner, inst.Config.Name, inst.Config.Port)
			}
		}()

	default:
		return fmt.Errorf("tipo de honeypot '%s' no soportado", inst.Config.Type)
	}

	inst.Config.Status = "running"
	return nil
}

func (hm *HoneypotManager) stopInstanceLocked(inst *HoneypotInstance) {
	if inst.listener != nil {
		inst.listener.Close()
	}
	if inst.stopChan != nil {
		close(inst.stopChan)
	}
	inst.Config.Status = "stopped"
	log.Printf("🛑 Honeypot Dinámico [%s] en puerto %d detenido", inst.Config.Name, inst.Config.Port)
}

func handleDynamicFTPConnection(conn net.Conn, banner, name string, port int) {
	defer conn.Close()
	ip, _, _ := net.SplitHostPort(conn.RemoteAddr().String())
	if banned, reason := globalBanManager.IsBanned(ip); banned {
		conn.Write([]byte(fmt.Sprintf("421 Service unavailable, IP baneada: %s\r\n", reason)))
		return
	}
	mac := getMACAddress(ip)
	sessionID := fmt.Sprintf("ftp-%s-%d", strings.ReplaceAll(ip, ":", "_"), time.Now().UnixNano())
	serviceName := fmt.Sprintf("ftp:%d", port)

	defer func() {
		emitTelemetry(serviceName, "connection_end", fmt.Sprintf("El intruso cerró FTP %s", name), ip, mac, sessionID)
	}()

	emitTelemetry(serviceName, "connection", fmt.Sprintf("Nuevo intruso en Honeypot FTP %s (Puerto %d)", name, port), ip, mac, sessionID)

	if banner == "" {
		banner = "vsFTPd 3.0.3"
	}
	conn.Write([]byte(fmt.Sprintf("220 (%s)\r\n", banner)))

	buf := make([]byte, 512)
	lineBuffer := ""

	for {
		n, err := conn.Read(buf)
		if err != nil {
			return
		}

		input := string(buf[:n])
		lineBuffer += input

		emitTelemetry(serviceName, "io", input, ip, mac, sessionID)

		if containsEnter(buf[:n]) {
			cleanCmd := strings.TrimSpace(lineBuffer)
			lineBuffer = ""

			if cleanCmd != "" {
				log.Printf("📁 [FTP Dinámico :%d - %s] ejecutó: %s", port, mac, cleanCmd)
				emitTelemetry(serviceName, "command", cleanCmd, ip, mac, sessionID)

				// Verificación de comandos de alto riesgo en FTP dinámico
				lowerCmd := strings.ToLower(cleanCmd)
				for _, pattern := range ftpHighRiskPatterns {
					if strings.Contains(lowerCmd, pattern) {
						alertMsg := fmt.Sprintf("⚠️ ¡ALERTA ATAQUE ALTO RIESGO FTP :%d! Comando crítico: '%s'", port, cleanCmd)
						emitTelemetry(serviceName, "alert", alertMsg, ip, mac, sessionID)

						if globalBanManager != nil {
							globalBanManager.Ban(ip, fmt.Sprintf("Ataque FTP Dinámico puerto %d: '%s'", port, cleanCmd), "auto")
						}
						sendFTPResponse(conn, "421 Service unavailable, IP baneada y conexión terminada por seguridad.\r\n", ip, mac, sessionID)
						return
					}
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
					emitTelemetry(serviceName, "alert", fmt.Sprintf("⚠️ INTENTO DE SUBIDA EN FTP :%d: STOR %s", port, filename), ip, mac, sessionID)
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

func getSSHSigner() (ssh.Signer, error) {
	keyPath := "honeypot_rsa"
	pemBytes, err := os.ReadFile(keyPath)
	if err != nil {
		privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			return nil, err
		}
		privateKeyDER := x509.MarshalPKCS1PrivateKey(privateKey)
		pemBytes = pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: privateKeyDER})
		_ = os.WriteFile(keyPath, pemBytes, 0600)
	}
	return ssh.ParsePrivateKey(pemBytes)
}

func handleDynamicSSHConnection(conn net.Conn, banner, name string, port int) {
	defer conn.Close()
	ip, _, _ := net.SplitHostPort(conn.RemoteAddr().String())
	if globalBanManager != nil {
		if banned, reason := globalBanManager.IsBanned(ip); banned {
			log.Printf("⛔ [SSH Dinámico :%d] Conexión rechazada para IP baneada %s: %s", port, ip, reason)
			conn.Close()
			return
		}
	}
	mac := getMACAddress(ip)
	sessionID := newSessionID(ip)
	serviceName := fmt.Sprintf("ssh:%d", port)

	config := &ssh.ServerConfig{
		PasswordCallback: func(c ssh.ConnMetadata, pass []byte) (*ssh.Permissions, error) {
			log.Printf("🔑 [SSH Dinámico :%d] Login - Usuario: %s, Password: %s | Atacante: %s (%s)", port, c.User(), string(pass), ip, mac)
			return nil, nil
		},
	}

	signer, err := getSSHSigner()
	if err == nil {
		config.AddHostKey(signer)
	}

	emitTelemetry(serviceName, "connection", fmt.Sprintf("Nuevo intruso conectado a Honeypot SSH %s (Puerto %d)", name, port), ip, mac, sessionID)

	sConn, chans, reqs, err := ssh.NewServerConn(conn, config)
	if err != nil {
		log.Printf("Error en el handshake SSH dinámico en puerto %d: %v", port, err)
		return
	}
	defer sConn.Close()
	go ssh.DiscardRequests(reqs)

	for newChannel := range chans {
		if newChannel.ChannelType() != "session" {
			newChannel.Reject(ssh.UnknownChannelType, "Tipo de canal desconocido")
			continue
		}
		channel, requests, err := newChannel.Accept()
		if err != nil {
			continue
		}
		go handleSessionRequests(requests)
		go startFakeShellForService(channel, ip, mac, sessionID, serviceName)
	}
}
