# 🛡️ AegisTrap SOC v2.0 - Honeypot & Active Defense Platform

Bienvenido a la documentación técnica oficial de la ramificación (**branch**) de desarrollo de **AegisTrap SOC v2.0**. Este documento compila las especificaciones de arquitectura, los mecanismos de seguridad activa, la lógica de cifrado/sanitización y el diseño de la integración Backend-Frontend implementados como propuesta para el equipo de desarrollo.

---

## 📋 Índice

1. [Resumen del Proyecto](#-resumen-del-proyecto)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Implementaciones Principales de la Ramificación](#-implementaciones-principales-de-la-ramificación)
4. [Seguridad Implementada y Mecanismos de Defensa](#-seguridad-implementada-y-mecanismos-de-defensa)
5. [Cifrado de Contraseñas y Protección de Datos Backend-Frontend](#-cifrado-de-contraseñas-y-protección-de-datos-backend-frontend)
6. [Honeypot FTP: Análisis de Funcionamiento y Limitaciones](#-honeypot-ftp-análisis-de-funcionamiento-y-limitaciones)
7. [Modo Desarrollador & Inyección de Pruebas](#-modo-desarrollador--inyección-de-pruebas)
8. [Instrucciones de Ejecución](#-instrucciones-de-ejecución)

---

## 🛡️ Resumen del Proyecto

**AegisTrap SOC** es una plataforma integral de **Honeypot Activo y Centro de Operaciones de Seguridad (SOC)** diseñada para la detección, intercepción, análisis heurístico y mitigación de ciberataques en tiempo real sobre servicios expuestos (**SSH, FTP y HTTP**). 

Su interfaz de usuario sigue un diseño visual **Neobrutalista Light Pastel** (`#FAF7F2`), enfocado en la legibilidad de telemetría de alta frecuencia (*Keystroke Inspection*, cadencia WPM, fingerprinting L2/L3 y mapas de calor geoespaciales).

---

## 🏗️ Arquitectura del Sistema

```
                     ┌──────────────────────────────────────────┐
                     │   Interfaz Web React (Frontend Vite)    │
                     │  - Neobrutalismo Light Pastel (#FAF7F2)  │
                     │  - Xterm.js Console Engine               │
                     │  - Keystroke & Telemetry Inspector       │
                     └────────────────────┬─────────────────────┘
                                          │
                                WebSocket / REST API (/ws & /api)
                                          │
                     ┌────────────────────▼─────────────────────┐
                     │     Backend Concurrente en Go (1.20+)    │
                     │  - Gorilla WebSockets & HTTP API Server │
                     │  - Dynamic Honeypot Manager              │
                     │  - DNS/IP Ban Manager (sessions.json)    │
                     └──────┬─────────────┬─────────────┬───────┘
                            │             │             │
                    ┌───────▼──────┐┌─────▼──────┐┌─────▼──────┐
                    │ Honeypot SSH ││Honeypot FTP││Honeypot HTTP│
                    │ Puerto :2222 ││Puerto :2121││Puerto :8081 │
                    └──────────────┘└────────────┘└─────────────┘
```

---

## 🚀 Implementaciones Principales de la Ramificación

1. **Gestor Dinámico de Honeypots & Canales**:
   - Monitoreo concurrente de 3 servicios tramposos principales: **SSH (:2222)**, **FTP (:2121)** y **HTTP (:8081)**.
   - Habilidad para crear, alternar y destruir honeypots adicionales dinámicamente mediante la API REST (`/api/honeypots`).

2. **Detección Dinámica de IP & Geolocalización**:
   - Mapeo automático de direcciones IP locales (`127.0.0.1`, `::1`, subredes `192.168.x.x`, `10.x.x.x`) como *Red Local / LAN*.
   - Integración con API de geolocalización IP para identificar país, ciudad e ISP del atacante cuando la IP sea pública.

3. **Sistema de Baneo de DNS e IP**:
   - Registro automático de intrusos maliciosos en `banned_list.json`.
   - Bloqueo instantáneo a nivel de capa TCP/HTTP para cualquier IP baneada.

4. **Clonación del Honeypot HTTP (:8081)**:
   - Réplica idéntica de la interfaz de Login de AegisTrap SOC para engañar a escáneres y atacantes web.
   - Conteo de intentos de autenticación: tras **3 intentos fallidos** o un intento de inyección SQL (`' OR '1'='1`), se aplica baneo automático de la IP y se despliega la pantalla **403 FORBIDDEN / BANNED DNS**.

5. **Inspector Tecla a Tecla (Keystroke Inspector)**:
   - Captura de pulsaciones TTY en milisegundos (`timestamp`, `event`, `key`, `scancode`, `delta Δ ms`).
   - Cálculo heurístico de automatización (detección de bots, copy-paste y macros de tecleo).

---

## 🔒 Seguridad Implementada y Mecanismos de Defensa

### 1. Sanitización Anti-Inyección (`SanitizeInput`)
Todas las entradas de usuario (formularios de login, parámetros URL, nombres de honeypots, motivos de baneo) pasan por el limpiador en Go antes de ser procesadas:
- **Neutralización SQLi**: Inactivación de palabras clave sospechosas (`UNION SELECT`, `INSERT INTO`, `DELETE FROM`, `DROP TABLE`, `' OR '1'='1`).
- **Neutralización XSS**: Remoción de etiquetas `<script>`, secuencias `javascript:`, `onload=` y `onerror=`.
- **Limpieza de Caracteres de Control**: Eliminación de bytes nulos (`\x00`) para prevenir desbordamientos de búfer en wrappers de sistema.

### 2. Detección Activa de Comandos de Alto Riesgo y Desconexión Inmediata
El sistema mantiene listas de firmas críticas en tiempo real:
- **SSH (`sensitivePatterns`)**: Captura de Bash Bombs (`:(){ :|:& };:`), borrados masivos (`rm -rf /`), escaladas de privilegios (`sudo pacman`, `sudo apt`, `su root`) y ejecuciones destructivas (`mkfifo`, `dd`, reverse shells).
- **FTP (`ftpHighRiskPatterns`)**: Subida de código malicioso (`ransomware`, `payload`, `.sh`, `.exe`, `chmod`, `wget`, `curl`).

> **Acción Automática**: Al detectarse una firma de alto riesgo, el honeypot emite una alerta roja en la consola SOC, añade la IP al gestor de baneos y **cierra inmediatamente la conexión socket (`conn.Close()`)**, cortando de raíz cualquier intento de exfiltración.

---

## 🔑 Cifrado de Contraseñas y Protección de Datos Backend-Frontend

### 1. Cifrado de Contraseñas de Administración
- La contraseña del panel (`AEGIS_ADMIN_PASSWORD` o por defecto `admin123`) es almacenada exclusivamente como un **Hash seguro Bcrypt** (`golang.org/x/crypto/bcrypt`) generado con costo por defecto.
- En ningún punto de la memoria o base de datos se almacena la contraseña en texto plano.
- La verificación se realiza mediante comparación segura de tiempo constante (`bcrypt.CompareHashAndPassword`) para mitigar ataques de temporización (*timing attacks*).

### 2. Autenticación y Persistencia de Sesiones Backend-Frontend
- Al autenticarse correctamente en `/api/login`, el backend genera un **Token Criptográfico Aleatorio de 32 bytes** en formato hexadecimal.
- **Persistencia de Sesiones (`sessions.json`)**: Los tokens generados se almacenan de forma persistente en `sessions.json`. Esto garantiza que si el servidor Go se reinicia o recompila, **las sesiones activas del panel no se invalidan**, evitando errores de `Token inválido` en WebSockets.
- En la interfaz web, el token se guarda en `localStorage` bajo la clave `aegis_token` y se envía en los encabezados `Authorization: Bearer <token>` de la API REST y en los parámetros del canal WebSocket (`/ws?token=<token>`).
- En caso de que el token sea revocado o expire, el frontend detecta la respuesta HTTP `401 Unauthorized` o el cierre de socket, limpia el token y redirige automáticamente al usuario a la pantalla de Login.

---

## 📟 Honeypot FTP: Análisis de Funcionamiento y Limitaciones

### 1. Diferencia Técnica entre Canales SSH y FTP
| Característica | Honeypot SSH (PTY Terminal) | Honeypot FTP (TCP Socket) |
| :--- | :--- | :--- |
| **Modo de Conexión** | Pseudo-terminal crudo bidireccional (`/dev/pty`) | Socket TCP orientado a línea de comandos |
| **Manejo de Caracteres** | El cliente SSH envía cada byte inmediatamente al presionar la tecla. | El cliente FTP local acumula la entrada hasta que el usuario presiona Enter (`\r\n`). |
| **Echo de Caracteres** | El servidor SSH retorna cada carácter recibido para dibujarlo en la terminal. | El cliente FTP maneja el buffer localmente y solo envía el comando completo al servidor. |

### 2. Solución y Emulación Implementada en AegisTrap
Para garantizar que la terminal de FTP en la interfaz SOC se comporte con la misma fluidez y realismo que SSH:
- **Streaming de Telemetría**: Cuando el backend de FTP recibe el paquete TCP con la línea de comando (ej: `USER admin` o `STOR ransomware_payload.sh`), fragmenta los datos e emite los eventos `io` carácter por carácter hacia WebSockets.
- **Respuestas de Protocolo (`output`)**: Cada respuesta oficial de vsFTPd 3.0.3 (`220`, `331`, `230`, `150`, `226`, `250`, `221`) es emitida al canal WebSocket como un evento de tipo `output`, logrando que la consola **xterm.js** muestre en tiempo real tanto lo que escribe el atacante como las respuestas del honeypot.
- **Soporte de Suite FTP**: Se implementaron los verbos estándar `USER`, `PASS`, `SYST`, `PWD`, `CWD`, `TYPE`, `PASV`, `PORT`, `LIST`, `STOR`, `RETR`, `DELE`, `MKD`, `FEAT`, `OPTS` y `QUIT`.

---

## 🎮 Modo Desarrollador & Inyección de Pruebas

Para validar el comportamiento del SOC sin requerir herramientas externas de penetración:

1. **Desbloqueo de Modo Desarrollador**:
   - Hacer clic **5 veces** consecutivas en el icono de Escudo AegisTrap.
   - Ingresar el **Código Konami** en el teclado: `W, W, S, S, A, D, A, D, B, A`.

2. **Simulación de Ataques en Vivo**:
   - Una vez activado el banner de Modo Desarrollador, la API expone el endpoint `/api/dev/simulate-attack`.
   - Permite disparar pruebas sintéticas agresivas para **SSH (Bash Bomb)**, **FTP (Credential Spray & Ransomware Upload)** y **HTTP (Bot Scan & SQLi)**.
   - La telemetría se transmite en vivo por WebSockets, actualizando instantáneamente la consola terminal, el *Keystroke Inspector*, los contadores TTY y las alertas de baneo.

---

## 🛠️ Instrucciones de Ejecución

### Requisitos Previos
- **Go**: 1.20 o superior
- **Node.js**: v18.0 o superior (con npm)

### 1. Iniciar Backend (Go)
```bash
cd backend
go build -o aegistrap_backend .
./aegistrap_backend
```
*El servidor backend escuchará en `http://localhost:8080` (API & WS), `8081` (Honeypot HTTP), `2121` (Honeypot FTP) y `2222` (Honeypot SSH).*

### 2. Iniciar Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
*Acceder desde el navegador a `http://localhost:5173`. Ingresar la contraseña por defecto `admin123`.*

---

*Documento redactado para el equipo de desarrollo de Proyecto Software II - AegisTrap SOC v2.0.*
