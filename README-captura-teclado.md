
Funcionamiento:

- captura de cada byte recibido por el canal SSH;
- identificación de la sesión mediante IP y MAC;
- reconstrucción del comando al detectar Enter;
- emisión de eventos de teclado y comandos al frontend;
- generación de alertas por comandos sensibles;
- registro para análisis forense y diagnóstico posterior.

La captura se limita al entorno del honeypot y a la sesión controlada del atacante.

---

## 3. Arquitectura

El flujo se integra en la capa SSH del backend. El atacante interactúa con una shell falsa. Cada bloque recibido del `ssh.Channel` se trata como una entrada de teclado. Cuando la entrada finaliza con nueva línea, se reconstruye el comando y se emite un evento estructurado.

Los elementos principales son:

- servicio SSH receptor;
- shell falsa de interacción;
- buffer de línea por sesión;
- canal de telemetría interno;
- transmisión por WebSocket;
- análisis de comportamiento para alertas.

---

## 4. Modelo de evento

```go
type TelemetryMessage struct {
    Service   string `json:"service"`
    Type      string `json:"type"`
    Payload   string `json:"payload"`
    IP        string `json:"ip"`
    MAC       string `json:"mac"`
    SessionID string `json:"session_id,omitempty"`
    Timestamp string `json:"timestamp,omitempty"`
}
```

```go
type KeyEvent struct {
    Timestamp time.Time `json:"timestamp"`
    SessionID string    `json:"session_id"`
    Service   string    `json:"service"`
    IP        string    `json:"ip"`
    MAC       string    `json:"mac"`
    Key       string    `json:"key"`
    Raw       string    `json:"raw,omitempty"`
    Command   string    `json:"command,omitempty"`
    Type      string    `json:"type"`
}
```

---

## 5. Funcionamiento

Se genera un identificador de sesión para cada conexión. En cada lectura del canal SSH se registra la entrada. Si se detecta `Enter`, se procesa el contenido acumulado del buffer y se genera el comando completo. A continuación, se analiza si el comando es crítico y se emite la telemetría para el panel.

el orden del funcionamiento seria asi:

1. conexión SSH del atacante;
2. lectura del `ssh.Channel`;
3. registro de cada pulsación;
4. acumulación en buffer;
5. detección de nueva línea;
6. reconstrucción del comando;
7. emisión por WebSocket;
8. análisis y alerta.

---

## 6. Implementación  en Go

```go
func newSessionID(ip string) string {
    cleanIP := strings.ReplaceAll(ip, ":", "_")
    if cleanIP == "" {
        cleanIP = "unknown"
    }
    return fmt.Sprintf("%s-%d", cleanIP, time.Now().UnixNano())
}

func emitTelemetry(service, eventType, payload, ip, mac, sessionID string) {
    broadcast <- TelemetryMessage{
        Service:   service,
        Type:      eventType,
        Payload:   payload,
        IP:        ip,
        MAC:       mac,
        SessionID: sessionID,
        Timestamp: time.Now().Format(time.RFC3339Nano),
    }
}

func normalizeInput(input string) string {
    switch input {
    case "\x03":
        return "<CTRL+C>"
    case "\x1b[A", "\x1b[B", "\x1b[C", "\x1b[D":
        return "<ARROW>"
    case "\t":
        return "<TAB>"
    case "\x7f", "\b":
        return "<BACKSPACE>"
    default:
        return input
    }
}

func recordKeyEvent(sessionID, ip, mac, service, raw string) {
    if raw == "" {
        return
    }
    key := normalizeInput(raw)
    if key == "" {
        return
    }
    emitTelemetry(service, "io", key, ip, mac, sessionID)
}

func recordCommandEvent(sessionID, ip, mac, service, cmd string) {
    if strings.TrimSpace(cmd) == "" {
        return
    }
    emitTelemetry(service, "command", cmd, ip, mac, sessionID)
}
```

---

## 7. Lógica de la shell falsa

```go
func startFakeShell(channel ssh.Channel, ip, mac string) {
    defer channel.Close()

    sessionID := newSessionID(ip)
    prompt := "root@ubuntu:~# "
    channel.Write([]byte(prompt))

    buf := make([]byte, 256)
    lineBuffer := ""

    for {
        n, err := channel.Read(buf)
        if err != nil {
            return
        }

        input := string(buf[:n])
        recordKeyEvent(sessionID, ip, mac, "ssh", input)

        if containsEnter(buf[:n]) {
            channel.Write([]byte("\r\n"))

            cleanCmd := strings.TrimSpace(lineBuffer)
            if cleanCmd != "" {
                recordCommandEvent(sessionID, ip, mac, "ssh", cleanCmd)
                analyzeCommand(cleanCmd, ip, mac)
                simulateOSResponse(channel, cleanCmd)
            }

            channel.Write([]byte(prompt))
            lineBuffer = ""
        } else if input == "\x7f" || input == "\b" {
            if len(lineBuffer) > 0 {
                lineBuffer = lineBuffer[:len(lineBuffer)-1]
                channel.Write([]byte("\b \b"))
            }
        } else {
            lineBuffer += input
            channel.Write(buf[:n])
        }
    }
}
```

---

## 8. Detección de comandos sensibles

El sistema mantiene una lista de comandos de alto riesgo y genera una alerta cuando coinciden con el primer token introducido por el atacante.

```go
var sensitiveCommands = []string{"sudo", "su", "rm", "passwd", "chmod", "chown", "wget", "curl", "nc", "bash", "sh", "iptables"}
```

La detección se realiza mediante extracción del primer token del comando y comparación con la lista.

---

9. Integración con WebSocket

Cada evento se transmite al canal de broadcast del backend. El WebSocket lo envía a los clientes conectados, muestra la actividad en tiempo real en el frontend.

Ejemplo de evento JSON:

```json
{
  "service": "ssh",
    "type": "io",
  "payload": "l",
  "ip": "10.0.0.5",
  "mac": "00:11:22:33:44:55",
  "session_id": "10.0.0.5-172675",
  "timestamp": "2026-09-19T12:00:00.123Z"
}
```

### session_id en el frontend

El campo `session_id` permite relacionar los eventos recibidos que pertenecen a una misma conexión SSH. El frontend ahora lo procesa desde el mensaje WebSocket y lo muestra en la tarjeta de huella de red, junto con la IP y la MAC del atacante.

El flujo implementado es el siguiente:

1. `useWebSocket.js` lee `msg.session_id` y lo guarda en el estado `sessionId`.
2. `DashboardView.jsx` pasa ese estado a `LiveTerminalView.jsx`.
3. `LiveTerminalView.jsx` lo entrega a `NetworkFingerprintCard.jsx`.
4. `NetworkFingerprintCard.jsx` muestra el identificador activo en la sección `ID DE SESIÓN`.

De esta manera, el panel permite comprobar visualmente qué eventos pertenecen a la misma sesión y facilita el seguimiento de la actividad del atacante. Si todavía no se ha recibido una conexión, se muestra el estado `Esperando conexión`.

Los cambios del frontend se realizaron en los siguientes archivos:

- `frontend/src/hooks/useWebSocket.js` linea 20, lineas 68-69 y linea 123
- `frontend/src/views/DashboardView.jsx` lineas 18, 40
- `frontend/src/components/live-terminal/LiveTerminalView.jsx` lineas 14 y 18
- `frontend/src/components/live-terminal NetworkFingerprintCard.jsx`lineas 5, 65-67
- `frontend/src/services/types.js`linea 22




