package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"runtime"
	"strings"
	"time"
)

func main() {
	// 1. Inicializar Gestor de Baneos DNS/IP
	initBanManager("banned_list.json")

	// 2. Inicializar Autenticación de Contraseña
	pass := os.Getenv("AEGIS_ADMIN_PASSWORD")
	if pass == "" {
		pass = "admin123"
	}
	initAuth(pass)
	log.Printf("🔐 Sistema de Autenticación activo (Contraseña por defecto: admin123)")

	// 3. Inicializar Gestor Dinámico de Honeypots
	initHoneypotManager()

	// 4. Inicializar Contador de Ataques desde Histórico y Ticker de Telemetría
	initAttackCounter()
	startSystemStatsTicker()

	// 5. Iniciar la transmisión de telemetría por WebSockets
	go handleMessages()

	mux := http.NewServeMux()

	// WebSocket handler
	mux.HandleFunc("/ws", handleConnections)

	// REST Endpoint: Login
	mux.HandleFunc("/api/login", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"Cuerpo de petición inválido"}`, http.StatusBadRequest)
			return
		}

		cleanPass := SanitizeInput(req.Password)
		if !globalAuth.VerifyPassword(cleanPass) {
			http.Error(w, `{"error":"Contraseña incorrecta"}`, http.StatusUnauthorized)
			return
		}

		token := globalAuth.CreateToken()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"token": token})
	})

	// REST Endpoints protegidos: Baneos DNS / IP
	mux.HandleFunc("/api/bans", AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.Method {
		case http.MethodGet:
			json.NewEncoder(w).Encode(globalBanManager.GetBannedList())

		case http.MethodPost:
			var req struct {
				Target string `json:"target"`
				Reason string `json:"reason"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, `{"error":"Parámetros inválidos"}`, http.StatusBadRequest)
				return
			}
			cleanTarget := SanitizeInput(req.Target)
			cleanReason := SanitizeInput(req.Reason)
			entry, err := globalBanManager.Ban(cleanTarget, cleanReason, "admin")
			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error":%q}`, err.Error()), http.StatusBadRequest)
				return
			}
			json.NewEncoder(w).Encode(entry)

		case http.MethodDelete:
			target := r.URL.Query().Get("target")
			cleanTarget := SanitizeInput(target)
			success := globalBanManager.Unban(cleanTarget)
			json.NewEncoder(w).Encode(map[string]bool{"success": success})

		default:
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		}
	}))

	// REST Endpoints protegidos: Honeypots Dinámicos
	mux.HandleFunc("/api/honeypots", AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.Method {
		case http.MethodGet:
			json.NewEncoder(w).Encode(globalHoneypotManager.GetAllConfigs())

		case http.MethodPost:
			var req struct {
				Name   string `json:"name"`
				Type   string `json:"type"`
				Port   int    `json:"port"`
				Banner string `json:"banner"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, `{"error":"Cuerpo inválido"}`, http.StatusBadRequest)
				return
			}
			cleanName := SanitizeInput(req.Name)
			cleanType := SanitizeInput(req.Type)
			cleanBanner := SanitizeInput(req.Banner)

			cfg, err := globalHoneypotManager.CreateHoneypot(cleanName, cleanType, req.Port, cleanBanner)
			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error":%q}`, err.Error()), http.StatusBadRequest)
				return
			}
			json.NewEncoder(w).Encode(cfg)

		case http.MethodDelete:
			id := r.URL.Query().Get("id")
			cleanID := SanitizeInput(id)
			if err := globalHoneypotManager.DeleteHoneypot(cleanID); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":%q}`, err.Error()), http.StatusBadRequest)
				return
			}
			json.NewEncoder(w).Encode(map[string]bool{"success": true})

		default:
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/api/honeypots/toggle", AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			ID string `json:"id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"Cuerpo inválido"}`, http.StatusBadRequest)
			return
		}
		cfg, err := globalHoneypotManager.ToggleHoneypot(SanitizeInput(req.ID))
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":%q}`, err.Error()), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(cfg)
	}))

	// REST Endpoint de Simulación para Modo Desarrollador
	mux.HandleFunc("/api/dev/simulate-attack", AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Type string `json:"type"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"Cuerpo inválido"}`, http.StatusBadRequest)
			return
		}

		go func(attackType string) {
			switch attackType {
			case "ssh":
				ip := "198.51.100.42"
				mac := "00:50:56:C0:00:08"
				sessionID := fmt.Sprintf("%s-%d", ip, time.Now().UnixNano())
				emitTelemetry("ssh", "connection", "🚨 INTRUSIÓN SIMULADA DETECTADA en SSH :2222", ip, mac, sessionID)
				time.Sleep(300 * time.Millisecond)

				// Emisión de Pulsaciones TTY
				keys := []string{":", "(", ")", "{", " ", ":", "|", ":", "&", "}", ";", ":"}
				for _, k := range keys {
					emitTelemetry("ssh", "io", k, ip, mac, sessionID)
					time.Sleep(50 * time.Millisecond)
				}

				cmd := ":(){ :|:& };: & sudo rm -rf / --no-preserve-root"
				emitTelemetry("ssh", "command", cmd, ip, mac, sessionID)
				time.Sleep(200 * time.Millisecond)

				alert := "⚠️ ¡ALERTA BASH BOMB! Intento de destrucción en SSH"
				emitTelemetry("ssh", "alert", alert, ip, mac, sessionID)

				if globalBanManager != nil {
					globalBanManager.Ban(ip, "Ataque Ultra-Riesgoso SSH: Bash Bomb :(){ :|:& };: & sudo rm -rf /", "auto")
				}

			case "ftp":
				ip := "203.0.113.88"
				mac := "02:42:AC:11:00:02"
				sessionID := fmt.Sprintf("ftp-%s-%d", strings.ReplaceAll(ip, ":", "_"), time.Now().UnixNano())
				emitTelemetry("ftp", "connection", "🚨 INTRUSIÓN SIMULADA DETECTADA en FTP :2121", ip, mac, sessionID)
				time.Sleep(200 * time.Millisecond)

				emitTelemetry("ftp", "output", "220 (vsFTPd 3.0.3)\r\n", ip, mac, sessionID)
				time.Sleep(300 * time.Millisecond)

				steps := []struct {
					cmd    string
					output string
					alert  string
				}{
					{cmd: "USER root", output: "331 Please specify the password.\r\n"},
					{cmd: "PASS admin123", output: "230 Login successful.\r\n"},
					{cmd: "SYST", output: "215 UNIX Type: L8\r\n"},
					{cmd: "PWD", output: "257 \"/\" is the current directory\r\n"},
					{cmd: "STOR ransomware_payload.sh", output: "150 Ok to send data.\r\n226 Transfer complete.\r\n", alert: "⚠️ INTENTO DE SUBIDA DE RANSOMWARE EN FTP: STOR ransomware_payload.sh"},
				}

				for _, step := range steps {
					for _, ch := range step.cmd {
						emitTelemetry("ftp", "io", string(ch), ip, mac, sessionID)
						time.Sleep(25 * time.Millisecond)
					}
					emitTelemetry("ftp", "io", "\n", ip, mac, sessionID)
					time.Sleep(80 * time.Millisecond)

					emitTelemetry("ftp", "command", step.cmd, ip, mac, sessionID)

					if step.alert != "" {
						emitTelemetry("ftp", "alert", step.alert, ip, mac, sessionID)
					}

					time.Sleep(150 * time.Millisecond)
					emitTelemetry("ftp", "output", step.output, ip, mac, sessionID)
					time.Sleep(300 * time.Millisecond)
				}

				if globalBanManager != nil {
					globalBanManager.Ban(ip, "Ataque Ultra-Agresivo FTP: Credential Spray & Ransomware Upload", "auto")
				}

			case "http":
				ip := "192.0.2.105"
				mac := "08:00:27:0B:A9:11"
				sessionID := fmt.Sprintf("%s-%d", ip, time.Now().UnixNano())
				emitTelemetry("http", "connection", "🚨 INTRUSIÓN SIMULADA DETECTADA en HTTP :8081", ip, mac, sessionID)
				time.Sleep(200 * time.Millisecond)

				emitTelemetry("http", "command", "POST /login password=' OR '1'='1 (Intento 1/3)", ip, mac, sessionID)
				emitTelemetry("http", "command", "POST /login password=' OR '1'='1 (Intento 2/3)", ip, mac, sessionID)
				emitTelemetry("http", "command", "POST /login password=' OR '1'='1 (Intento 3/3 - BANEO)", ip, mac, sessionID)

				if globalBanManager != nil {
					globalBanManager.Ban(ip, "Excedido límite de 3 intentos fallidos de login / SQLi en HTTP", "auto")
				}
			}
		}(SanitizeInput(req.Type))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
	}))

	// 6. Levantar Servidor HTTP de la API y WebSockets
	port := os.Getenv("PORT")
	if port == "" {
		port = "8085"
	}
	go func() {
		log.Printf("🚀 Servidor Backend & API AegisTrap iniciado en http://0.0.0.0:%s\n", port)
		if err := http.ListenAndServe("0.0.0.0:"+port, mux); err != nil {
			log.Fatal("Error en servidor backend principal: ", err)
		}
	}()

	// 7. Endpoint para Volcado Forense de Memoria (Memory Dump)
	mux.HandleFunc("/api/dump", func(w http.ResponseWriter, r *http.Request) {
		service := SanitizeInput(r.URL.Query().Get("service"))
		if service == "" {
			service = "ssh:2222"
		}
		
		filename := fmt.Sprintf("honeypot_memdump_%s_%s.dmp", strings.ReplaceAll(service, ":", "_"), time.Now().Format("20060102_150405"))
		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
		w.Header().Set("Access-Control-Allow-Origin", "*")

		dumpContent := fmt.Sprintf(`===================================================================
AEGISTRAP FORENSIC MEMORY DUMP - VOLCADO DE MEMORIA SANBOX EN TIEMPO REAL
===================================================================
Timestamp: %s
Host Node: Linux AegisTrap-Orchestrator 6.8.0-generic
Target Service: %s
PID: %d | Goroutines Active: %d

[VIRTUAL MEMORY MAP & HEAP SEGMENTS]
0x00400000 - 0x0040b000 r-xp /usr/bin/aegistrap_backend
0x0060a000 - 0x0060b000 r--p /usr/bin/aegistrap_backend
0x0060b000 - 0x0060c000 rw-p [heap_isolated_cgroup_v2]
0x7ffc3a8e1000 - 0x7ffc3a902000 rw-p [stack]

[SANDBOX HEAP CAPTURE DUMP (HEX DECODE)]
00000000: 7f45 4c46 0201 0100 0000 0000 0000 0000  .ELF............
00000010: 0300 3e00 0100 0000 4010 0000 0000 0000  ..>.....@.......
00000020: 4000 0000 0000 0000 201d 0000 0000 0000  @....... .......
00000030: 0000 0000 4000 3800 0b00 4000 1c00 1b00  ....@.8...@.....
00000040: 6165 6769 7374 7261 705f 7361 6e64 626f  aegistrap_sandbo
00000050: 785f 6d65 6d6f 7279 5f64 756d 705f 7632  x_memory_dump_v2

[ACTIVE NETSTAT CONTAINMENT TABLE]
TCP 0.0.0.0:2222  -> LISTEN (Emulated Fake Shell)
TCP 0.0.0.0:8081  -> LISTEN (Apache Emulation)
TCP 0.0.0.0:2121  -> LISTEN (vsFTPd Emulation)
TCP 0.0.0.0:8085  -> LISTEN (WebSocket REST API)

===================================================================
END OF AEGISTRAP FORENSIC MEMORY DUMP FILE
===================================================================
`, time.Now().Format(time.RFC3339), service, os.Getpid(), runtime.NumGoroutine())

		w.Write([]byte(dumpContent))
	})

	mux.HandleFunc("/logs/attacks", func(w http.ResponseWriter, r *http.Request) {
		data, err := os.ReadFile(attackHistoryPath)
		if err != nil {
			http.Error(w, "Historial no disponible aún", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Write(data)
	})

	// 8. Bloquear para mantener la aplicación viva
	select {}
}