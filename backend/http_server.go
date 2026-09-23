package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

var (
	httpRequestCount   = make(map[string]int)
	httpRequestCountMu sync.Mutex
)

func renderBannedPageHTML(ip, reason string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>403 FORBIDDEN - BANNED DNS</title>
    <style>
        body { background-color: #FAF7F2; font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #FFFFFF; border: 4px solid #000000; box-shadow: 10px 10px 0px #000000; padding: 30px; max-width: 500px; text-align: center; }
        .header { background: #FECACA; border: 2px solid #000000; padding: 15px; margin-bottom: 20px; font-weight: 900; font-size: 20px; }
        .badge { background: #000000; color: #FFFFFF; padding: 5px 10px; font-size: 12px; font-weight: bold; }
        .details { background: #FEF08A; border: 2px solid #000000; padding: 15px; margin-top: 20px; font-family: monospace; font-size: 13px; text-align: left; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">⛔ 403 FORBIDDEN / BANNED DNS</div>
        <p><strong>SU DIRECCIÓN IP / DOMINIO HA SIDO BLOQUEADA AUTOMÁTICAMENTE</strong></p>
        <p>El sistema de defensa activa AegisTrap ha detectado actividad maliciosa o sospechosa en este servidor.</p>
        <div class="details">
            <strong>IP Baneada:</strong> %s<br>
            <strong>Razón:</strong> %s<br>
            <strong>Estado:</strong> Bloqueo TCP / DNS Activo
        </div>
    </div>
</body>
</html>`, ip, reason)
}

func renderCloneLoginPageHTML(errorMsg string) string {
	errHTML := ""
	if errorMsg != "" {
		errHTML = fmt.Sprintf(`<div style="background:#FECACA;border:2px solid #000;color:#000;font-weight:bold;font-size:12px;padding:12px;box-shadow:3px 3px 0 0 #000;display:flex;align-items:center;gap:8px;"><span class="material-symbols-outlined" style="font-size:18px;">error</span><span>%s</span></div>`, errorMsg)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AEGISTRAP SOC - Panel de Control Honeypot</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
        body { background-color: #FAF7F2; color: #000; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; position: relative; overflow: hidden; user-select: none; }
        .decor-1 { position: absolute; top: 40px; left: 40px; width: 128px; height: 128px; background: #FEF08A; border: 3px solid #000; box-shadow: 4px 4px 0 0 #000; transform: rotate(6deg); pointer-events: none; }
        .decor-2 { position: absolute; bottom: 48px; right: 48px; width: 160px; height: 160px; background: #BAE6FD; border: 3px solid #000; box-shadow: 6px 6px 0 0 #000; transform: rotate(-12deg); pointer-events: none; }
        .decor-3 { position: absolute; top: 33%%; right: 25%%; width: 96px; height: 96px; background: #FBCFE8; border: 3px solid #000; box-shadow: 4px 4px 0 0 #000; transform: rotate(45deg); pointer-events: none; }
        .card { position: relative; width: 100%%; max-width: 440px; background: #FFF; border: 3px solid #000; padding: 32px; box-shadow: 10px 10px 0 0 #000; z-index: 10; display: flex; flex-direction: column; gap: 20px; }
        .banner { background: #FEF08A; border: 2px solid #000; padding: 16px; box-shadow: 4px 4px 0 0 #000; display: flex; align-items: center; gap: 12px; }
        .icon-box { width: 48px; height: 48px; background: #A7F3D0; border: 2px solid #000; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; box-shadow: 2px 2px 0 0 #000; color: #000; }
        .title { font-weight: 900; font-size: 20px; text-transform: uppercase; color: #000; letter-spacing: -0.5px; }
        .soc-tag { background: #A7F3D0; padding: 0 4px; border: 1px solid #000; }
        .subtitle { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #000; margin-top: 2px; }
        .label { font-weight: 900; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 6px; color: #000; margin-bottom: 6px; }
        .input-box { background: #FAF7F2; border: 2px solid #000; font-family: monospace; font-weight: 700; font-size: 14px; padding: 12px 16px; width: 100%%; outline: none; box-shadow: 3px 3px 0 0 #000; transition: all 0.2s; color: #000; }
        .input-box:focus { background: #FFF; box-shadow: 5px 5px 0 0 #000; }
        .btn { width: 100%%; background: #A7F3D0; color: #000; font-weight: 900; font-size: 14px; padding: 14px 16px; border: 2px solid #000; box-shadow: 4px 4px 0 0 #000; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; }
        .btn:hover { background: #6EE7B7; }
        .btn:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 0 #000; }
        .hint { font-size: 10px; font-weight: 700; color: #4b5563; margin-top: 6px; }
    </style>
</head>
<body>
    <div class="decor-1"></div>
    <div class="decor-2"></div>
    <div class="decor-3"></div>
    <div class="card">
        <div class="banner">
            <div class="icon-box"><span class="material-symbols-outlined">shield_lock</span></div>
            <div>
                <div class="title">AEGISTRAP <span class="soc-tag">SOC</span></div>
                <div class="subtitle">PANEL DE CONTROL HONEYPOT v2.0</div>
            </div>
        </div>
        %s
        <form method="POST" action="/login">
            <div>
                <label class="label"><span class="material-symbols-outlined" style="font-size:18px;">key</span> CONTRASEÑA DE ADMINISTRADOR</label>
                <input type="password" name="password" placeholder="Ingrese la contraseña" class="input-box" required autofocus />
                <div class="hint">* El campo limpia e invalida automáticamente caracteres de inyección.</div>
            </div>
            <button type="submit" class="btn">
                <span class="material-symbols-outlined" style="font-size:20px;">login</span> Entrar
            </button>
        </form>
    </div>
</body>
</html>`, errHTML)
}

func startHTTPServer() {
	mux := http.NewServeMux()

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

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)

		// 1. Verificación de Baneo
		if globalBanManager != nil {
			if banned, reason := globalBanManager.IsBanned(ip); banned {
				log.Printf("⛔ [HTTP] Petición rechazada para IP baneada %s: %s", ip, reason)
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(renderBannedPageHTML(ip, reason)))
				return
			}
		}

		mac := getMACAddress(ip)
		reqInfo := fmt.Sprintf("%s %s %s", r.Method, r.URL.Path, r.UserAgent())
		log.Printf("🌐 [HTTP Honeypot] Petición de %s (%s): %s", ip, mac, reqInfo)

		// Emisión de conexión inicial
		broadcast <- TelemetryMessage{
			Service: "http",
			Type:    "connection",
			Payload: "Nuevo intruso conectado al Honeypot HTTP de Login Clonado",
			IP:      ip,
			MAC:     mac,
		}

		// 2. Manejo de Intentos de Login en /login o POST
		var inputPassword string
		if r.Method == http.MethodPost {
			r.ParseForm()
			inputPassword = r.FormValue("password")
		}

		// Emitir tecleo carácter por carácter si envió contraseña
		if inputPassword != "" {
			for _, ch := range inputPassword {
				broadcast <- TelemetryMessage{
					Service: "http",
					Type:    "io",
					Payload: string(ch),
					IP:      ip,
					MAC:     mac,
				}
				time.Sleep(15 * time.Millisecond)
			}
			broadcast <- TelemetryMessage{
				Service: "http",
				Type:    "io",
				Payload: "\n",
				IP:      ip,
				MAC:     mac,
			}
		}

		// Conteo de Peticiones e Inyecciones
		httpRequestCountMu.Lock()
		httpRequestCount[ip]++
		reqCount := httpRequestCount[ip]
		httpRequestCountMu.Unlock()

		payloadToLog := reqInfo
		if inputPassword != "" {
			payloadToLog = fmt.Sprintf("POST /login password='%s' (Intento %d/3)", inputPassword, reqCount)
		}

		broadcast <- TelemetryMessage{
			Service: "http",
			Type:    "command",
			Payload: payloadToLog,
			IP:      ip,
			MAC:     mac,
		}

		pathLower := strings.ToLower(r.URL.Path + " " + inputPassword)
		isSuspicious := strings.Contains(pathLower, "' or '") || strings.Contains(pathLower, "1=1") || strings.Contains(pathLower, "select") || strings.Contains(pathLower, ".env") || strings.Contains(pathLower, "passwd")

		// 3. Baneo tras 3 intentos fallidos o inyección SQL
		if isSuspicious || reqCount >= 3 {
			reason := fmt.Sprintf("Baneo Activo: 3 intentos fallidos de login / SQLi detectado en HTTP (Intento: %d)", reqCount)
			log.Printf("⛔ [HTTP Honeypot] Auto-baneando %s: %s", ip, reason)
			if globalBanManager != nil {
				globalBanManager.Ban(ip, reason, "auto")
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(renderBannedPageHTML(ip, reason)))
			return
		}

		// Si es el primer o segundo intento fallido, mostrar la página de Login Clonada con alerta
		errorMsg := ""
		if reqCount > 0 && r.Method == http.MethodPost {
			errorMsg = fmt.Sprintf("Contraseña incorrecta (Intento %d de 3). El sistema se bloqueará al tercer intento.", reqCount)
		}

		w.Header().Set("Server", "AegisTrap-SOC/2.0")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(renderCloneLoginPageHTML(errorMsg)))
	})

	log.Println("Honeypot HTTP escuchando en el puerto 8081 (Servidor Falso Clonado de AegisTrap Login)...")
	if err := http.ListenAndServe("0.0.0.0:8081", mux); err != nil {
		log.Fatalf("Error iniciando servidor HTTP: %v", err)
	}
}
