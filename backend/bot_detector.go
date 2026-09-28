package main

import (
	"math"
	"strings"
	"sync"
	"time"
)

// Detector HUMANO/BOT por cadencia. Engancha en emitTelemetry (el embudo común
// de todos los servicios) — cero hooks por handler, cero parsing nuevo.
//
// Heurística por servicio:
//   - SSH:  CV (stddev/media) de deltas entre teclas, ventana 24. Metrónomo = bot.
//   - FTP:  CV de deltas entre comandos, ventana 12 — señal por línea, más débil.
//   - HTTP: sin teclas → gap medio entre requests (por IP: el sessionID es
//     por-request, http_server.go:498) + patrón peligroso (un alert de la tienda
//     es una herramienta por definición → bot pegajoso por IP).
//
// ponytail: umbrales calibrados a mano, sin dataset etiquetado. Upgrade path:
// calibrar contra bots/*.py (--human vs cadencia fija) y sesiones humanas reales.
// Veredicto tri-estado (human/bot/suspect); sin score continuo — YAGNI.
const (
	botWindowSSH  = 24
	botMinSSH     = 12
	botCVBotSSH   = 0.15
	botCVHumanSSH = 0.35
	botMeanBotSSH = 60 * time.Millisecond

	botWindowFTP  = 12
	botMinFTP     = 6
	botCVBotFTP   = 0.10
	botCVHumanFTP = 0.35
	botMeanBotFTP = 300 * time.Millisecond

	botWindowHTTP     = 6
	botMinReqHTTP     = 3
	botMeanGapBotHTTP = 250 * time.Millisecond
)

type botSession struct {
	times   []time.Time
	verdict string
}

type botHTTPClient struct {
	reqTimes   []time.Time
	patternHit bool
}

var (
	botMu       sync.Mutex
	botSessions = map[string]*botSession{}    // sessionID → serie (ssh/ftp)
	botHTTP     = map[string]*botHTTPClient{} // ip → serie de requests (http)
)

func baseService(service string) string {
	base := service
	if i := strings.Index(service, ":"); i > 0 {
		base = service[:i]
	}
	return strings.TrimPrefix(base, "default-")
}

func pushTrimmed(s *[]time.Time, t time.Time, window int) {
	*s = append(*s, t)
	if len(*s) > window {
		*s = (*s)[len(*s)-window:]
	}
}

func classifyCV(times []time.Time, minSamples int, cvBot, cvHuman float64, meanBot time.Duration) string {
	if len(times) < minSamples {
		return "suspect"
	}
	var mean float64
	for i := 1; i < len(times); i++ {
		mean += times[i].Sub(times[i-1]).Seconds()
	}
	mean /= float64(len(times) - 1)
	if mean == 0 || mean*float64(time.Second) < float64(meanBot) {
		return "bot"
	}
	variance := 0.0
	for i := 1; i < len(times); i++ {
		d := times[i].Sub(times[i-1]).Seconds() - mean
		variance += d * d
	}
	variance /= float64(len(times) - 1)
	stddev := math.Sqrt(variance)
	cv := stddev / mean
	if cv < cvBot {
		return "bot"
	}
	if cv > cvHuman {
		return "human"
	}
	return "suspect"
}

func meanGap(times []time.Time) time.Duration {
	if len(times) < 2 {
		return 0
	}
	var total time.Duration
	for i := 1; i < len(times); i++ {
		total += times[i].Sub(times[i-1])
	}
	return total / time.Duration(len(times)-1)
}

// observeEvent actualiza la serie correspondiente según el tipo de evento.
func observeEvent(service, eventType, sessionID, ip string, t time.Time) {
	base := baseService(service)
	botMu.Lock()
	defer botMu.Unlock()

	switch {
	case base == "ssh" && eventType == "io":
		s := botSessions[sessionID]
		if s == nil {
			s = &botSession{}
			botSessions[sessionID] = s
		}
		pushTrimmed(&s.times, t, botWindowSSH)
		s.verdict = classifyCV(s.times, botMinSSH, botCVBotSSH, botCVHumanSSH, botMeanBotSSH)

	case base == "ftp" && eventType == "command":
		s := botSessions[sessionID]
		if s == nil {
			s = &botSession{}
			botSessions[sessionID] = s
		}
		pushTrimmed(&s.times, t, botWindowFTP)
		s.verdict = classifyCV(s.times, botMinFTP, botCVBotFTP, botCVHumanFTP, botMeanBotFTP)

	case base == "http" && eventType == "connection":
		c := botHTTP[ip]
		if c == nil {
			c = &botHTTPClient{}
			botHTTP[ip] = c
		}
		pushTrimmed(&c.reqTimes, t, botWindowHTTP)

	case base == "http" && eventType == "alert":
		// Patrón de herramienta (SQLi/scanner/...) → bot pegajoso por IP
		c := botHTTP[ip]
		if c == nil {
			c = &botHTTPClient{}
			botHTTP[ip] = c
		}
		c.patternHit = true

	// Limpieza: la sesión cerró, su serie ya no aporta
	case (base == "ssh" || base == "ftp") && eventType == "connection_end":
		delete(botSessions, sessionID)
	}
	// ponytail: botHTTP (por IP) nunca se limpia — crece con el nº de IPs
	// atacantes, no con los eventos. Upgrade path: TTL por IP si se degrada.
}

// verdictFor devuelve la marca de la sesión actual: human | bot | suspect.
func verdictFor(service, sessionID, ip string) string {
	botMu.Lock()
	defer botMu.Unlock()
	base := baseService(service)

	if base == "http" {
		c := botHTTP[ip]
		if c == nil {
			return "suspect"
		}
		if c.patternHit {
			return "bot"
		}
		if len(c.reqTimes) < botMinReqHTTP {
			return "suspect"
		}
		if meanGap(c.reqTimes) < botMeanGapBotHTTP {
			return "bot"
		}
		return "human"
	}

	if s := botSessions[sessionID]; s != nil && s.verdict != "" {
		return s.verdict
	}
	return "suspect"
}
