package main

import (
	"fmt"
	"net"
	"strings"
	"testing"
	"time"
)

// Check mínimo: go test ./...
// Manager bare (sin defaults) para no bindear 2222/2121/8081 en el entorno de test.

func TestCreateHoneypotKernelConflictRollsBack(t *testing.T) {
	hm := &HoneypotManager{instances: make(map[string]*HoneypotInstance)}

	// El propio test hace de proceso externo ocupando el puerto (el "nginx")
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()

	_, err = hm.CreateHoneypot("Conflicto", "http", l.Addr().(*net.TCPAddr).Port, "")
	if err == nil || !strings.Contains(err.Error(), "kernel") {
		t.Fatalf("esperaba error de kernel, got: %v", err)
	}
	if len(hm.instances) != 0 {
		t.Fatalf("la instancia fallida quedó en la lista (%d)", len(hm.instances))
	}
}

func TestCreateHoneypotDuplicatePortRejected(t *testing.T) {
	hm := &HoneypotManager{instances: make(map[string]*HoneypotInstance)}

	// Puerto libre: reservar y liberar (carrera mínima aceptable en test local)
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	port := l.Addr().(*net.TCPAddr).Port
	l.Close()

	if _, err := hm.CreateHoneypot("Primero", "http", port, ""); err != nil {
		t.Fatalf("el primero debía crearse en el puerto %d: %v", port, err)
	}
	_, err = hm.CreateHoneypot("Segundo", "ssh", port, "")
	if err == nil || !strings.Contains(err.Error(), "ya pertenece") {
		t.Fatalf("esperaba conflicto contra honeypot existente, got: %v", err)
	}
	if len(hm.instances) != 1 {
		t.Fatalf("esperaba 1 instancia tras el rechazo, got %d", len(hm.instances))
	}
}

func TestPauseKillsLiveConnections(t *testing.T) {
	hm := &HoneypotManager{instances: make(map[string]*HoneypotInstance)}

	// Puerto libre para el honeypot FTP
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	port := l.Addr().(*net.TCPAddr).Port
	l.Close()

	cfg, err := hm.CreateHoneypot("FTP Test", "ftp", port, "")
	if err != nil {
		t.Fatal(err)
	}

	// Atacante falso: conecta y lee el banner (confirma que el handler está vivo)
	client, err := net.Dial("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()
	client.SetReadDeadline(time.Now().Add(2 * time.Second))
	buf := make([]byte, 256)
	n, err := client.Read(buf)
	if err != nil || !strings.Contains(string(buf[:n]), "220") {
		t.Fatalf("esperaba banner FTP, got %q err=%v", string(buf[:n]), err)
	}

	// Pausar el honeypot → la conexión viva del atacante debe morir
	if _, err := hm.ToggleHoneypot(cfg.ID); err != nil {
		t.Fatal(err)
	}
	client.SetReadDeadline(time.Now().Add(2 * time.Second))
	if _, err := client.Read(buf); err == nil {
		t.Fatal("la conexión del atacante sobrevivió a la pausa")
	}

	// El connection_end (que limpia breach/active_sessions en el frontend)
	// debe haber llegado al canal broadcast tras el corte
	sawEnd := false
	deadline := time.After(2 * time.Second)
	for !sawEnd {
		select {
		case msg := <-broadcast:
			if tm, ok := msg.(TelemetryMessage); ok && tm.Type == "connection_end" && tm.Service == fmt.Sprintf("ftp:%d", port) {
				sawEnd = true
			}
		case <-deadline:
			t.Fatal("connection_end nunca llegó al broadcast")
		}
	}
}
