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

// Match de servicio activo contra IDs dinámicos de honeypots desplegados:
// "ssh", "ssh:2222" y "default-ssh" matchean activeService "ssh".
export const isServiceMatch = (msgSvc, activeSvc) => {
  if (!msgSvc || !activeSvc) return false;
  if (msgSvc === activeSvc) return true;
  if (activeSvc === 'ssh' && (msgSvc === 'ssh:2222' || msgSvc === 'default-ssh')) return true;
  if (activeSvc === 'ftp' && (msgSvc === 'ftp:2121' || msgSvc === 'default-ftp')) return true;
  if (activeSvc === 'http' && (msgSvc === 'http:8081' || msgSvc === 'default-http')) return true;
  return false;
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
  // breach en vivo — NO se restaura del histórico. Recargar con un
  // atacante aún conectado no re-enciende el rojo (el backend no re-emite 'connection'
  // de una sesión ya establecida). Upgrade path: snapshot de sesiones activas al
  // conectarse el WS si ese falso negativo llega a molestar.
  const breachRef = useRef({ ssh: false, ftp: false, http: false });

  const [status, setStatus] = useState(wsClient.status);
  const [wsUrl, setWsUrl] = useState(getWebSocketUrl());
  const [attackerIp, setAttackerIp] = useState(() => normalizeIPv4(findLastValue(persisted?.history, 'ip')) || '0.0.0.0');
  const [attackerMac, setAttackerMac] = useState(() => findLastValue(persisted?.history, 'mac') || '00:00:00:00:00:00');
  const [sessionId, setSessionId] = useState(() => normalizeSessionId(findLastValue(persisted?.history, 'session_id')) || '');
  const [keystrokes, setKeystrokes] = useState(INITIAL_KEYSTROKES);
  const [lastMessage, setLastMessage] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [breachByService, setBreachByService] = useState(breachRef.current);
  const [keystrokeCountByService, setKeystrokeCountByService] = useState(countRef.current);
  const [attackerGeo, setAttackerGeo] = useState('Red Local / LAN (Prueba Interna)');
  // Telemetría del sistema (evento "system_stats" del backend, cada 1s)
  const [systemStats, setSystemStats] = useState({
    cpu_percent: 0,
    ram_used_mb: 0,
    ram_total_mb: 0,
    total_attacks: 0,
    connections: {}
  });
  const lastKeystrokeTimeRef = useRef(Date.now());
  const saveTimerRef = useRef(null);
  // ponytail: timer booleano por servicio; si pausa activa, mensajes no llegan y timer puede
  // apagar breach HTTP aunque el atacante siga — techo aceptado. Upgrade: pausar el timer también.
  const httpBreachTimerRef = useRef(null);

  // ponytail: geolocalización vía ipapi.co solo para IPs públicas; LAN muestra texto
  // fijo. Upgrade path: proveedor local/offline si la privacidad lo exige.
  const resolveGeoLocation = useCallback(async (ip) => {
    const clean = normalizeIPv4(ip);
    if (!clean || clean === '0.0.0.0' || clean === '127.0.0.1' || clean.startsWith('192.168.') || clean.startsWith('10.')) {
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

  // Replay historical messages and recompute keystrokes when activeService changes.
  // Agrega todos los buckets que matchean (IDs dinámicos "ssh:2222" → ssh).
  useEffect(() => {
    const bucket = Object.entries(historyRef.current)
      .filter(([k]) => isServiceMatch(k, activeService))
      .flatMap(([, b]) => b)
      .sort((a, b) => (a.rawTime || 0) - (b.rawTime || 0));

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

      // Telemetría del sistema (evento directo del backend, sin service/payload).
      // ponytail: sin persistencia ni history; en recarga hay sample fresco en ≤1s.
      if (msg.type === 'system_stats') {
        setSystemStats((prev) => ({
          cpu_percent: msg.cpu_percent ?? prev.cpu_percent,
          ram_used_mb: msg.ram_used_mb ?? prev.ram_used_mb,
          ram_total_mb: msg.ram_total_mb ?? prev.ram_total_mb,
          // Math.max: el contador local incrementa en vivo entre samples
          total_attacks: Math.max(prev.total_attacks || 0, msg.total_attacks || 0),
          connections: msg.connections || prev.connections || {}
        }));
        return;
      }

      const now = Date.now();
      const stampedMsg = { ...msg, rawTime: now };
      const svc = msg.service || ServiceType.SSH;

      //  500 msg cap per service. Upgrade path: configurable limit or eviction strategy.
      const currentBucket = historyRef.current[svc] || [];
      historyRef.current[svc] = [...currentBucket, stampedMsg].slice(-500);

      // Clave base para estados agregados: "ssh:2222"/"default-ssh" → "ssh"
      const baseSvc = svc.split(':')[0].replace('default-', '');

      // Contador de ataques en vivo entre samples del backend (1s)
      if (msg.type === 'connection' || msg.type === 'command' || msg.type === 'alert') {
        setSystemStats((prev) => ({
          ...prev,
          total_attacks: (prev.total_attacks || 0) + 1
        }));
      }

      // Estado de intrusión por servicio base (antes del filtro: aplica a cualquier trampa)
      if (msg.type === 'connection') {
        breachRef.current = { ...breachRef.current, [baseSvc]: true };
        setBreachByService(breachRef.current);
      }

      // Apagar breach cuando el atacante cierra la sesión (SSH/FTP envían connection_end)
      if (msg.type === EventType.CONNECTION_END) {
        breachRef.current = { ...breachRef.current, [baseSvc]: false };
        setBreachByService({ ...breachRef.current });
        scheduleSave();
      }

      // Timer de inactividad 10s solo para HTTP (no tiene señal de desconexión real).
      // Cubre también honeypots HTTP dinámicos ("http:8081").
      if (baseSvc === ServiceType.HTTP) {
        clearTimeout(httpBreachTimerRef.current);
        httpBreachTimerRef.current = setTimeout(() => {
          breachRef.current = { ...breachRef.current, [baseSvc]: false };
          setBreachByService({ ...breachRef.current });
          saveNow();
        }, 10000);
      }

      // Contador general de pulsaciones por servicio base (antes del filtro: cuenta todas las trampas)
      if (msg.type === EventType.IO && msg.payload) {
        countRef.current = { ...countRef.current, [baseSvc]: (countRef.current[baseSvc] || 0) + 1 };
        setKeystrokeCountByService(countRef.current);
      }

      scheduleSave();

      // Filtrar por servicio (soporta IDs dinámicos: ssh:2222 matchea ssh)
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
    sessionId,
    keystrokes,
    lastMessage,
    isPaused,
    breachByService,
    keystrokeCountByService,
    systemStats,
    attackerGeo,
    togglePause,
    clearKeystrokes,
    registerTerminalListener,
    send: wsClient.send.bind(wsClient)
  };
}
