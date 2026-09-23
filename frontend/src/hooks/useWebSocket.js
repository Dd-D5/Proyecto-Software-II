import { useState, useEffect, useCallback, useRef } from 'react';
import { wsClient, getWebSocketUrl } from '../services/wsClient';
import { EventType, ServiceType } from '../services/types';

const STORAGE_KEY = 'aegistrap:history:v1';

const loadPersistedState = () => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && data.history) return data;
  } catch {}
  return null;
};

const findLastValue = (buckets, field) => {
  if (!buckets) return '';
  const allMsgs = Object.values(buckets).flat();
  for (let i = allMsgs.length - 1; i >= 0; i--) {
    if (allMsgs[i][field]) return allMsgs[i][field];
  }
  return '';
};

// Deriva breach por servicio del histórico: el último evento connection/connection_end
// por servicio decide el estado. Más preciso que el objeto breach persistido (que
// no captura cierres ocurridos mientras la página estaba cerrada).
const deriveBreach = (history) => {
  const svcs = ['ssh', 'ftp', 'http'];
  return Object.fromEntries(svcs.map((svc) => {
    const bucket = history?.[svc] || [];
    for (let i = bucket.length - 1; i >= 0; i--) {
      const t = bucket[i].type;
      if (t === 'connection') return [svc, true];
      if (t === 'connection_end') return [svc, false];
    }
    return [svc, false];
  }));
};

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
  const persistedRef = useRef(null);
  if (persistedRef.current === null) {
    persistedRef.current = loadPersistedState();
  }
  const persisted = persistedRef.current;

  const historyRef = useRef(persisted?.history || { ssh: [], ftp: [], http: [] });
  const countRef = useRef(persisted?.counters || { ssh: 0, ftp: 0, http: 0 });
  const breachRef = useRef(deriveBreach(persisted?.history));

  const [status, setStatus] = useState(wsClient.status);
  const [wsUrl, setWsUrl] = useState(getWebSocketUrl());
  const [attackerIp, setAttackerIp] = useState(() => findLastValue(persisted?.history, 'ip') || '0.0.0.0');
  const [attackerMac, setAttackerMac] = useState(() => findLastValue(persisted?.history, 'mac') || '00:00:00:00:00:00');
  const [sessionId, setSessionId] = useState(() => findLastValue(persisted?.history, 'session_id') || '');
  const [keystrokes, setKeystrokes] = useState(INITIAL_KEYSTROKES);
  const [lastMessage, setLastMessage] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [breachByService, setBreachByService] = useState(breachRef.current);
  const [keystrokeCountByService, setKeystrokeCountByService] = useState(countRef.current);
  const lastKeystrokeTimeRef = useRef(Date.now());
  const saveTimerRef = useRef(null);
  // ponytail: timer booleano por servicio; si pausa activa, mensajes no llegan y timer puede
  // apagar breach HTTP aunque el atacante siga — techo aceptado. Upgrade: pausar el timer también.
  const httpBreachTimerRef = useRef(null);

  // ponytail: throttle 2s + flush en pagehide; crash pierde <2s de eventos.
  // Upgrade path: IndexedDB + flush sincrónico si la durabilidad requiere cero pérdida.
  const saveNow = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        history: historyRef.current,
        counters: countRef.current
      }));
    } catch {}
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) return;
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      saveNow();
    }, 2000);
  }, [saveNow]);

  // Terminal terminal-write subscriber callbacks
  const terminalListenersRef = useRef(new Set());

  const registerTerminalListener = useCallback((cb) => {
    terminalListenersRef.current.add(cb);
    return () => terminalListenersRef.current.delete(cb);
  }, []);

  // Si al montar el breach HTTP está restaurado como activo, arrancar timer de inactividad.
  // Cuando el atacante se fue con la página cerrada, esto apaga el rojo zombie en 10s.
  useEffect(() => {
    if (breachRef.current.http) {
      httpBreachTimerRef.current = setTimeout(() => {
        breachRef.current = { ...breachRef.current, http: false };
        setBreachByService({ ...breachRef.current });
        saveNow();
      }, 10000);
    }
    return () => clearTimeout(httpBreachTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        breachRef.current = { ...breachRef.current, [svc]: true };
        setBreachByService(breachRef.current);
      }

      // Apagar breach cuando el atacante cierra la sesión (SSH/FTP envían connection_end)
      if (msg.type === EventType.CONNECTION_END) {
        breachRef.current = { ...breachRef.current, [svc]: false };
        setBreachByService({ ...breachRef.current });
        scheduleSave();
      }

      // Timer de inactividad 10s solo para HTTP (no tiene señal de desconexión real)
      if (svc === ServiceType.HTTP) {
        clearTimeout(httpBreachTimerRef.current);
        httpBreachTimerRef.current = setTimeout(() => {
          breachRef.current = { ...breachRef.current, http: false };
          setBreachByService({ ...breachRef.current });
          saveNow();
        }, 10000);
      }

      // Contador general de pulsaciones por servicio (antes del filtro: cuenta todas las trampas)
      if (msg.type === EventType.IO && msg.payload) {
        countRef.current = { ...countRef.current, [svc]: (countRef.current[svc] || 0) + 1 };
        setKeystrokeCountByService(countRef.current);
      }

      scheduleSave();

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

    // Flush inmediato al cerrar la pestaña/navegador
    const handlePageHide = () => saveNow();
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      unsubStatus();
      unsubMsg();
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [activeService, isPaused, saveNow]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const clearKeystrokes = useCallback(() => {
    setKeystrokes([]);
    if (historyRef.current[activeService]) {
      historyRef.current[activeService] = historyRef.current[activeService].filter(
        (m) => m.type !== EventType.IO
      );
      saveNow();
    }
  }, [activeService, saveNow]);

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
