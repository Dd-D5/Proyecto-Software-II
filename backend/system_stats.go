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

type SystemTelemetry struct {
	Type          string  `json:"type"`
	CPUPercent    float64 `json:"cpu_percent"`
	RAMUsedMB     float64 `json:"ram_used_mb"`
	RAMTotalMB    float64 `json:"ram_total_mb"`
	UptimeSeconds float64 `json:"uptime_seconds"`
	TotalAttacks  int64   `json:"total_attacks"`
	ServerMAC     string  `json:"server_mac"`
	NIC           string  `json:"nic"`
}

func incrementAttackCounter() {
	atomic.AddInt64(&globalAttackCounter, 1)
}

func getRealRAM() (float64, float64) {
	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		return float64(m.Alloc) / 1024 / 1024, float64(m.Sys) / 1024 / 1024
	}

	lines := strings.Split(string(data), "\n")
	var memTotal, memAvailable float64
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) >= 2 {
			if fields[0] == "MemTotal:" {
				val, _ := strconv.ParseFloat(fields[1], 64)
				memTotal = val / 1024 // MB
			} else if fields[0] == "MemAvailable:" || fields[0] == "MemFree:" {
				val, _ := strconv.ParseFloat(fields[1], 64)
				if memAvailable == 0 {
					memAvailable = val / 1024 // MB
				}
			}
		}
	}
	if memTotal == 0 {
		memTotal = 2048
	}
	memUsed := memTotal - memAvailable
	return memUsed, memTotal
}

func getRealCPU() float64 {
	data, err := os.ReadFile("/proc/stat")
	if err != nil {
		return float64(runtime.NumGoroutine()*2 + 5)
	}
	lines := strings.Split(string(data), "\n")
	if len(lines) > 0 {
		fields := strings.Fields(lines[0])
		if len(fields) >= 5 && fields[0] == "cpu" {
			user, _ := strconv.ParseFloat(fields[1], 64)
			nice, _ := strconv.ParseFloat(fields[2], 64)
			system, _ := strconv.ParseFloat(fields[3], 64)
			idle, _ := strconv.ParseFloat(fields[4], 64)
			total := user + nice + system + idle
			if total > 0 {
				busy := user + nice + system
				return (busy / total) * 100
			}
		}
	}
	return 12.5
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
	ticker := time.NewTicker(2 * time.Second)
	go func() {
		for range ticker.C {
			ramUsed, ramTotal := getRealRAM()
			cpu := getRealCPU()
			uptime := getRealUptime()
			mac, nic := getRealServerMAC()
			attacks := atomic.LoadInt64(&globalAttackCounter)

			// Formatear precisión decimal
			ramUsedStr, _ := strconv.ParseFloat(fmt.Sprintf("%.1f", ramUsed), 64)
			ramTotalStr, _ := strconv.ParseFloat(fmt.Sprintf("%.1f", ramTotal), 64)
			cpuStr, _ := strconv.ParseFloat(fmt.Sprintf("%.1f", cpu), 64)

			broadcast <- SystemTelemetry{
				Type:          "system_stats",
				CPUPercent:    cpuStr,
				RAMUsedMB:     ramUsedStr,
				RAMTotalMB:    ramTotalStr,
				UptimeSeconds: uptime,
				TotalAttacks:  attacks,
				ServerMAC:     mac,
				NIC:           nic,
			}
		}
	}()
}
