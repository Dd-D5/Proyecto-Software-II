# AegisTrap Frontend — SOC Telemetry & Live Terminal

Plataforma de interfaz táctica de Centro de Operaciones de Seguridad (SOC) para **AegisTrap**, un sistema de defensa activa y orquestación de honeypots (SSH, FTP, HTTP) con telemetría en tiempo real sobre WebSockets.

Desarrollada con **React 19**, **Vite 8**, **Tailwind CSS** y **xterm.js WebGL**.

---

## 1. Estructura del Proyecto

```
frontend/
├── index.html                  # Plantilla HTML base con fuentes Inter, JetBrains Mono y Material Symbols
├── package.json                # Dependencias y scripts de ejecución
├── postcss.config.js           # Integración PostCSS + Tailwind + Autoprefixer
├── tailwind.config.js          # Design System AegisTrap (colores obsidian, emerald, cyan, amber, rose)
├── vite.config.js              # Configuración de empaquetado Vite y plugin React
└── src/
    ├── main.jsx                # Punto de entrada de la aplicación React
    ├── App.jsx                 # Componente raíz
    ├── index.css               # Directivas de Tailwind CSS y reset base
    ├── components/
    │   ├── shared/             # Componentes reutilizables entre vistas
    │   │   ├── TrapSelector.jsx         # Selector de trampa activa (SSH, FTP, HTTP) y estado sandbox
    │   │   ├── MetricsRow.jsx           # Fila superior de 5 tarjetas KPI tácticas
    │   │   └── StatusBadge.jsx          # Badges de estado coloreados según severidad
    │   ├── layout/             # Shell global persistente
    │   │   ├── Sidebar.jsx              # Dock lateral de 64px con accesos rápidos y daemon indicator
    │   │   ├── TopBar.jsx               # Header superior de 56px con navegación y telemetría LAN
    │   │   ├── Footer.jsx               # Barra inferior fija de 40px con métricas de Go Kernel
    │   │   └── AppLayout.jsx            # Contenedor con cálculo exacto de márgenes
    │   ├── live-terminal/      # Pestaña Principal: Live Terminal
    │   │   ├── LiveTerminalView.jsx     # Contenedor con grid 7:5 (Terminal vs Forensics)
    │   │   ├── TerminalFrame.jsx        # Emulador xterm.js con soporte WebGL y controles de buffer
    │   │   ├── NetworkFingerprintCard.jsx # Tarjeta de huella de red L2/L3 (MAC/NIC) con copiado
    │   │   └── KeystrokeInspector.jsx   # Tabla de 5 columnas con métricas heurísticas de pulsación
    │   └── admin-servicios/    # Pestaña: Admin Servicios
    │       ├── AdminServiciosView.jsx   # Monitor de honeypots locales y formulario de despliegue
    │       └── ServiceList.jsx          # Tabla táctica de puertos y sesiones activas
    ├── hooks/
    │   └── useWebSocket.js     # Hook compartido de conexión y filtrado de telemetría
    ├── services/
    │   ├── wsClient.js         # Cliente WebSocket con reconexión automática de 2s
    │   └── types.js            # Contrato y constantes de eventos (io, command, alert, connection)
    └── views/
        └── DashboardView.jsx   # Estado unificado de pestañas y orquestación del flujo reactivo
```

---

## 2. Arquitectura de Componentes y Mapa de Pertenencia

La aplicación utiliza un patrón **feature-based** donde el shell global permanece fijo y las vistas se conmutan sin recarga de página:

| Pestaña / Área | Componentes Pertenecientes | Responsabilidad |
| :--- | :--- | :--- |
| **Shell Global** | `AppLayout`, `Sidebar`, `TopBar`, `Footer` | Navegación entre pestañas, indicador visual del daemon Go, estado de conexión WebSocket LAN y versión del kernel. |
| **Live Terminal** (Principal) | `LiveTerminalView`, `TrapSelector`, `MetricsRow`, `TerminalFrame`, `NetworkFingerprintCard`, `KeystrokeInspector` | Visualización en vivo de la intrusión activa: consola interactiva xterm.js WebGL, inspección de pulsaciones tecla a tecla con jitter/cadencia y huella Ethernet L2/L3 del atacante. |
| **Servicios** | `AdminServiciosView`, `ServiceList` | Supervisión de los puertos de red expuestos (:2222, :2121, :8080), estado de jaulas sandbox y despliegue rápido de nuevas trampas simuladas. |

---

## 3. Integración con WebSocket Go

El cliente frontend se conecta automáticamente al endpoint WebSocket expuesto por el backend Go:

```
ws://${window.location.hostname || '127.0.0.1'}:8080/ws
```

### Contrato del Evento JSON (`TelemetryMessage`)

```typescript
{
  "type": "io" | "command" | "alert" | "connection",
  "service": "ssh" | "ftp" | "http",
  "payload": string,         // Carácter o bloque de texto recibido
  "command"?: string,        // Comando completo interceptado
  "ip"?: string,             // Dirección IPv4/IPv6 del intruso
  "mac"?: string,            // Dirección MAC detectada (ej. 00:1A:2B:3C:4D:5E)
  "timestamp"?: string       // Marca temporal ISO o local
}
```

