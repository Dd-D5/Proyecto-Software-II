# Catálogo de Comandos Maliciosos — RCE del Honeypot SSH

Contramedidas del fake shell ante comandos del atacante. El RCE ejecuta sobre
`backend/decoy_home/` (señuelo real en disco, mostrado como `/home/developer`),
con `cd` enjaulado (rutas externas → redirect a la raíz del señuelo) y permisos
de kernel: **leer/editar sí, crear no** (dirs `0555`, archivos `0644`).

Semántica de strike: el catálogo **NUNCA llega al exec real** (ni en strike 1).
Strike 1 → alerta silenciosa al SOC; strike 2 → ban de IP + caída de conexión.

## Escalada y destrucción (SIMULAR + STRIKE)

| Comando | Función | Efecto buscado | Simulación |
|---|---|---|---|
| `sudo <cmd>` | Escalada de privilegios | Ejecutar como root | El comando interno sigue el mismo flujo (gate incluido) — persona root: sudo es transparente |
| `su` | Cambio a root | Convertirse en root | `su: Authentication failure` |
| `rm` | Destrucción de archivos | Borrar el sistema | `rm: cannot remove 'X': Permission denied` (idéntico al comportamiento real de los dirs 0555) |
| `dd of=/dev/sda` | Wipe de disco | Destrucción total | `dd: failed to open '/dev/sda': Permission denied` |
| `:(){ :\|:& };:` | Fork bomb (DoS) | Colgar el host | `fork: retry: No child processes` + subida de CPU 8s (controlada) |
| `chmod`/`chown` | Permisos amplios | Persistencia/defacement | Éxito silencioso (sensación de chmod real) |
| `passwd`, `useradd` | Backdoor de usuarios | Acceso durable | `Authentication token manipulation error` / `Permission denied` |

## Persistencia (SIMULAR + STRIKE)

| Comando | Función | Simulación |
|---|---|---|
| `crontab -e/-r` | Cron persistente | `crontab: installing new crontab` (éxito falso) |
| `crontab -l` | Revisión | `no crontab for root` |
| `systemctl`/`service` | Servicio persistente | `System has not been booted with systemd...` |
| `apt`/`yum`/`pacman`/`apk` | Instalación de herramientas | `E: Could not open lock file /var/lib/dpkg/lock-frontend` |
| `iptables` | Apertura de firewall | `Fatal: can't open lock file /run/xtables.lock: Permission denied` |
| `mkfifo` | Canal de reverse shell | `mkfifo: cannot create fifo 'X': Permission denied` |

## Exfiltración y C2 (SIMULAR + STRIKE + IOC)

| Comando | Función | Simulación | IOC registrado |
|---|---|---|---|
| `wget`/`curl URL` | Descarga de payload | `curl: (6) Could not resolve host: X` | URL solicitada → alerta `IOC: descarga de payload` |
| `nc`/`ncat` | Reverse shell / bind shell | `nc: Permission denied` | — |
| `bash -c`/`sh -c` | Ejecución de scripts | El contenido sigue el mismo gate | — |
| `python`/`perl`/`ruby -c/-e` | Payloads scriptados | Silencio (output vacío plausible) | — |
| `ssh usuario@host` | Movimiento lateral | `ssh: connect to host X port 22: Connection refused` | Destino → alerta `IOC: movimiento lateral` |

## Recon (SIMULAR)

| Comando | Simulación |
|---|---|
| `nmap`/`masscan` | Tabla de puertos plausible (2222 ssh, 8081 http, 2121 ftp) |
| `netstat`/`ss` | Tabla LISTEN con los honeypots |
| `whoami`/`id`/`uname`/`hostname`/`uptime`/`env`/`echo $VAR` | Respuestas fijas de la persona `root@<banner>` (el exec real filtraría el host verdadero) |
| `history` | Contenido del `.bash_history` señuelo |
| `cat .ssh/id_rsa`, `cat .env`, etc. | **Sin interceptar — el atacante lee los honeytokens del señuelo** (credenciales falsas; recolección pasiva = intel) |

## Fallback

Cualquier comando fuera del catálogo (`ls`, `cat`, `grep`, `find`, `less`…)
ejecuta **real** sobre el señuelo con `cmd.Dir = cwd` de la sesión. El kernel
aplica la política "leer/editar sí, crear no" — cero código de simulación de
errores, los "Permission denied" son auténticos.

## Techos conocidos (`ponytail:` en el código)

- Lecturas con **ruta absoluta fuera del señuelo** (`cat /etc/passwd`) siguen reales.
- `$PWD`/`getcwd` filtran la ruta real del daemon (bash setea PWD por su cuenta).
- Sesiones comparten el señuelo: las ediciones de un atacante las ve otro; se
  restauran con `git checkout backend/decoy_home` o reinicio (re-chmod).
- `sed -i` falla (crea temp en dir 0555) — consistente con la persona sin permisos de creación.
