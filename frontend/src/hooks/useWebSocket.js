import { useState, useEffect, useCallback, useRef } from 'react';
import { wsClient, getWebSocketUrl } from '../services/wsClient';
import { EventType, ServiceType } from '../services/types';

// Mock inicial idéntico a code.html
const INITIAL_KEYSTROKES = [];

export function useWebSocket(activeService = ServiceType.SSH) {
  const [status, setStatus] = useState(wsClient.status);
  const [wsUrl, setWsUrl] = useState(getWebSocketUrl());
  const [attackerIp, setAttackerIp] = useState('185.220.101.44');
  const [attackerMac, setAttackerMac] = useState('00:1A:2B:3C:4D:5E');
  const [keystrokes, setKeystrokes] = useState(INITIAL_KEYSTROKES);
  const [lastMessage, setLastMessage] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const lastKeystrokeTimeRef = useRef(Date.now());

  // Terminal terminal-write subscriber callbacks
  const terminalListenersRef = useRef(new Set());

  const registerTerminalListener = useCallback((cb) => {
    terminalListenersRef.current.add(cb);
    return () => terminalListenersRef.current.delete(cb);
  }, []);

  const formatTimestamp = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `[${hours}:${minutes}:${seconds}.${ms}]`;
  };

  useEffect(() => {
    // Escuchar cambios de estado
    const unsubStatus = wsClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Conectar WS singleton
    wsClient.connect();

    // Escuchar mensajes
    const unsubMsg = wsClient.onMessage((msg) => {
      if (isPaused) return;

      // Filtrar por servicio si el mensaje contiene campo service
      if (msg.service && msg.service !== activeService) {
        return;
      }

      setLastMessage(msg);

      if (msg.ip) {
        setAttackerIp(msg.ip);
      }
      if (msg.mac) {
        setAttackerMac(msg.mac);
      }

      // Procesar eventos de pulsaciones / IO
      if (msg.type === EventType.IO && msg.payload) {
        const now = Date.now();
        const deltaMs = Math.min(now - lastKeystrokeTimeRef.current, 9999);
        lastKeystrokeTimeRef.current = now;

        const char = msg.payload;
        const keyDisplay = char === ' ' ? "'Space'" : char === '\n' || char === '\r' ? "'Enter'" : `'${char}'`;
        const scancode = `code:${char.charCodeAt(0)}`;

        const newEntry = {
          timestamp: formatTimestamp(new Date()),
          event: 'KeyDown',
          key: keyDisplay,
          scancode: scancode,
          delta: `Δ ${deltaMs}ms`,
          rawTime: now
        };

        setKeystrokes((prev) => [newEntry, ...prev.slice(0, 49)]);
      }

      // Notificar a listeners de terminal (xterm)
      terminalListenersRef.current.forEach((listener) => {
        try {
          listener(msg);
        } catch (err) {
          console.error('Error notifying terminal listener:', err);
        }
      });
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, [activeService, isPaused]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const clearKeystrokes = useCallback(() => {
    setKeystrokes([]);
  }, []);

  return {
    status,
    wsUrl,
    attackerIp,
    attackerMac,
    keystrokes,
    lastMessage,
    isPaused,
    togglePause,
    clearKeystrokes,
    registerTerminalListener,
    send: wsClient.send.bind(wsClient)
  };
}
