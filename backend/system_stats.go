package main

import (
	"fmt"
	"net"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
)

var globalAttackCounter int64 = 0

// Conexiones acumuladas por tipo de servicio (ssh/ftp/http). Se bumpa desde
// emitTelemetry en cada evento "connection" — cubre honeypots default y dinámicos.
var connCounts = map[string]*atomic.Int64{"ssh": {}, "ftp": {}, "http": {}}

type SystemTelemetry struct {
	Type          string           `json:"type"`
	CPUPercent    float64          `json:"cpu_percent"`
	RAMUsedMB     float64          `json:"ram_used_mb"`
	RAMTotalMB    float64          `json:"ram_total_mb"`
	UptimeSeconds float64          `json:"uptime_seconds"`
	TotalAttacks  int64            `json:"total_attacks"`
	ServerMAC     string           `json:"server_mac"`
	NIC           string           `json:"nic"`
	Connections   map[string]int64 `json:"connections"`
}

func incrementAttackCounter() {
	atomic.AddInt64(&globalAttackCounter, 1)
}

// bumpConnCount agrega una conexión al contador del tipo base del servicio.
// Normaliza IDs dinámicos: "ssh:2222" y "default-ssh" cuentan como "ssh".
func bumpConnCount(service string) {
	base := service
	if i := strings.Index(service, ":"); i > 0 {
		base = service[:i]
	}
	base = strings.TrimPrefix(base, "default-")
	if c, ok := connCounts[base]; ok {
		c.Add(1)
	}
}

func initAttackCounter() {
	data, err := os.ReadFile(attackHistoryPath)
	if err != nil {
		return
	}
	var count int64 = 0
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "[ATTACK ") {
			count++
		}
	}
	atomic.StoreInt64(&globalAttackCounter, count)
}

// getProcessRAM devuelve (RSS del proceso honeypot en MB, MemTotal del sistema en MB).
// El total del sistema se mantiene para que el Frontend calcule el % que ocupa el proceso.
func getProcessRAM() (float64, float64) {
	memTotal := 2048.0
	if data, err := os.ReadFile("/proc/meminfo"); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			if fields := strings.Fields(line); len(fields) >= 2 && fields[0] == "MemTotal:" {
				val, _ := strconv.ParseFloat(fields[1], 64)
				memTotal = val / 1024 // kB → MB
				break
			}
		}
	}

	rssMB := 0.0
	if data, err := os.ReadFile("/proc/self/status"); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			if strings.HasPrefix(line, "VmRSS:") {
				if fields := strings.Fields(line); len(fields) >= 2 {
					val, _ := strconv.ParseFloat(fields[1], 64)
					rssMB = val / 1024 // kB → MB
				}
				break
			}
		}
	}
	if rssMB == 0 {
		// Fallback si /proc no está disponible (no-Linux): memoria virtual del runtime
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		rssMB = float64(m.Sys) / 1024 / 1024
	}
	return rssMB, memTotal
}

// readSelfCPUTicks lee utime+stime de /proc/self/stat, en clock ticks
func readSelfCPUTicks() int64 {
	data, err := os.ReadFile("/proc/self/stat")
	if err != nil {
		return 0
	}
	fields := strings.Fields(string(data))
	if len(fields) < 15 {
		return 0
	}
	utime, _ := strconv.ParseInt(fields[13], 10, 64)
	stime, _ := strconv.ParseInt(fields[14], 10, 64)
	return utime + stime
}

func getRealUptime() float64 {
	data, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return 3600
	}
	fields := strings.Fields(string(data))
	if len(fields) > 0 {
		val, _ := strconv.ParseFloat(fields[0], 64)
		return val
	}
	return 3600
}

func getRealServerMAC() (string, string) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return "00:1A:2B:3C:4D:5E", "eth0"
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagLoopback == 0 && len(iface.HardwareAddr) > 0 {
			return iface.HardwareAddr.String(), iface.Name
		}
	}
	return "00:1A:2B:3C:4D:5E", "eth0"
}

func startSystemStatsTicker() {
	// ponytail: CPU/RAM son del proceso honeypot (no del host). CLK_TCK=100
	// hardcodeado (default Linux); con ventana de 1s la resolución de CPU es ~1%
	// (1 tick = 10ms) — el daemon idle mostrará 0.0-0.3% con jitter.
	// Upgrade path: ventana móvil de N samples si se requiere sub-1%.
	prevTicks := readSelfCPUTicks()
	prevTime := time.Now()

	ticker := time.NewTicker(1 * time.Second)
	go func() {
		for range ticker.C {
			now := time.Now()
			elapsed := now.Sub(prevTime).Seconds()
			ticks := readSelfCPUTicks()
			cpu := 0.0
			if elapsed > 0 && ticks >= prevTicks {
				cpu = (float64(ticks-prevTicks) / 100.0) / elapsed * 100
			}
			prevTicks, prevTime = ticks, now

			ramUsed, ramTotal := getProcessRAM()
			uptime := getRealUptime()
			mac, nic := getRealServerMAC()
			attacks := atomic.LoadInt64(&globalAttackCounter)

			// Formatear precisión decimal
			ramUsedStr, _ := strconv.ParseFloat(fmt.Sprintf("%.1f", ramUsed), 64)
			ramTotalStr, _ := strconv.ParseFloat(fmt.Sprintf("%.1f", ramTotal), 64)
			cpuStr, _ := strconv.ParseFloat(fmt.Sprintf("%.1f", cpu), 64)

			conns := make(map[string]int64, len(connCounts))
			for svc, c := range connCounts {
				conns[svc] = c.Load()
			}

			// Directo al canal: es un sample periódico, NO evidencia de ataque
			// (no pasa por appendAttackHistoryEntry).
			broadcast <- SystemTelemetry{
				Type:          "system_stats",
				CPUPercent:    cpuStr,
				RAMUsedMB:     ramUsedStr,
				RAMTotalMB:    ramTotalStr,
				UptimeSeconds: uptime,
				TotalAttacks:  attacks,
				ServerMAC:     mac,
				NIC:           nic,
				Connections:   conns,
			}
		}
	}()
}
