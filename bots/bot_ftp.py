#!/usr/bin/env python3
"""Simula una intrusión FTP al honeypot con cadencia de BOT (delay fijo por comando)
o de HUMANO (--human, jitter aleatorio). Solo stdlib.

Ejemplos:
  python bot_ftp.py                        # bot contra 127.0.0.1:2121
  python bot_ftp.py --human
  python bot_ftp.py --port 2122
"""
import argparse
import random
import socket
import time

STEPS = ["USER admin", "PASS 123456", "SYST", "PWD", "GET /etc/shadow", "QUIT"]


def read_reply(s):
    s.settimeout(2)
    try:
        return s.recv(4096)
    except socket.timeout:
        return b""


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--host", default="localhost",
                    help="Windows+WSL2: usar 'localhost' (el relay registra ::1, no 127.0.0.1)")
    ap.add_argument("--port", type=int, default=2121)
    ap.add_argument("--delay", type=float, default=0.25, help="delay fijo entre comandos (segundos)")
    ap.add_argument("--human", action="store_true", help="jitter aleatorio (cadencia humana, CV alto)")
    args = ap.parse_args()

    modo = "HUMANO (jitter)" if args.human else "BOT (metrónomo)"
    print(f"[>] Conectando a {args.host}:{args.port} — modo {modo}")

    s = socket.create_connection((args.host, args.port), timeout=10)
    print(f"[<] {read_reply(s).decode(errors='replace').strip()}")

    for step in STEPS:
        s.sendall((step + "\r\n").encode())
        print(f"[+] Enviado: {step}")
        # BOT: 250ms constantes → media < 300ms. HUMANO: uniform(0.3, 1.8) → CV≈0.41
        d = random.uniform(0.3, 1.8) if args.human else args.delay
        time.sleep(d)
        reply = read_reply(s).decode(errors="replace").strip()
        if reply:
            print(f"[<] {reply}")

    s.close()
    print(f"[✓] Intrusión completada — el detector debe clasificar: "
          f"{'HUMANO' if args.human else 'BOT'}")


if __name__ == "__main__":
    main()
