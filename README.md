# 🛡️ AegisTrap SOC v2.0 - Honeypot & Active Defense Platform

Bienvenido a la documentación técnica oficial de la rama **`feat/cambio-ui-metricas`** de **AegisTrap SOC v2.0**. 

Este documento compila las especificaciones de arquitectura, los nuevos módulos implementados (**SSH Sandbox Nativo en Go**, **Memory Dump Forense**, **Honeypot HTTP CentroTelas E-Commerce con BLOMI UI** y la **Regla del 2º Ataque Sigiloso**), así como la guía completa de comandos para probar los vectores de ataque.

---

## 📋 Índice

1. [Resumen del Proyecto](#-resumen-del-proyecto)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Novedades en esta Rama (`feat/cambio-ui-metricas`)](#-novedades-en-esta-rama-featcambio-ui-metricas)
4. [Guía Rápida de Pruebas & Comandos para el Equipo](#-guía-rápida-de-pruebas--comandos-para-el-equipo)
5. [Seguridad Implementada y Mecanismos de Defensa](#-seguridad-implementada-y-mecanismos-de-defensa)
6. [Instrucciones de Compilación y Ejecución](#-instrucciones-de-compilación-y-ejecución)

---

## 🛡️ Resumen del Proyecto

**AegisTrap SOC** es una plataforma integral de **Honeypot Activo y Centro de Operaciones de Seguridad (SOC)** diseñada para la detección, intercepción, análisis heurístico y mitigación de ciberataques en tiempo real sobre servicios expuestos (**SSH, FTP y HTTP**).

---

## 🏗️ Arquitectura del Sistema

```
                     ┌──────────────────────────────────────────┐
                     │   Interfaz Web React (Frontend Vite)    │
                     │  - Sistema de diseño Supabase / BLOMI UI │
                     │  - Xterm.js Console Engine (Copiar/Pegar)│
                     │  - Desplegable Trampas Admin (N) ▾       │
                     └────────────────────┬─────────────────────┘
                                          │
                                WebSocket / REST API (:8085)
                                          │
                     ┌────────────────────▼─────────────────────┐
                     │     Backend Concurrente en Go (1.20+)    │
                     │  - Gorilla WebSockets & REST API Server  │
                     │  - Dynamic Honeypot Manager              │
                     │  - Memory Dump Forensic Generator        │
                     │  - DNS/IP Ban Manager (sessions.json)    │
                     └──────┬─────────────┬─────────────┬───────┘
                            │             │             │
                    ┌───────▼──────┐┌─────▼──────┐┌─────▼──────┐
                    │ Honeypot SSH ││Honeypot FTP││Honeypot HTTP│
                    │ Sandbox Go   ││  vsFTPd    ││ CentroTelas │
                    │ Puerto :2222 ││Puerto :2121││Puerto :8081 │
                    └──────────────┘└────────────┘└─────────────┘
```

---

## 🚀 Novedades en esta Rama (`feat/cambio-ui-metricas`)

### 1. 🐚 SSH Sandbox Nativo en Go (`:2222`)
- **100% Go Nativo (Sin Docker)**: Ejecución real de subprocesos aislados (`os/exec.CommandContext`) con tiempo límite de 10 segundos y búfer controlado de 8KB.
- **Simulación Realista de Fork Bombs**: Intercepción de `:(){ :|:& };:` con respuesta nativa de agotamiento de tabla de procesos Linux (`bash: fork: retry: No child processes`) y workers en Go para reflejar consumo real de CPU y RAM en las gráficas de telemetría.
- **Regla del 2º Ataque Sigiloso (Modo Engaño)**:
  - **Strike 1**: El atacante ejecuta su comando normalmente. El Administrador recibe la alerta `⚠️ [ADVERTENCIA 1/2]` en el SOC. El atacante **NO** ve mensajes de advertencia para no revelar que está en un honeypot.
  - **Strike 2**: Reincidencia crítica. La IP se registra automáticamente en la lista negra (`globalBanManager`), emite `⛔ [BANEO 2/2]` al SOC y desconecta la sesión SSH.

### 2. 🔍 Volcado Forense de Memoria (Memory Dump)
- Endpoint `/api/dump?service=ssh:2222` genera y descarga archivos reales `.dmp` con:
  - Mapa de memoria virtual del proceso y heap cgroup v2.
  - PIDs y número de Goroutines activas.
  - Tabla de contención TCP netstat.
- Botón **Dump Memoria** integrado directamente en la consola Live Terminal del Dashboard.

### 3. 🛍️ Honeypot HTTP CentroTelas E-Commerce (`:8081`)
- **Recreación Visual BLOMI UI**: Interfaz moderna de ventas de telas y textiles de alta gama (lino, seda de mora, algodón Egipto, encaje torchón, denim jean) con paleta verde menta (`#eefbe8`), badges promocionales `30% OFF`, cápsulas de navegación y tarjetas flotantes.
- **Motor de Intercepción de Ataques**:
  - **SQL Injection (SQLi)**: Detecta `' OR '1'='1`, `UNION SELECT`, `DROP TABLE` en el buscador (`/search`) y login staff (`/admin`).
  - **Subida de Malware & Ransomware**: Filtra extensiones peligrosas (`.sh`, `.php`, `.exe`, `.py`, `.bat`) y patrones maliciosos (`eval`, `system`, `base64_decode`, `encrypt_files`) en el portal de fichas técnicas (`/upload`).
  - **Strike 1 (Engaño)**: Devuelve una respuesta `200 OK` señuelo al atacante ("Búsqueda procesada" / "Archivo cargado exitosamente") y alerta al SOC.
  - **Strike 2 (Auto-Baneo)**: Bloquea el acceso y despliega la plantilla `403 FORBIDDEN / IP BANEADA`.

### 4. 🎛️ Desplegable "Trampas Admin (N) ▾"
- Desplegable rápido en la barra de navegación del Dashboard para encender, pausar, inspeccionar o eliminar honeypots dinámicos de forma instantánea.

### 5. ⌨️ Corrección de Copiar / Pegar en Terminal Live
- Eventos de teclado en `TerminalFrame.jsx` optimizados con soporte `Ctrl+C` y `Ctrl+V` sin distorsión de prompt ni caracteres duplicados.

---

## 🎮 Guía Rápida de Pruebas & Comandos para el Equipo

Para probar los vectores de ataque y comprobar la respuesta del SOC en vivo:

### 1. 🐚 Prueba del SSH Sandbox & Fork Bomb (`:2222`)

```bash
# Conectarse al SSH Honeypot (Usuario y clave cualquiera)
ssh root@localhost -p 2222

# --- Strike 1 (Comando de Alto Riesgo - Engaño Sigiloso) ---
root@ubuntu:~# sudo rm -rf /
# (El comando se ejecuta en el Sandbox y el SOC recibe ⚠️ [ADVERTENCIA 1/2])

# --- Strike 2 (Fork Bomb - Auto-Baneo) ---
root@ubuntu:~# :(){ :|:& };:
# (Retorna: bash: fork: retry: No child processes, el SOC recibe ⛔ [BANEO 2/2] y se cierra el socket)
```

### 2. 🛍️ Prueba del HTTP Honeypot CentroTelas (`:8081`)

```bash
# Abrir la tienda en el navegador
http://localhost:8081/

# --- Strike 1 (Inyección SQL en Buscador) ---
curl -s -i "http://localhost:8081/search?q='%20OR%20'1'='1"
# (Atacante recibe 200 OK con respuesta señuelo; SOC recibe ⚠️ [ADVERTENCIA 1/2] SQL INJECTION)

# --- Strike 2 (Subida de Script Ransomware / Malware) ---
curl -s -i -F "payload_file=@/dev/null;filename=patron_ransomware.sh" http://localhost:8081/upload
# (Atacante recibe HTTP 403 Forbidden - IP BANEADA; SOC recibe ⛔ [BANEO 2/2] MALWARE UPLOAD)
```

### 3. 🔍 Prueba del Volcado Forense de Memoria (Memory Dump)

```bash
# Vía cURL o desde el botón "Dump Memoria" en la web
curl -i "http://localhost:8085/api/dump?service=ssh:2222" -o memoria.dmp
```

### 4. 🔓 Comando de Desbaneo Rápido de Localhost (Para continuar pruebas)

Si auto-baneaste tu IP local durante las pruebas, ejecuta este comando para restaurar el acceso:

```bash
TOKEN=$(curl -s -X POST http://localhost:8085/api/login -H "Content-Type: application/json" -d '{"password":"admin123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)
curl -X DELETE "http://localhost:8085/api/bans?target=::1" -H "Authorization: Bearer $TOKEN"
curl -X DELETE "http://localhost:8085/api/bans?target=127.0.0.1" -H "Authorization: Bearer $TOKEN"
```

---

## 🔒 Seguridad Implementada y Mecanismos de Defensa

### 1. Sanitización Anti-Inyección (`SanitizeInput`)
Todas las entradas pasan por la función de sanitización en Go antes de ser procesadas:
- Neutralización de patrones SQLi (`UNION SELECT`, `DROP TABLE`, `' OR '1'='1`).
- Neutralización de secuencias XSS (`<script>`, `javascript:`, `onerror=`).
- Eliminación de caracteres nulos (`\x00`).

### 2. Persistencia de Sesiones (`sessions.json`)
Los tokens de autenticación se persisten en `sessions.json`, garantizando que reinicios del servidor Go no cierren la sesión activa en el panel React.

---

## 🛠️ Instrucciones de Compilación y Ejecución

### Requisitos
- **Go**: 1.20 o superior
- **Node.js**: v18.0 o superior (con npm)

### 1. Iniciar Backend (Go)
```bash
cd backend
go build -o aegistrap_backend .
./aegistrap_backend
```
*Puertos escuchando: `8085` (API & WS), `8081` (HTTP CentroTelas), `2222` (SSH Sandbox), `2121` (FTP).*

### 2. Iniciar Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
*Acceder desde el navegador a `http://localhost:5173` (Contraseña por defecto: `admin123`).*

---

*Documento redactado para el equipo de desarrollo de Proyecto Software II — AegisTrap SOC v2.0.*
