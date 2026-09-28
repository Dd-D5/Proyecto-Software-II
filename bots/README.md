# Simuladores de intrusión (bots/)

Atacan los honeypots directamente (puertos default: SSH 2222, FTP 2121, HTTP 8081)
para calibrar/verificar el detector HUMANO/BOT del backend.

## Setup

```
pip install paramiko   # solo para bot_ssh.py; los otros dos son stdlib puros
```

## Uso

```
python bots/bot_ssh.py --human        # cadencia humana de contraste
python bots/bot_ssh.py                # cadencia metronómica → veredicto BOT
python bots/bot_ftp.py --port 2122
python bots/bot_http.py
```

CLI común: `--host --port --delay [--human]` (host default `localhost`).
**Windows + WSL2**: usá `localhost`, no `127.0.0.1` — el relay de WSL registra
los puertos en `::1`. Esperado: sin `--human` el
Inspector de Pulsaciones marca **BOT** y las entradas de `attack_history.txt`
llevan `bot=bot`; con `--human` marca **HUMANO** (`bot=human`).
