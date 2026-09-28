import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchAttackHistory, parseHistory, buildReport, filterEntries, wsMessageToEntry } from './forensicReport.mjs';
import ForensicReportView from './ForensicReportView';
import { inputCls } from '../../ui/Input';
import { wsClient } from '../../services/wsClient';

const EMPTY_FILTERS = { sessionId: '', ip: '', service: '', from: '', to: '' };
const fieldCls = `${inputCls} text-[11px] px-2 py-1.5 max-w-[260px] cursor-pointer`;
const labelCls = 'flex flex-col gap-1 font-label-caps text-[10px] uppercase text-outline';

export default function ForensicReportTab() {
  const [text, setText] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // Eventos WS vivos: se concatenan al archivo parseado (reporte en tiempo real
  // sin re-polling). Buffer + flush 1s para que una ráfaga de teclas no
  // re-recalcule el reporte por cada tecla.
  const [liveEntries, setLiveEntries] = useState([]);
  const wsBufferRef = useRef([]);
  const flushTimerRef = useRef(null);

  useEffect(() => {
    // Subscribir ANTES del fetch: el buffer cubre el gap mientras el texto base llega
    const unsub = wsClient.onMessage((msg) => {
      const entry = wsMessageToEntry(msg);
      if (!entry) return;
      wsBufferRef.current.push(entry);
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          if (wsBufferRef.current.length) {
            const batch = wsBufferRef.current;
            wsBufferRef.current = [];
            setLiveEntries((prev) => [...prev, ...batch]);
          }
        }, 1000);
      }
    });
    fetchAttackHistory().then(setText).catch((e) => setError(e.message));
    return () => {
      unsub();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, []);

  // ponytail: parse completo en cada montaje; con logs >100MB convendria cachear el parse.
  // Archivo + eventos vivos. Dedup por ts: eventos que llegaron por WS mientras el
  // fetch inicial estaba en vuelo ya están en el archivo — solo se agregan los posteriores.
  const entries = useMemo(() => {
    if (text === null) return [];
    const parsed = text ? parseHistory(text) : [];
    const lastTs = parsed.length ? parsed[parsed.length - 1].ts : 0;
    return [...parsed, ...liveEntries.filter((e) => e.ts > lastTs)];
  }, [text, liveEntries]);

  const sessionOptions = useMemo(() => {
    const byId = new Map();
    for (const e of entries) if (!byId.has(e.session_id)) byId.set(e.session_id, e);
    return [...byId.entries()].map(([id, e]) => ({ value: id, label: `${id} · ${e.ip} · ${e.service}` }));
  }, [entries]);
  const ipOptions = useMemo(() => [...new Set(entries.map((e) => e.ip))], [entries]);
  const serviceOptions = useMemo(() => [...new Set(entries.map((e) => e.service))], [entries]);

  const report = useMemo(() => buildReport(filterEntries(entries, filters)), [entries, filters]);

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  if (error) {
    return (
      <div className="bg-error-container/10 border border-error-container/30 rounded-xl p-5 font-label-caps text-error uppercase text-sm flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px]">error</span>
        No hay historial disponible aún.
      </div>
    );
  }
  if (text === null) {
    return (
      <div className="bg-surface-container-low border border-hairline rounded-xl p-5 font-label-caps text-outline uppercase text-sm animate-pulse flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
        Recopilando evidencia y generando reporte forense...
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {/* Barra de filtros */}
      <div className="bg-surface-container-low border border-hairline rounded-xl p-4 shadow-sm print:hidden flex flex-wrap gap-3 items-end">
        <label className={labelCls}>
          Sesión
          <select className={fieldCls} value={filters.sessionId} onChange={set('sessionId')}>
            <option value="">Todas</option>
            {sessionOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          IP atacante
          <select className={fieldCls} value={filters.ip} onChange={set('ip')}>
            <option value="">Todas</option>
            {ipOptions.map((ip) => (
              <option key={ip} value={ip}>{ip}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Servicio
          <select className={fieldCls} value={filters.service} onChange={set('service')}>
            <option value="">Todos</option>
            {serviceOptions.map((sv) => (
              <option key={sv} value={sv}>{sv}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Desde
          <input type="datetime-local" className={fieldCls} value={filters.from} onChange={set('from')} />
        </label>
        <label className={labelCls}>
          Hasta
          <input type="datetime-local" className={fieldCls} value={filters.to} onChange={set('to')} />
        </label>
        <button
          type="button"
          onClick={() => setFilters(EMPTY_FILTERS)}
          className="bg-surface-container hover:bg-surface-bright text-on-surface font-label-caps text-[10px] uppercase font-semibold py-2 px-3 rounded-lg border border-hairline-strong transition-colors cursor-pointer"
        >
          Limpiar
        </button>
      </div>

      {report.summary.totalEvents === 0 ? (
        <div className="bg-surface-container-low border border-hairline rounded-xl p-6 text-center flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-outline text-[28px]">filter_alt_off</span>
          <p className="font-label-code text-xs text-outline">
            Ningún evento coincide con los filtros seleccionados.
          </p>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="underline underline-offset-2 text-primary-container hover:brightness-110 cursor-pointer font-label-code text-xs"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <ForensicReportView report={report} />
      )}
    </div>
  );
}
