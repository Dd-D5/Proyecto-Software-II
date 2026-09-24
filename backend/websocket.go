package main

import (
	"log"
	"net/http"
	"sync"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Permite conexiones locales del frontend React
	},
}

var (
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex
	broadcast = make(chan interface{}, 256)
)

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Verificar el token de autorización en el query param (?token=...)
	token := r.URL.Query().Get("token")
	if globalAuth != nil && !globalAuth.ValidateToken(token) {
		log.Printf("⚠️ Intento de conexión WebSocket rechazado: Token inválido")
		http.Error(w, "No autorizado", http.StatusUnauthorized)
		return
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error actualizando a WebSocket: %v", err)
		return
	}
	defer ws.Close()

	clientsMu.Lock()
	clients[ws] = true
	clientsMu.Unlock()

	for {
		_, _, err := ws.ReadMessage()
		if err != nil {
			clientsMu.Lock()
			delete(clients, ws)
			clientsMu.Unlock()
			break
		}
	}
}

func handleMessages() {
	for {
		msg := <-broadcast
		clientsMu.Lock()
		for client := range clients {
			err := client.WriteJSON(msg)
			if err != nil {
				client.Close()
				delete(clients, client)
			}
		}
		clientsMu.Unlock()
	}
}