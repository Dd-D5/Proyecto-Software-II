Aquí tienes el contenido estructurado y formateado en Markdown para tu archivo `README.md`. Puedes copiar todo este bloque y guardarlo directamente como `README.md` dentro de la carpeta `backend` en tu repositorio.

```markdown
# 🕸️ Orquestador y Honeypot de Trampas Activas (Backend)

Este módulo contiene el núcleo del sistema de *Deception Technology*. Está desarrollado íntegramente en **Go (Golang)** y su función principal es levantar servicios señuelo (Honeypots) en la red local, interceptar los ataques, emular respuestas realistas de un sistema operativo, y transmitir toda la telemetría recolectada en tiempo real hacia el panel de control (Frontend) mediante WebSockets.

## 🚀 Arquitectura y Servicios

El backend levanta de forma concurrente cuatro demonios (hilos) que operan en los siguientes puertos no privilegiados para evitar bloqueos del sistema anfitrión:

| Servicio | Puerto | Descripción y Comportamiento |
| :--- | :--- | :--- |
| **WebSocket** | `8080` | Canal de comunicación bidireccional y en tiempo real con el Dashboard en React. |
| **SSH** | `2222` | Emulador de terminal (Fake Shell). Acepta cualquier credencial, simula respuestas básicas de Bash y detecta comandos críticos. |
| **FTP** | `2121` | Emula un servidor `vsFTPd 3.0.3`. Registra intentos de login y comandos de exploración de directorios (`SYST`, `PWD`, `QUIT`). |
| **HTTP** | `8081` | Emula un servidor web Apache genérico. Registra escaneos de vulnerabilidades, rutas solicitadas y el *User-Agent* del atacante. |

---

## 🛠️ Requisitos e Instalación

Dado que el orquestador lee la tabla ARP del kernel para extraer la huella física (MAC) del atacante y utiliza *raw sockets*, **debe ejecutarse obligatoriamente en un entorno Linux nativo o WSL**.

### 1. Compilación
Descarga las dependencias y compila el demonio:
```bash
go mod tidy
go build -o honeypot-daemon

```

### 2. Permisos del Kernel (Importante)

Para que el binario pueda escuchar en interfaces de red y capturar tráfico sin necesidad de ejecutarse completamente como `root`, asiga las siguientes *capabilities*:

```bash
sudo setcap 'cap_net_raw,cap_net_bind_service=+ep' ./honeypot-daemon

```

### 3. Ejecución

```bash
./honeypot-daemon

```

*Nota: Al ejecutarse por primera vez, el sistema generará y guardará de forma persistente una llave `honeypot_rsa` para el servicio SSH, evitando bloqueos por "Man-in-the-Middle" en los clientes atacantes.*

---

## 📡 Contrato de Telemetría (Guía para el Frontend)

Toda la comunicación con el panel de React se realiza a través de WebSockets. El Frontend debe conectarse dinámicamente a la IP del servidor en el puerto `8080`:

```javascript
const ws = new WebSocket(`ws://${window.location.hostname}:8080/ws`);

```

### Estructura de Datos (JSON)

Cada interacción del atacante con cualquier trampa emitirá un objeto JSON estandarizado con la siguiente estructura:

```json
{
  "service": "ssh",
  "type": "command",
  "payload": "sudo pacman -Syu",
  "ip": "192.168.1.50",
  "mac": "a1:b2:c3:d4:e5"
}

