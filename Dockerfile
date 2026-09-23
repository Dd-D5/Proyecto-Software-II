# AegisTrap Container Build
# Multi-stage Dockerfile for AegisTrap Honeypot Framework

# ----- Stage 1: Build Frontend -----
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

# ----- Stage 2: Build Backend -----
FROM golang:1.21-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum* ./
RUN go mod download || true
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o aegistrap_backend .

# ----- Stage 3: Final Production Image -----
FROM node:20-alpine
WORKDIR /app

# Install static file server for frontend & curl for health checks
RUN npm install -g serve

COPY --from=backend-builder /app/backend/aegistrap_backend /app/aegistrap_backend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist
COPY frontend/src/components/mp3 /app/frontend/src/components/mp3

# Expose AegisTrap ports
# 8080: WebSocket API
# 8081: HTTP Honeypot Trap
# 2121: FTP Honeypot Trap
# 2222: SSH Honeypot Trap
# 5173: Frontend Web Dashboard
EXPOSE 8080 8081 2121 2222 5173

# Startup script inside container
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'serve -s /app/frontend/dist -l 5173 &' >> /app/entrypoint.sh && \
    echo 'cd /app && ./aegistrap_backend' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
