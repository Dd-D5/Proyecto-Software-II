#!/usr/bin/env bash

# AegisTrap - Automated Startup Script
# University Software Project II

set -e

GREEN='\030[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}       🛡️  AegisTrap - Honeypot Framework           ${NC}"
echo -e "${CYAN}====================================================${NC}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check prerequisites
if ! command -v go &> /dev/null; then
    echo -e "${RED}[!] Go runtime is not installed. Please install Go 1.21+${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}[!] Node.js runtime is not installed. Please install Node.js 18+${NC}"
    exit 1
fi

# 1. Frontend setup
echo -e "\n${YELLOW}[1/3] Preparing Frontend (React + Vite)...${NC}"
cd "$PROJECT_ROOT/frontend"
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}[*] Installing Node dependencies...${NC}"
    npm install
fi

# 2. Build Backend
echo -e "\n${YELLOW}[2/3] Building Go Honeypot Backend...${NC}"
cd "$PROJECT_ROOT/backend"
go build -o "$PROJECT_ROOT/backend/aegistrap_backend" .
echo -e "${GREEN}[✓] Backend compiled successfully.${NC}"

# 3. Launch Services
echo -e "\n${YELLOW}[3/3] Starting AegisTrap Services...${NC}"
echo -e "${CYAN}[*] Honeypot Ports:${NC}"
echo -e "  - WebSocket Server : ws://localhost:8080/ws"
echo -e "  - SSH Honeypot     : ssh admin@localhost -p 2222"
echo -e "  - FTP Honeypot     : ftp localhost 2121"
echo -e "  - HTTP Decoy Trap  : http://localhost:8081"
echo -e "  - Frontend UI      : http://localhost:5173"
echo -e "${CYAN}----------------------------------------------------${NC}"

# Handle termination gracefully
cleanup() {
    echo -e "\n${YELLOW}[!] Shutting down AegisTrap services...${NC}"
    kill 0
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start backend in background
cd "$PROJECT_ROOT/backend"
./aegistrap_backend &

# Start frontend dev server
cd "$PROJECT_ROOT/frontend"
npm run dev -- --host
