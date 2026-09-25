import React, { useEffect, useRef, useState } from 'react';
import { baseServiceOf } from '../../hooks/useWebSocket';

// Formatea la clave cruda de servicio: "ssh:2223" → "SSH :2223"
const fmtService = (key) => {
  const base = baseServiceOf(key).toUpperCase();
  return key.includes(':') ? `${base} ${key.slice(key.indexOf(':'))}` : base;
};

export default function BreachToast({ breachByService = {}, onNewBreach }) {
  const [toasts, setToasts] = useState([]);
  const prevRef = useRef(null);
  const onNewBreachRef = useRef(onNewBreach);
  onNewBreachRef.current = onNewBreach;

  // Difunde breachByService: claves nuevas en true generan toasts.
  // Solo se toastean claves de INSTANCIA ("ssh:2223") — la flip de la clave base
  // ("ssh") va en el mismo update y sería un toast duplicado.
  useEffect(() => {
    if (prevRef.current === null) {
      prevRef.current = breachByService; // no flood al montar
      return;
    }
    const prev = prevRef.current;
    prevRef.current = breachByService;

    const newKeys = Object.keys(breachByService).filter((k) => breachByService[k] && !prev[k]);
    if (!newKeys.length) return;

    const instanceKeys = newKeys.filter((k) => k.includes(':'));
    const keys = instanceKeys.length ? instanceKeys : newKeys;

    if (onNewBreachRef.current) onNewBreachRef.current(keys);

    setToasts((ts) => {
      const fresh = keys
        .filter((k) => !ts.some((t) => t.service === k))
        .map((k) => ({ id: `${k}-${Date.now()}`, service: k }));
      return fresh.length ? [...ts, ...fresh] : ts;
    });
  }, [breachByService]);

  // Auto-dismiss FIFO: el toast más viejo a los 6s
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((ts) => ts.slice(1)), 6000);
    return () => clearTimeout(t);
  }, [toasts]);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-[4.5rem] right-4 z-[60] flex flex-col gap-2 w-72 select-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))}
          className="bg-surface-container-low border border-error-container/40 rounded-xl p-3 shadow-lg cursor-pointer animate-pulse flex items-start gap-2.5"
          role="alert"
        >
          <span className="material-symbols-outlined text-error text-[22px] shrink-0">gpp_maybe</span>
          <div className="flex flex-col min-w-0">
            <span className="font-label-caps text-[10px] text-error uppercase font-bold tracking-wider">
              Intrusión Detectada
            </span>
            {/* ponytail: clave cruda formateada (tipo+puerto), sin lookup del nombre
                desplegado del honeypot. Upgrade path: resolver nombre via /api/honeypots. */}
            <span className="font-label-code text-[13px] text-on-surface font-semibold truncate">
              {fmtService(t.service)}
            </span>
            <span className="font-caption text-[10px] text-outline">Click para cerrar</span>
          </div>
        </div>
      ))}
    </div>
  );
}