```

### Diccionario de Datos

* **`service`**: Identifica el origen de la trampa. Valores posibles: `"ssh"`, `"ftp"`, `"http"`, o IDs dinámicos (`"ssh:2222"`, `"ftp:2121"`, `"http:8081"`) de honeypots desplegados vía `/api/honeypots`.
* **`ip`**: Dirección IPv4 origen del intruso.
* **`mac`**: Dirección MAC física interceptada desde la tabla ARP (preparación para el clonado y contención).
* **`type`**: Clasifica el nivel del evento. Define cómo el Frontend debe renderizar el `payload`:
* `"io"`: *Keystrokes* en bruto (letras individuales y retrocesos). **Exclusivo de SSH**. Debe pasarse directamente al emulador visual (ej. `xterm.js`).
* `"command"`: Línea de comando completada (ej. `GET /admin` en HTTP, o `whoami` en SSH). Ideal para tablas de registro e historiales.
* `"alert"`: El atacante ejecutó un comando de alto nivel de privilegios (ej. `rm`, `sudo`, `wget`). Ideal para disparar notificaciones rojas (Toasts) en la UI.
* `"connection"`: Notifica que un nuevo intruso estableció un handshake con una de las trampas. Incrementa el contador global de ataques y el mapa `connections` por tipo de servicio.
* `"connection_end"`: Notifica que el intruso cerró la sesión (SSH/FTP). El Frontend debe apagar el indicador de intrusión para ese servicio.

### Telemetría del sistema (`system_stats`)

Un mensaje con forma distinta (NO usa `service`/`payload`) se emite **cada 1s** directo al canal:

```json
{
  "type": "system_stats",
  "cpu_percent": 12.5,
  "ram_used_mb": 1480.2,
  "ram_total_mb": 8012.0,
  "uptime_seconds": 3600,
  "total_attacks": 42,
  "server_mac": "a1:b2:c3:d4:e5:f6",
  "nic": "eth0",
  "connections": { "ssh": 5, "ftp": 3, "http": 34 }
}
```

* `total_attacks`: contador global persistido — se inicializa al arrancar contando bloques `[ATTACK]` de `attack_history.txt`.
* `connections`: conexiones acumuladas por tipo base (`ssh`/`ftp`/`http`); los IDs dinámicos (`ssh:2222`, `default-ssh`) cuentan en su tipo base.
* `cpu_percent` es el consumo de CPU del **proceso honeypot** (delta de `utime+stime` de `/proc/self/stat`, ventana de 1s, resolución ~1%); `ram_used_mb` es su RSS (`VmRSS`). `ram_total_mb` es la memoria total **del sistema** (`/proc/meminfo`), para que el Frontend calcule el % que ocupa el proceso.
* No se registra en `attack_history.txt` (sample periódico, no evidencia de ataque).

---

## 🔐 API REST v2 (Auth, Baneos y Honeypots Dinámicos)

El servidor WebSocket (`:8080`) también expone endpoints REST. Los protegidos requieren `Authorization: Bearer <token>` obtenido en el login.

| Endpoint | Método | Descripción |
| :--- | :--- | :--- |
| `/api/login` | POST | `{"password": "..."}` → `{"token": "..."}`. Bcrypt; password por env `AEGIS_ADMIN_PASSWORD` (default `admin123`). |
| `/api/bans` | GET/POST/DELETE | Gestión de baneos DNS/IP (persistidos en `banned_list.json`). Los IPs baneadas reciben una página de bloqueo en HTTP y rechazo en SSH/FTP. |
| `/api/honeypots` | GET/POST/DELETE | CRUD de honeypots dinámicos (name, type, port, banner). `POST /api/honeypots/:id/toggle` alterna running/stopped. |
| `/ws?token=<token>` | WS | El WebSocket valida el token; sin token o token inválido la conexión se rechaza. |

---

## 🧪 Comandos para Pruebas (Red Teaming local)

Para verificar el funcionamiento del backend, puedes simular ataques desde otra pestaña o equipo en la misma LAN utilizando los siguientes comandos:

**Prueba SSH:**

```bash
ssh root@localhost -p 2222
# Prueba ejecutar: ls, whoami, cd, wget, clear

```

**Prueba FTP:**

```bash
ftp localhost 2121
# Prueba ejecutar: USER admin, PASS 1234, SYST, PWD, QUIT

```

**Prueba HTTP:**

```bash
curl http://localhost:8081/admin
# O simplemente abre la ruta en el navegador web.

```

---

*Módulo desarrollado para el proyecto de Orquestador y Honeypot de Trampas Activas.*

```

Este README proporciona una excelente documentación inicial para cualquier integrante del equipo o profesor que revise el repositorio. Resume el esfuerzo técnico que logramos con la concurrencia, explica la base de la seguridad del RSA y documenta de forma estricta cómo React debe consumir los datos.

```