### Comportamiento Reactivo:
- **Respaldo con Mock Data:** Si el servidor Go no está activo o se desconecta temporalmente, la interfaz renderiza inmediatamente el conjunto forense completo de respaldo (evitando pantallas en blanco o desalineadas).
- **Reconexión Automática:** Si la conexión se interrumpe, el cliente reintenta la conexión de manera no invasiva cada 2 segundos.
- **Filtrado por Trampa:** Al alternar entre `SSH`, `FTP` y `HTTP` en el `TrapSelector`, el hook filtra el flujo de telemetría sin desconectar el WebSocket compartido.

---

## 4. Guía de Pruebas y Simulación de WebSocket

Tanto React como Postman actúan como **clientes WebSocket**. Para probar el flujo interactivo sin depender del backend Go en desarrollo, el proyecto incluye un servidor de prueba con retransmisión (*Broadcast*) en [mock-server.js](file:///c:/Users/darkf/OneDrive/Documentos/Software%20II/Proyecto-Software-II/frontend/mock-server.js).

### Paso 1: Iniciar el Servidor Mock
Abre una terminal en la raíz del frontend y ejecuta:
```bash
npm run mock
```
El servidor quedará a la espera de conexiones en `ws://127.0.0.1:8080/ws`.

### Paso 2: Conectar Postman y la Aplicación React
1. **Postman:** Abre Postman, selecciona **New > WebSocket Request**, ingresa `ws://127.0.0.1:8080/ws` y haz clic en **Connect**. La conexión permanecerá activa en verde.
2. **React:** En otra terminal corre `npm run dev` y abre `http://localhost:5173`. El punto junto a `OPERATOR_0X8F` se encenderá con pulso verde activo.

### Paso 3: Payloads JSON de Ejemplo para Probar

Pega cualquiera de los siguientes mensajes en el panel de envío de Postman y presiona **Send**:

#### A. Pulsación de Tecla Individual (`type: "io"`)
> **Efecto visual:** El carácter se escribe de inmediato en la **Terminal xterm.js**, se inserta una nueva fila en el **Inspector de Pulsaciones** calculando el Scancode y la diferencia delta (`Δ ms`), y se actualiza el contador de pulsaciones.

```json
{
  "type": "io",
  "service": "ssh",
  "payload": "l",
  "ip": "185.220.101.44",
  "mac": "00:1A:2B:3C:4D:5E"
}
```

#### B. Comando Ejecutado Completo (`type: "command"`)
> **Efecto visual:** Imprime en la consola de xterm.js una nueva línea con el prompt verde ejecutando el comando recibido.

```json
{
  "type": "command",
  "service": "ssh",
  "command": "cat /etc/shadow && whoami",
  "ip": "185.220.101.44"
}
```

#### C. Alerta Defensiva del Kernel / Sandbox (`type: "alert"`)
> **Efecto visual:** Imprime en la terminal una traza de alerta destacada en color rojo (`[ALERTA]: ...`).

```json
{
  "type": "alert",
  "service": "ssh",
  "payload": "Intento de escalamiento de privilegios evadido por jaula OverlayFS"
}
```

#### D. Nueva Conexión / Handshake de Intruso (`type: "connection"`)
> **Efecto visual:** Actualiza en caliente el valor de la tarjeta superior **IP Atacante** y la tarjeta **Huella de Red L2/L3 (Dirección MAC)**.

```json
{
  "type": "connection",
  "service": "ssh",
  "ip": "45.154.255.88",
  "mac": "0A:2F:B4:9C:11:EE"
}
```

## 5. Funcionalidades Pendientes / Roadmap Futuro

### 1. Acciones Defensor Front → Back
- **Inyección de Latencia Sintética:** Control deslizante interactivo en la barra del terminal para manipular el delay de eco al atacante (Tarpit progresivo).
- **Desconexión Forzada TCP (Sever Connection):** Botón de emergencia para enviar señal `TCP RST` y cerrar la sesión activa del intruso.
- **Modo Evasivo Sandbox:** Cambio en caliente de políticas de aislamiento de filesystem (Read-Only OverlayFS a Fake Root Trap).
- **Exportación de Sesión TTY (.cast):** Generación de grabaciones de sesión compatibles con formato asciinema descargables desde el frontend.

### 2. Métricas KPI en Tiempo Real
- **Streaming de Recursos de Hardware:** Ingesta por WebSocket de muestras periódicas de consumo de CPU por proceso, RAM de cgroup y paquetes de red procesados por segundo directamente desde el kernel Go.

### 3. stdout / Response Mirroring en xterm.js
- **Captura Bidireccional de Shell:** Canal duplex que transmita tanto los caracteres tecleados como la salida sintética devuelta por el subproceso pseudo-terminal emulado en Go.

---

## 6. Guía de Instalación y Ejecución

### Prerrequisitos
- **Node.js** v18.0.0 o superior (recomendado v20+ o v24+).
- **npm** v9+ o superior.

### Instalación de dependencias
```bash
npm install
```
*(Si usas un entorno con restricciones estrictas de peer dependencies, ejecuta `npm install --legacy-peer-deps`)*.

### Servidor de desarrollo
```bash
npm run dev
```
La aplicación estará accesible en: `http://localhost:5173`.

### Servidor de pruebas WebSocket (Mock Broadcast)
```bash
npm run mock
```
Inicia el servidor mock en `ws://127.0.0.1:8080/ws` para conectar Postman y probar telemetría interactiva.

### Compilación para producción
```bash
npm run build
```
Genera la carpeta optimizada `dist/` lista para ser servida por Nginx, Caddy o el propio servidor Go de AegisTrap.

### Previsualización del build de producción
```bash
npm run preview
```
