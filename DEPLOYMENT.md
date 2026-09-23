# 🛡️ Guía de Despliegue y Pruebas - AegisTrap Honeypot Framework

Bienvenido al sistema **AegisTrap**, una plataforma interactiva de Honeypots de alta fidelidad con monitoreo en tiempo real, detección de intrusiones L2/L3, GeoIP con rastreo GPS real y simulación de ataques.

---

## 🚀 OPCIÓN 1: Despliegue Automático (Recomendado)

En la raíz del proyecto ejecuta el script unificado:

```bash
chmod +x start.sh
./start.sh
```

El script verificará las dependencias (Go y Node.js), compilará el backend de trampas, instalará los módulos del frontend si es necesario y levantará los servicios concurrentemente.

- **Panel de Control Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Credenciales de Acceso al Panel**:
  - **Usuario**: `admin`
  - **Contraseña**: `admin123`

---

## 🐳 OPCIÓN 2: Despliegue con Docker / Docker Compose

Si prefieres ejecutar el proyecto mediante contenedores aislados:

```bash
docker compose up --build
```

Esto compilará la imagen de AegisTrap en multi-etapa y expondrá los siguientes puertos en tu máquina:
- `:5173` - Dashboard React
- `:8080` - Servidor WebSocket de Telemetría y Control
- `:8081` - Trap HTTP (Fake AegisTrap Login & Decoy Malware)
- `:2121` - Trap FTP (Streaming de comandos e E/S en vivo)
- `:2222` - Trap SSH (Emulación Ubuntu 22.04 LTS en tiempo real)

---

## 🛠️ OPCIÓN 3: Despliegue Manual por Consolas

### 1. Iniciar Backend (Go)
```bash
cd backend
go run main.go ssh_server.go ftp_server.go http_server.go system_stats.go
```

### 2. Iniciar Frontend (React + Vite)
En otra terminal:
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 GUÍA DE PRUEBA DE ATAQUES (Simulación de Intrusiones 100% Real)

Para validar el funcionamiento del sistema y la detección de intrusiones en el Dashboard:

### 1. 🔑 Prueba de Trampa SSH (Puerto 2222)
Abre una terminal y conéctate al servidor SSH de trampa:
```bash
ssh admin@localhost -p 2222
```
* **Contraseña**: Ingresa cualquier contraseña (ej. `admin123` o `123456`).
* **Prueba de comandos**:
  - Escribe `ls`, `cd /var/www`, `cat /etc/passwd`.
  - Prueba comandos sensibles: `sudo su`, `nmap 192.168.1.1`, `chmod 777 /etc/shadow`.
  - **Resultado en Dashboard**: Verás la terminal xterm reflejar la consola SSH en tiempo real, emisión de alerta de brecha roja y registro en el Radar.

---

### 2. 📁 Prueba de Trampa FTP (Puerto 2121)
Abre una terminal y conéctate al servidor FTP de trampa:
```bash
ftp localhost 2121
```
o mediante `nc` / `telnet`:
```bash
nc localhost 2121
```
* **Flujo FTP**:
  - `USER admin`
  - `PASS 123456`
  - `PWD`
  - `LIST`
  - `PASV`
  - `RETR secret_keys.txt`
  - `QUIT`
* **Resultado en Dashboard**: Selecciona la trampa **FTP** en el selector superior o en el lateral. Verás las teclas y respuestas del protocolo FTP (`ftp> USER admin`, `331 Password required...`) reflejarse en vivo en la consola xterm, disparando el evento de brecha y acumulando el contador de ataques.

---

### 3. 🌐 Prueba de Trampa HTTP (Puerto 8081)
Abre tu navegador e ingresa a:
[http://localhost:8081](http://localhost:8081)

1. Verás una réplica exacta del **Login Oficial de AegisTrap**.
2. Ingresa un usuario y contraseña falsos (ej. `hacker` / `pwned`) y presiona **ENTRAR AL SISTEMA**.
3. **Resultado**: Se activará la pantalla de simulación con el efecto **"YOU ARE AN IDIOT! ☺ ☺ ☺"**, sonido de alerta `/mp3/fakehttp.mp3` y en el Dashboard de AegisTrap se notificará inmediatamente la intrusión HTTP con la IP y ubicación GeoIP/GPS del atacante.

---

## 📍 Rastreo GeoIP y Ubicación GPS Real
El sistema realiza la resolución de IP pública y coordenadas GPS reales mediante `http://ip-api.com/json/`.
- En el panel de **Live Terminal**, la tarjeta **Huella de Red (NIC & MAC)** muestra la latitud/longitud exactas y proporciona un enlace directo: **`📍 [Google Maps]`**.
