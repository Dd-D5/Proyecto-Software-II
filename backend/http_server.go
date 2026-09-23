package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
)

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
		mac := getMACAddress(ip)

		// Capturar la petición exacta (Método, Ruta, Navegador/Herramienta)
		reqInfo := fmt.Sprintf("%s %s %s", r.Method, r.URL.Path, r.UserAgent())
		log.Printf("🌐 [HTTP] Petición de %s (%s): %s", ip, mac, reqInfo)

		// connection por request (cada curl repite el evento); inofensivo
		// porque el frontend es idempotente. Upgrade path: dedupe por IP+timestamp.
		broadcast <- TelemetryMessage{
			Service: "http",
			Type:    "connection",
			Payload: "Nuevo intruso conectado al puerto HTTP",
			IP:      ip,
			MAC:     mac,
		}

		// Emitir la telemetría al Dashboard
		broadcast <- TelemetryMessage{
			Service: "http",
			Type:    "command",
			Payload: reqInfo,
			IP:      ip,
			MAC:     mac,
		}

		// Simular un servidor Apache genérico
		w.Header().Set("Server", "Apache/2.4.41 (Ubuntu)")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("<html><body><h1>It works!</h1><p>This is the default web page for this server.</p></body></html>"))
	})

	log.Println("Honeypot HTTP escuchando en el puerto 8081...")
	if err := http.ListenAndServe("0.0.0.0:8081", mux); err != nil {
		log.Fatalf("Error iniciando servidor HTTP: %v", err)
	}
}
