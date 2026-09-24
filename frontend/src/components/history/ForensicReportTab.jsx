import React, { useEffect, useMemo, useState } from 'react';
import { fetchAttackHistory, parseHistory, buildReport, filterEntries } from './forensicReport.mjs';
import ForensicReportView from './ForensicReportView';

const EMPTY_FILTERS = { sessionId: '', ip: '', service: '', from: '', to: '' };
const inputCls = 'bg-surface-container border border-hairline-strong focus:border-primary text-[11px] font-label-code px-2 py-1.5 text-on-surface rounded-lg outline-none max-w-[260px] transition-colors cursor-pointer';
const labelCls = 'flex flex-col gap-1 font-label-caps text-[10px] uppercase text-outline';

export default function ForensicReportTab() {
  const [text, setText] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  useEffect(() => {
    fetchAttackHistory().then(setText).catch((e) => setError(e.message));
  }, []);

  // ponytail: parse completo en cada montaje; con logs >100MB convendria cachear el parse.
  const entries = useMemo(() => (text ? parseHistory(text) : []), [text]);

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
          <select className={inputCls} value={filters.sessionId} onChange={set('sessionId')}>
            <option value="">Todas</option>
            {sessionOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          IP atacante
          <select className={inputCls} value={filters.ip} onChange={set('ip')}>
            <option value="">Todas</option>
            {ipOptions.map((ip) => (
              <option key={ip} value={ip}>{ip}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Servicio
          <select className={inputCls} value={filters.service} onChange={set('service')}>
            <option value="">Todos</option>
            {serviceOptions.map((sv) => (
              <option key={sv} value={sv}>{sv}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Desde
          <input type="datetime-local" className={inputCls} value={filters.from} onChange={set('from')} />
        </label>
        <label className={labelCls}>
          Hasta
          <input type="datetime-local" className={inputCls} value={filters.to} onChange={set('to')} />
        </label>
        <button
          type="button"
          onClick={() => setFilters(EMPTY_FILTERS)}
          className="bg-surface-container hover:bg-surface-bright text-on-surface font-label-caps text-[10px] uppercase font-semibold py-2 px-3 rounded-lg border border-hairline-strong transition-colors cursor-pointer"
        >
          Limpiar
        </button>
      </div>

      <ForensicReportView report={report} />
    </div>
  );
}
