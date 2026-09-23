package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"
	"strings"
	"sync"
	"time"
)

type BannedEntry struct {
	ID        string    `json:"id"`
	Target    string    `json:"target"` // IP o Dominio DNS
	Resolved  []string  `json:"resolved,omitempty"`
	Reason    string    `json:"reason"`
	BannedAt  time.Time `json:"banned_at"`
	BannedBy  string    `json:"banned_by"` // "auto" o "admin"
}

type BanManager struct {
	mu        sync.RWMutex
	entries   map[string]*BannedEntry
	filePath  string
}

var globalBanManager *BanManager

func initBanManager(filePath string) *BanManager {
	bm := &BanManager{
		entries:  make(map[string]*BannedEntry),
		filePath: filePath,
	}
	bm.loadFromFile()
	globalBanManager = bm
	return bm
}

func (bm *BanManager) loadFromFile() {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	data, err := os.ReadFile(bm.filePath)
	if err != nil {
		if !os.IsNotExist(err) {
			log.Printf("⚠️ Error leyendo archivo de baneos: %v", err)
		}
		return
	}

	var list []BannedEntry
	if err := json.Unmarshal(data, &list); err != nil {
		log.Printf("⚠️ Error parseando archivo de baneos: %v", err)
		return
	}

	for i := range list {
		bm.entries[list[i].Target] = &list[i]
	}
	log.Printf("🔒 Cargas de baneos activadas: %d registros en lista negra", len(bm.entries))
}

func (bm *BanManager) saveToFileLocked() {
	var list []BannedEntry
	for _, entry := range bm.entries {
		list = append(list, *entry)
	}

	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		log.Printf("⚠️ Error serializando baneos: %v", err)
		return
	}

	if err := os.WriteFile(bm.filePath, data, 0644); err != nil {
		log.Printf("⚠️ Error guardando archivo de baneos: %v", err)
	}
}

func (bm *BanManager) Ban(target string, reason string, bannedBy string) (*BannedEntry, error) {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	cleanTarget := strings.TrimSpace(target)
	if cleanTarget == "" {
		return nil, fmt.Errorf("el objetivo de baneo no puede estar vacío")
	}

	var resolvedIPs []string
	// Si es un nombre de dominio DNS, intentamos resolver las IPs asociadas
	if net.ParseIP(cleanTarget) == nil {
		ips, err := net.LookupIP(cleanTarget)
		if err == nil {
			for _, ip := range ips {
				resolvedIPs = append(resolvedIPs, ip.String())
			}
		}
	} else {
		// Si es una IP, intentamos resolver nombres de host inversos (DNS)
		names, err := net.LookupAddr(cleanTarget)
		if err == nil {
			for _, name := range names {
				resolvedIPs = append(resolvedIPs, strings.TrimSuffix(name, "."))
			}
		}
	}

	entry := &BannedEntry{
		ID:       fmt.Sprintf("ban-%d", time.Now().UnixNano()),
		Target:   cleanTarget,
		Resolved: resolvedIPs,
		Reason:   reason,
		BannedAt: time.Now(),
		BannedBy: bannedBy,
	}

	bm.entries[cleanTarget] = entry
	bm.saveToFileLocked()

	log.Printf("⛔ BANEO REGISTRADO [%s] Target: %s (Resueltos: %v) | Razón: %s", bannedBy, cleanTarget, resolvedIPs, reason)

	// Emitir telemetría vía WebSocket
	go func() {
		broadcast <- TelemetryMessage{
			Service: "security",
			Type:    "ban_added",
			Payload: fmt.Sprintf("Bloqueo activado para %s (%s)", cleanTarget, reason),
			IP:      cleanTarget,
		}
	}()

	return entry, nil
}

func (bm *BanManager) Unban(target string) bool {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	cleanTarget := strings.TrimSpace(target)
	if _, exists := bm.entries[cleanTarget]; exists {
		delete(bm.entries, cleanTarget)
		bm.saveToFileLocked()
		log.Printf("✅ DESBANEO REALIZADO: %s", cleanTarget)

		go func() {
			broadcast <- TelemetryMessage{
				Service: "security",
				Type:    "ban_removed",
				Payload: fmt.Sprintf("Desbaneo completado para %s", cleanTarget),
				IP:      cleanTarget,
			}
		}()
		return true
	}
	return false
}

func (bm *BanManager) IsBanned(ip string) (bool, string) {
	bm.mu.RLock()
	defer bm.mu.RUnlock()

	cleanIP := strings.TrimSpace(ip)
	if cleanIP == "" {
		return false, ""
	}

	// 1. Verificación directa de la IP
	if entry, exists := bm.entries[cleanIP]; exists {
		return true, fmt.Sprintf("IP baneada (%s)", entry.Reason)
	}

	// 2. Verificación cruzada: Si la IP está presente en la resolución de algún dominio baneado
	for _, entry := range bm.entries {
		if entry.Target == cleanIP {
			return true, entry.Reason
		}
		for _, res := range entry.Resolved {
			if res == cleanIP {
				return true, fmt.Sprintf("Asociada a dominio baneado %s (%s)", entry.Target, entry.Reason)
			}
		}
	}

	return false, ""
}

func (bm *BanManager) GetBannedList() []BannedEntry {
	bm.mu.RLock()
	defer bm.mu.RUnlock()

	list := make([]BannedEntry, 0, len(bm.entries))
	for _, entry := range bm.entries {
		list = append(list, *entry)
	}
	return list
}
