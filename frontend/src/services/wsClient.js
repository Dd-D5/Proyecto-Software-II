/**
 * AegisTrap WebSocket Client
 * Conecta dinámicamente a ws://${window.location.hostname}:8080/ws
 * Con fallback a ws://127.0.0.1:8080/ws y reconexión automática cada 2s.
 */

export function getWebSocketUrl() {
  const hostname = window.location.hostname;
  const host = (!hostname || hostname === 'localhost') ? '127.0.0.1' : hostname;
  return `ws://${host}:8080/ws`;
}

export class WebSocketClient {
  constructor(url = null) {
    this.url = url || getWebSocketUrl();
    this.socket = null;
    this.reconnectInterval = 2000;
    this.reconnectTimer = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.status = 'desconectado'; // 'conectando' | 'conectado' | 'desconectado'
    this.shouldReconnect = true;
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('conectando');

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
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
          // If not valid JSON, send as raw string payload
          this.notifyListeners({ type: 'raw', payload: event.data });
        }
      };

      this.socket.onerror = () => {
        // Socket errors are followed by onclose
      };

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
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
  }

  disconnect() {
    this.shouldReconnect = false;
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

// Global shared client instance
export const wsClient = new WebSocketClient();
