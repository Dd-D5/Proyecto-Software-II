#!/bin/bash
# Deploy del webapp — solo ejecutar desde el servidor CI
set -e
echo "Compilando..."
docker build -t webapp:latest ./projects/webapp
echo "Reiniciando servicio..."
sudo systemctl restart webapp
echo "Deploy OK: $(date)"
