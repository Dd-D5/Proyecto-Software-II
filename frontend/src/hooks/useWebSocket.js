import { useState, useEffect, useCallback, useRef } from 'react';
import { wsClient, getWebSocketUrl } from '../services/wsClient';
import { EventType, ServiceType } from '../services/types';

// Mock inicial idéntico a code.html
const INITIAL_KEYSTROKES = [];

const formatTimestamp = (date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `[${hours}:${minutes}:${seconds}.${ms}]`;
};

const buildKeystrokeEntry = (char, rawTime, prevTime) => {
  const deltaMs = Math.min(rawTime - prevTime, 9999);
  const keyDisplay = char === ' ' ? "'Space'" : char === '\n' || char === '\r' ? "'Enter'" : `'${char}'`;
  return {
    timestamp: formatTimestamp(new Date(rawTime)),
    event: 'KeyDown',
    key: keyDisplay,
    scancode: `code:${char.charCodeAt(0)}`,
    delta: `Δ ${deltaMs}ms`,
    rawTime
  };
};

export function useWebSocket(activeService = ServiceType.SSH) {
  const [status, setStatus] = useState(wsClient.status);
  const [wsUrl, setWsUrl] = useState(getWebSocketUrl());
  const [attackerIp, setAttackerIp] = useState('0.0.0.0');
  const [attackerMac, setAttackerMac] = useState('00:00:00:00:00:00');
  const [sessionId, setSessionId] = useState('');
  const [keystrokes, setKeystrokes] = useState(INITIAL_KEYSTROKES);
  const [lastMessage, setLastMessage] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [breachByService, setBreachByService] = useState({ ssh: false, ftp: false, http: false });
  //  contador general en memoria; recarga de página lo reinicia.
  // Upgrade path: localStorage o evento system_metrics del backend.
  const [keystrokeCountByService, setKeystrokeCountByService] = useState({ ssh: 0, ftp: 0, http: 0 });
  const lastKeystrokeTimeRef = useRef(Date.now());

  //  in-memory per-service message history capped at 500 entries per service.
  // Upgrade path: persist to localStorage or IndexedDB if history must survive page reloads.
  const historyRef = useRef({ ssh: [], ftp: [], http: [] });

  // Terminal terminal-write subscriber callbacks
  const terminalListenersRef = useRef(new Set());

  const registerTerminalListener = useCallback((cb) => {
    terminalListenersRef.current.add(cb);
    return () => terminalListenersRef.current.delete(cb);
  }, []);

  // Replay historical messages and recompute keystrokes when activeService changes
  useEffect(() => {
    const bucket = historyRef.current[activeService] || [];

    let prevTime = Date.now();
    const activeKeystrokes = [];
    bucket.forEach((m) => {
      if (m.type === EventType.IO && m.payload) {
        const mTime = m.rawTime || Date.now();
        const entry = buildKeystrokeEntry(m.payload, mTime, prevTime);
        prevTime = mTime;
        activeKeystrokes.unshift(entry);
      }
    });
    setKeystrokes(activeKeystrokes.slice(0, 50));

    //  instant replay, no pacing delay. Upgrade path: setTimeout loop if typing animation is needed.
    bucket.forEach((m) => {
      terminalListenersRef.current.forEach((listener) => {
        try {
          listener(m);
        } catch (err) {
          console.error('Error replaying to terminal:', err);
        }
      });
    });
  }, [activeService]);

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

      const now = Date.now();
      const stampedMsg = { ...msg, rawTime: now };
      const svc = msg.service || ServiceType.SSH;

      //  500 msg cap per service. Upgrade path: configurable limit or eviction strategy.
      const currentBucket = historyRef.current[svc] || [];
      historyRef.current[svc] = [...currentBucket, stampedMsg].slice(-500);

      // Estado de intrusión por servicio (antes del filtro: aplica a cualquier trampa)
      if (msg.type === 'connection') {
        setBreachByService((prev) => ({ ...prev, [svc]: true }));
      }

      // Contador general de pulsaciones por servicio (antes del filtro: cuenta todas las trampas)
      if (msg.type === EventType.IO && msg.payload) {
        setKeystrokeCountByService((prev) => ({ ...prev, [svc]: prev[svc] + 1 }));
      }

      // Filtrar por servicio si el mensaje contiene campo service
      if (msg.service && msg.service !== activeService) {
        return;
      }

      setLastMessage(stampedMsg);

      if (msg.ip) {
        setAttackerIp(msg.ip);
      }
      if (msg.mac) {
        setAttackerMac(msg.mac);
      }
      if (msg.session_id) {
        setSessionId(msg.session_id);
      }

      // Procesar eventos de pulsaciones / IO
      if (msg.type === EventType.IO && msg.payload) {
        const newEntry = buildKeystrokeEntry(msg.payload, now, lastKeystrokeTimeRef.current);
        lastKeystrokeTimeRef.current = now;
        setKeystrokes((prev) => [newEntry, ...prev.slice(0, 49)]);
      }

      // Notificar a listeners de terminal (xterm)
      terminalListenersRef.current.forEach((listener) => {
        try {
          listener(stampedMsg);
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
    if (historyRef.current[activeService]) {
      historyRef.current[activeService] = historyRef.current[activeService].filter(
        (m) => m.type !== EventType.IO
      );
    }
  }, [activeService]);

  return {
    status,
    wsUrl,
    attackerIp,
    attackerMac,
    sessionId,
    keystrokes,
    lastMessage,
    isPaused,
    breachByService,
    keystrokeCountByService,
    togglePause,
    clearKeystrokes,
    registerTerminalListener,
    send: wsClient.send.bind(wsClient)
  };
}
