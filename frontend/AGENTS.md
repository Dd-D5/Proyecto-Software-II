# AGENTS.md — Frontend (`frontend/`)

## Mandatos y Reglas Fundamentales
- **UI Components:** Always use `shadcn/ui`. Never use native HTML inputs in isolation when a styled component exists.
- **Lenguaje y Stack:** Usar únicamente JavaScript (`.jsx`/`.js`, NO TypeScript). React 19.3.0 + Vite 8.3.0 + Tailwind CSS v3.4.17.

## Comandos del Desarrollador
- Servidor de Desarrollo: `npm run dev`
- Compilación Producción: `npm run build`
- Previsualización Build: `npm run preview`
- Servidor Mock: `npm run mock`

## Arquitectura y Convenciones de Código
- **Layout Shell:** `Sidebar.jsx` (dock 64px `w-16`), `TopBar.jsx` (`h-14` header con selector de pestañas).
- **Estado de Pestañas:** Navegación en `DashboardView.jsx` sin recarga de página ni desconexión del socket.
- **Conexión WebSocket:** Canal único global a `ws://${window.location.hostname}:8080/ws` (fallback `127.0.0.1:8080`).
- **Esquema de Mensajes Go:** `{ service: "ssh"|"ftp"|"http", type: "io"|"command"|"alert"|"connection"|"output", payload, ip, mac }`.
- **Cálculos en Cliente:** Timestamp, Scancode (`payload.charCodeAt(0)`), Delta ms y WPM se calculan en React (`KeystrokeInspector.jsx`).
