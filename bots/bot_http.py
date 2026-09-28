#!/usr/bin/env python3
"""Simula un scanner HTTP contra la tienda honeypot con cadencia de BOT (delay fijo
entre requests) o de HUMANO (--human). Solo stdlib.

Ejemplos:
  python bot_http.py                        # bot contra 127.0.0.1:8081
  python bot_http.py --human
  python bot_http.py --port 8082
"""
import argparse
import random
import time
import urllib.error
import urllib.parse
import urllib.request

# GETs de scanner + un POST con SQLi al login (patrón → bot pegajoso por IP)
GET_PATHS = ["/", "/.env", "/wp-config.php", "/phpmyadmin/", "/.git/config", "/backup.sql"]
SQLI_POST = ("/admin", "user=admin' or '1'='1&password=x")


def fetch(url, data=None):
    req = urllib.request.Request(
        url,
        data=data,
        method="POST" if data else "GET",
        headers={"User-Agent": "sqlmap/1.8 (bot-sim)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            r.read()
    except urllib.error.HTTPError as e:
        e.read()  # 403 del ban: esperado en strike 2
    except urllib.error.URLError as exc:
        print(f"[!] {url} → {exc}")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--host", default="localhost",
                    help="Windows+WSL2: usar 'localhost' (el relay registra ::1, no 127.0.0.1)")
    ap.add_argument("--port", type=int, default=8081)
    ap.add_argument("--delay", type=float, default=0.15, help="delay fijo entre requests (segundos)")
    ap.add_argument("--human", action="store_true", help="jitter aleatorio (cadencia humana)")
    args = ap.parse_args()

    base = f"http://{args.host}:{args.port}"
    modo = "HUMANO (jitter)" if args.human else "BOT (metrónomo)"
    print(f"[>] Apuntando a {base} — modo {modo}")

    for path in GET_PATHS:
        print(f"[+] GET {path}")
        fetch(base + path)
        # BOT: 150ms constantes → gap < 250ms. HUMANO: uniform(1.0, 4.0) → navegación real
        time.sleep(random.uniform(1.0, 4.0) if args.human else args.delay)

    print(f"[+] POST {SQLI_POST[0]} (SQLi)")
    fetch(base + SQLI_POST[0], urllib.parse.urlencode(
        {"user": "admin' or '1'='1", "password": "x"}).encode())
    # El POST con SQLi dispara el patrón → veredicto BOT pegajoso por IP

    print("[✓] Ronda completada — el detector debe clasificar: "
          f"{'HUMANO (el SQLI igualmente marca BOT pegajoso)' if args.human else 'BOT'}")


if __name__ == "__main__":
    main()
