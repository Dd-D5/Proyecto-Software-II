package main

import (
	"log"
	"net/http"
)

func main() {
	// 1. Iniciar la transmisión de telemetría (Canal interno)
	go handleMessages()
	http.HandleFunc("/ws", handleConnections)
	
	// 2. Levantar el servidor WebSockets (Puerto 8080)
	go func() {
		log.Println("Servidor WebSocket iniciado en 0.0.0.0:8080/ws")
		if err := http.ListenAndServe("0.0.0.0:8080", nil); err != nil {
			log.Fatal("Error en el servidor de WebSockets: ", err)
		}
	}()

	// 3. Levantar los Honeypots en hilos separados
	go startHTTPServer() // Escucha en 8081
	go startFTPServer()  // Escucha en 2121
	go startMetricsSampler() // Métricas del daemon cada 5s

	// 4. Levantar el Honeypot SSH (Bloqueante, mantiene el programa vivo)
	startSSHServer()     // Escucha en 2222
}