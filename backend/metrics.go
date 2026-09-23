package main

import (
	"encoding/json"
	"math"
	"os"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
)

// Contadores de conexiones (ataques) por servicio
var connCounts struct {
	ssh, ftp, http atomic.Int64
}

func bumpConnCount(service string) {
	switch service {
	case "ssh":
		connCounts.ssh.Add(1)
	case "ftp":
		connCounts.ftp.Add(1)
	case "http":
		connCounts.http.Add(1)
	}
}

// ponytail: CPU/RAM son del daemon completo — las 3 trampas son goroutines de este
// proceso y el OS no mide CPU/RAM por goroutine. Upgrade path: separar cada honeypot
// en proceso propio con cgroup si se requiere atribución real por servicio.
func startMetricsSampler() {
	prevTicks := readProcCPUTicks()
	prevTime := time.Now()

	for {
		time.Sleep(1 * time.Second)

		now := time.Now()
		elapsed := now.Sub(prevTime).Seconds()
		ticks := readProcCPUTicks()
		cpu := 0.0
		if elapsed > 0 && ticks >= prevTicks {
			// ponytail: CLK_TCK=100 hardcodeado (default Linux); ajustar si el kernel difiere
			cpu = math.Round((float64(ticks-prevTicks)/100.0)/elapsed*1000) / 10
		}

		payload, _ := json.Marshal(map[string]any{
			"ssh":  map[string]int64{"connections": connCounts.ssh.Load()},
			"ftp":  map[string]int64{"connections": connCounts.ftp.Load()},
			"http": map[string]int64{"connections": connCounts.http.Load()},
			"cpu":  cpu,
			"ram":  math.Round(float64(readProcRSSKb())/102.4) / 10,
		})

		// Directo al canal: NO usar emitTelemetry (appendea a attack_history.txt y un
		// sample cada 5s lo flooding con no-evidencia). Las métricas no son ataques.
		broadcast <- TelemetryMessage{Service: "daemon", Type: "metrics", Payload: string(payload)}

		prevTicks, prevTime = ticks, now
	}
}

// utime+stime de /proc/self/stat, en clock ticks
func readProcCPUTicks() int64 {
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

// RSS de /proc/self/status en kB (lo que muestra ps)
func readProcRSSKb() int64 {
	data, err := os.ReadFile("/proc/self/status")
	if err != nil {
		return 0
	}
	for _, line := range strings.Split(string(data), "\n") {
		if strings.HasPrefix(line, "VmRSS:") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				kb, _ := strconv.ParseInt(fields[1], 10, 64)
				return kb
			}
		}
	}
	return 0
}
