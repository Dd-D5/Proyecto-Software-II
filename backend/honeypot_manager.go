package main

import (
	"bufio"
	"fmt"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
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
				http.Error(w, fmt.Sprintf("403 Forbidden - IP Baneada: %s", reason), http.StatusForbidden)
				return
			}
			mac := getMACAddress(ip)
			reqInfo := fmt.Sprintf("%s %s %s", r.Method, r.URL.Path, r.UserAgent())
			broadcast <- TelemetryMessage{
				Service: fmt.Sprintf("http:%d", inst.Config.Port),
				Type:    "connection",
				Payload: fmt.Sprintf("Conexión entrante a Honeypot %s (Puerto %d)", inst.Config.Name, inst.Config.Port),
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
				serverHeader = "Apache/2.4.41 (Ubuntu)"
			}
			w.Header().Set("Server", serverHeader)
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(fmt.Sprintf("<html><body><h1>Honeypot Servidor %s</h1><p>Sistema activo.</p></body></html>", inst.Config.Name)))
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
		// Por simplificación de demostración dinámica, iniciamos un listener de SSH Emulado o raw TCP banner
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

	serviceName := fmt.Sprintf("ftp:%d", port)
	broadcast <- TelemetryMessage{
		Service: serviceName,
		Type:    "connection",
		Payload: fmt.Sprintf("Nuevo intruso en Honeypot FTP %s (Puerto %d)", name, port),
		IP:      ip,
		MAC:     mac,
	}

	if banner == "" {
		banner = "vsFTPd 3.0.3"
	}
	conn.Write([]byte(fmt.Sprintf("220 (%s)\r\n", banner)))
	scanner := bufio.NewScanner(conn)

	for scanner.Scan() {
		cmd := strings.TrimSpace(scanner.Text())
		if cmd == "" {
			continue
		}
		broadcast <- TelemetryMessage{
			Service: serviceName,
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
		case "QUIT":
			conn.Write([]byte("221 Goodbye.\r\n"))
			return
		default:
			conn.Write([]byte("500 Unknown command.\r\n"))
		}
	}
}

func handleDynamicSSHConnection(conn net.Conn, banner, name string, port int) {
	defer conn.Close()
	ip, _, _ := net.SplitHostPort(conn.RemoteAddr().String())
	if banned, reason := globalBanManager.IsBanned(ip); banned {
		conn.Write([]byte(fmt.Sprintf("Access denied for banned IP: %s\r\n", reason)))
		return
	}
	mac := getMACAddress(ip)

	serviceName := fmt.Sprintf("ssh:%d", port)
	broadcast <- TelemetryMessage{
		Service: serviceName,
		Type:    "connection",
		Payload: fmt.Sprintf("Nuevo intento SSH en Honeypot %s (Puerto %d)", name, port),
		IP:      ip,
		MAC:     mac,
	}

	if banner == "" {
		banner = "SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5"
	}
	conn.Write([]byte(fmt.Sprintf("%s\r\n", banner)))

	buf := make([]byte, 512)
	n, err := conn.Read(buf)
	if err == nil && n > 0 {
		cmd := strings.TrimSpace(string(buf[:n]))
		broadcast <- TelemetryMessage{
			Service: serviceName,
			Type:    "command",
			Payload: cmd,
			IP:      ip,
			MAC:     mac,
		}
	}
}
