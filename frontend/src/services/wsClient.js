/**
 * AegisTrap WebSocket Client con Token de Autenticación
 */

export function getWebSocketUrl() {
  // Sin reescribir localhost→127.0.0.1: el relay de WSL2 solo registra [::1],
  // forzar IPv4 mataba el WS mientras el REST funcionaba. Dejar que el browser
  // resuelva (mismo criterio que api.js).
  const host = window.location.hostname || '127.0.0.1';
  const token = localStorage.getItem('aegis_token') || '';
  const port = (import.meta && import.meta.env && import.meta.env.VITE_API_PORT) || '8085';
  return `ws://${host}:${port}/ws?token=${encodeURIComponent(token)}`;
}

export class WebSocketClient {
  constructor() {
    this.url = null;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.status = 'desconectado';
    this.shouldReconnect = true;
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.url = getWebSocketUrl();
    this.shouldReconnect = true;
    this.setStatus('conectando');

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('conectado');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch {
          this.notifyListeners({ type: 'raw', payload: event.data });
        }
      };

      this.socket.onerror = () => {};

      this.socket.onclose = () => {
        this.setStatus('desconectado');
        this.socket = null;
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };
    } catch {
      this.setStatus('desconectado');
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    // ponytail: backoff 2s→30s cap; sin jitter. Upgrade path: jitter si hay
    // muchos clientes reconectando en masa tras un reinicio del backend.
    const delay = Math.min(2000 * 1.5 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect() {
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('desconectado');
  }

  setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((listener) => listener(this.status));
    }
  }

  onMessage(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  notifyListeners(data) {
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error('Error in WS message listener:', err);
      }
    });
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket.send(payload);
      return true;
    }
    return false;
  }
}

export const wsClient = new WebSocketClient();
