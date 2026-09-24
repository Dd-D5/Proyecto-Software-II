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
  if (!history) return {};
  const result = {};
  for (const svc of Object.keys(history)) {
    const bucket = history[svc] || [];
    for (let i = bucket.length - 1; i >= 0; i--) {
      const t = bucket[i].type;
      if (t === 'connection') {
        result[svc] = true;
        break;
      }
      if (t === 'connection_end') {
        result[svc] = false;
        break;
      }
    }
  }
  return result;
};

export const isServiceMatch = (msgSvc, activeSvc) => {
  if (!msgSvc || !activeSvc) return false;
  if (msgSvc === activeSvc) return true;
  if (activeSvc === 'ssh' && (msgSvc === 'ssh' || msgSvc === 'ssh:2222' || msgSvc === 'default-ssh')) return true;
  if (activeSvc === 'ftp' && (msgSvc === 'ftp' || msgSvc === 'ftp:2121' || msgSvc === 'default-ftp')) return true;
  if (activeSvc === 'http' && (msgSvc === 'http' || msgSvc === 'http:8081' || msgSvc === 'default-http')) return true;
  return false;
};

// ponytail: WSL2 localhost-forwarding entrega ::1 como IP fuente; mapeo puntual,
// no parser IPv6 completo. Upgrade path: normalizar en backend si IPv6 LAN fuese real.
export const normalizeIPv4 = (ip) =>
  !ip ? ip : ip === '::1' ? '127.0.0.1' : ip.startsWith('::ffff:') ? ip.slice(7) : ip;

// ponytail: session_id se acuña en el backend (newSessionID) desde el IP crudo:
// ::1 → "__1-<ts>". Reemplazo del prefijo, acoplado a ese formato. Solo coincide al
// inicio para no corromper un IPv6 real embebido. Upgrade path: normalizar el IP
// en el backend antes de acuñar el ID.
export const normalizeSessionId = (sid) =>
  sid && sid.startsWith('__1-') ? `127.0.0.1${sid.slice(3)}` : sid;

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
  const [attackerIp, setAttackerIp] = useState(() => normalizeIPv4(findLastValue(persisted?.history, 'ip')) || '0.0.0.0');
  const [attackerMac, setAttackerMac] = useState(() => findLastValue(persisted?.history, 'mac') || '00:00:00:00:00:00');
  const [attackerGeo, setAttackerGeo] = useState('Red Local / LAN (Prueba Interna)');
  const [sessionId, setSessionId] = useState(() => normalizeSessionId(findLastValue(persisted?.history, 'session_id')) || '');
  const [systemStats, setSystemStats] = useState({
    cpu_percent: 14.2,
    ram_used_mb: 148.6,
    ram_total_mb: 2048,
    total_attacks: 0
  });
  const [keystrokes, setKeystrokes] = useState(INITIAL_KEYSTROKES);
  const [lastMessage, setLastMessage] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [breachByService, setBreachByService] = useState(breachRef.current);
  const [keystrokeCountByService, setKeystrokeCountByService] = useState(countRef.current);
  const lastKeystrokeTimeRef = useRef(Date.now());
  const saveTimerRef = useRef(null);
  const httpBreachTimerRef = useRef(null);

  const resolveGeoLocation = useCallback(async (ip) => {
    const clean = normalizeIPv4(ip);
    if (!clean || clean === '0.0.0.0' || clean === '127.0.0.1' || clean === '::1' || clean.startsWith('192.168.') || clean.startsWith('10.')) {
      setAttackerGeo('Red Local / LAN (Prueba Interna)');
      return;
    }
    try {
      const res = await fetch(`https://ipapi.co/${clean}/json/`);
      if (res.ok) {
        const data = await res.json();
        if (data.city && data.country_name) {
          setAttackerGeo(`${data.city}, ${data.country_name} (${data.org || 'ISP'})`);
          return;
        }
      }
    } catch {}
    setAttackerGeo(`Ubicación IP (${clean})`);
  }, []);

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

  const terminalListenersRef = useRef(new Set());

  const registerTerminalListener = useCallback((cb) => {
    terminalListenersRef.current.add(cb);
    return () => terminalListenersRef.current.delete(cb);
  }, []);

  useEffect(() => {
    if (breachRef.current.http) {
      httpBreachTimerRef.current = setTimeout(() => {
        breachRef.current = { ...breachRef.current, http: false };
        setBreachByService({ ...breachRef.current });
        saveNow();
      }, 10000);
    }
    return () => clearTimeout(httpBreachTimerRef.current);
  }, []);

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
    const unsubStatus = wsClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    wsClient.connect();

    const unsubMsg = wsClient.onMessage((msg) => {
      if (isPaused) return;

      // Escuchar métricas del sistema
      if (msg.type === 'system_stats') {
        setSystemStats((prev) => ({
          cpu_percent: msg.cpu_percent || 12.0,
          ram_used_mb: msg.ram_used_mb || 140,
          ram_total_mb: msg.ram_total_mb || 2048,
          total_attacks: Math.max(prev.total_attacks || 0, msg.total_attacks || 0)
        }));
        return;
      }

      const now = Date.now();
      const stampedMsg = { ...msg, rawTime: now };
      const svc = msg.service || ServiceType.SSH;

      const currentBucket = historyRef.current[svc] || [];
      historyRef.current[svc] = [...currentBucket, stampedMsg].slice(-500);

      // Incrementar contador de ataques en tiempo real ante eventos significativos
      if (msg.type === 'connection' || msg.type === 'command' || msg.type === 'alert') {
        setSystemStats((prev) => ({
          ...prev,
          total_attacks: (prev.total_attacks || 0) + 1
        }));
      }

      if (msg.type === 'connection') {
        breachRef.current = { ...breachRef.current, [svc]: true };
        setBreachByService(breachRef.current);
      }

      if (msg.type === EventType.CONNECTION_END) {
        breachRef.current = { ...breachRef.current, [svc]: false };
        setBreachByService({ ...breachRef.current });
        scheduleSave();
      }

      if (svc === ServiceType.HTTP || svc.startsWith('http:')) {
        clearTimeout(httpBreachTimerRef.current);
        httpBreachTimerRef.current = setTimeout(() => {
          breachRef.current = { ...breachRef.current, [svc]: false };
          setBreachByService({ ...breachRef.current });
          saveNow();
        }, 10000);
      }

      if (msg.type === EventType.IO && msg.payload) {
        countRef.current = { ...countRef.current, [svc]: (countRef.current[svc] || 0) + 1 };
        setKeystrokeCountByService(countRef.current);
      }

      scheduleSave();

      if (msg.service && !isServiceMatch(msg.service, activeService)) {
        return;
      }

      setLastMessage(stampedMsg);

      if (msg.ip) {
        const norm = normalizeIPv4(msg.ip);
        setAttackerIp(norm);
        resolveGeoLocation(norm);
      }
      if (msg.mac) {
        setAttackerMac(msg.mac);
      }
      if (msg.session_id) {
        setSessionId(normalizeSessionId(msg.session_id));
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
    attackerGeo,
    sessionId,
    systemStats,
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
