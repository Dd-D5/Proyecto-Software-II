import React, { useState } from 'react';
import { reportToPdfDoc } from './forensicReport.mjs';

const card = 'bg-surface-container-low border border-hairline rounded-xl p-4 shadow-sm print:shadow-none print:border-hairline flex flex-col gap-3';
const cardTitle = 'font-label-caps text-label-caps text-on-surface uppercase tracking-wider flex items-center gap-2 border-b border-hairline pb-2';
const chip = 'border text-[10px] font-label-code px-2 py-0.5 rounded';

function fmtDate(d) {
  return d ? d.toLocaleString() : '—';
}

function fmtDuration(ms) {
  if (!ms || ms < 0) return '—';
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

export default function ForensicReportView({ report, onBack }) {
  const { summary, sessions, attackers, iocs } = report;
  const generatedAt = new Date().toLocaleString();
  const showBack = typeof onBack === 'function';
  const [isGenerating, setIsGenerating] = useState(false);

  // ponytail: descarga silenciosa vector justificada porque el Chrome del operador no ofrece
  // destino "Guardar como PDF" en el dialogo; si eso se arregla, este boton es candidato a borrar.
  const handleDownloadPdf = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const [{ default: pdfMake }, { default: fontContainer }] = await Promise.all([
        import('pdfmake'),
        import('pdfmake/build/fonts/Roboto.js')
      ]);
      if (typeof pdfMake.addFontContainer === 'function') pdfMake.addFontContainer(fontContainer);
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      pdfMake.createPdf(reportToPdfDoc(report)).download(`reporte_forense_${stamp}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-1 print:bg-white">
      {/* Encabezado */}
      <div className="bg-surface-container-low border border-hairline rounded-xl p-4 shadow-sm print:shadow-none flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-error-container/10 border border-error-container/30 flex items-center justify-center text-error print:shadow-none">
            <span className="material-symbols-outlined text-[26px]">plagiarism</span>
          </div>
          <div>
            <h2 className="font-headline-sm text-headline-sm font-semibold tracking-tight text-on-surface">
              Reporte Forense Post-Ataque
            </h2>
            <p className="font-caption text-caption text-outline">
              Generado {generatedAt} · AegisTrap Honeypot · Documento de análisis interno
            </p>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          {showBack && (
            <button
              type="button"
              onClick={onBack}
              className="bg-surface-container hover:bg-surface-bright text-on-surface font-label-caps text-label-caps uppercase py-2.5 px-4 rounded-lg border border-hairline-strong transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Volver
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-caps text-label-caps uppercase font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            {isGenerating ? 'Generando...' : 'Descargar PDF'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-surface-container hover:bg-surface-bright text-on-surface font-label-caps text-label-caps uppercase py-2.5 px-4 rounded-lg border border-hairline-strong transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Imprimir
          </button>
        </div>
      </div>

      {/* 1. Resumen ejecutivo */}
      <section className={card}>
        <h3 className={cardTitle}>
          <span className="material-symbols-outlined text-[16px] text-primary-container">summarize</span>
          1. Resumen Ejecutivo
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['Eventos totales', summary.totalEvents],
            ['IPs atacantes', summary.uniqueIps],
            ['Sesiones', summary.totalSessions],
            ['Servicios afectados', Object.keys(summary.byService).length],
          ].map(([label, value]) => (
            <div key={label} className="bg-surface-container border border-hairline rounded-lg p-3 text-center print:bg-white">
              <div className="font-display text-2xl font-semibold text-on-surface">{value}</div>
              <div className="font-label-caps text-[10px] uppercase text-outline">{label}</div>
            </div>
          ))}
        </div>
        <p className="font-label-code text-xs text-on-surface leading-5">
          Ventana de actividad: <strong>{fmtDate(summary.first)}</strong> → <strong>{fmtDate(summary.last)}</strong>.
          Desglose por servicio: {Object.entries(summary.byService).map(([k, v]) => `${k} (${v})`).join(', ') || '—'}.
          Desglose por evento: {Object.entries(summary.byEvent).map(([k, v]) => `${k} (${v})`).join(', ') || '—'}.
        </p>
      </section>

      {/* 2. Recomendaciones */}
      <section className={card}>
        <h3 className={cardTitle}>
          <span className="material-symbols-outlined text-[16px] text-error">gpp_maybe</span>
          2. Recomendaciones de Mitigación
        </h3>
        <ul className="flex flex-col gap-2">
          {attackers.map((a) => (
            <li key={a.ip} className="border border-primary/30 bg-primary/10 rounded-lg p-3 text-xs font-label-code text-on-surface leading-5">
              <span className="font-bold">{a.ip}</span> — {a.recommendation}
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Análisis de sesiones */}
      <section className={card}>
        <h3 className={cardTitle}>
          <span className="material-symbols-outlined text-[16px] text-secondary">terminal</span>
          3. Análisis por Sesión ({sessions.length})
        </h3>
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <div key={s.id} className="border border-hairline rounded-lg p-3 flex flex-col gap-2 break-inside-avoid">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-primary/10 text-primary-container border border-primary/20 text-[10px] font-label-caps px-2 py-0.5 rounded uppercase">{s.service}</span>
                <span className="font-label-code text-xs font-bold text-on-surface">{s.ip}</span>
                <span className="text-[10px] font-label-code text-outline">{s.mac}</span>
                <span className={`${chip} border-tertiary/30 bg-tertiary/10 text-tertiary ml-auto`}>{fmtDuration(s.durationMs)}</span>
                {s.wpm > 0 && <span className={`${chip} border-primary/20 bg-primary/10 text-primary-container`}>{s.wpm} WPM</span>}
              </div>
              <div className="text-[10px] font-label-code text-outline">
                {fmtDate(s.start)} → {fmtDate(s.end)} · {s.commands.length} comandos · {s.alerts} alertas · sesión {s.id}
              </div>
              {s.commands.length > 0 && (
                <div className="text-xs">
                  <span className="font-label-caps text-[10px] uppercase text-outline">Comandos:</span>{' '}
                  <span className="font-label-code bg-surface-container-lowest text-primary-container border border-hairline px-2 py-1 rounded inline-block mt-1 break-all">
                    {s.commands.join(' ; ')}
                  </span>
                </div>
              )}
              {s.typed && (
                <div className="text-xs">
                  <span className="font-label-caps text-[10px] uppercase text-outline">Texto tecleado:</span>{' '}
                  <span className="font-label-code bg-surface-container-lowest text-on-surface border border-hairline px-2 py-1 rounded inline-block mt-1 break-all whitespace-pre-wrap">
                    {s.typed}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 4. Perfil de atacantes */}
      <section className={card}>
        <h3 className={cardTitle}>
          <span className="material-symbols-outlined text-[16px] text-secondary">person_search</span>
          4. Perfil de Atacantes ({attackers.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-label-code">
            <thead className="bg-surface-container border-b border-hairline font-label-caps text-[10px] text-outline uppercase">
              <tr>
                <th className="px-2 py-1.5 text-left">IP</th>
                <th className="px-2 py-1.5 text-left">MAC</th>
                <th className="px-2 py-1.5 text-left">Servicios</th>
                <th className="px-2 py-1.5 text-center">Sesiones</th>
                <th className="px-2 py-1.5 text-center">Comandos</th>
                <th className="px-2 py-1.5 text-center">Alertas</th>
                <th className="px-2 py-1.5 text-left">Primera vista</th>
                <th className="px-2 py-1.5 text-left">Última vista</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-soft text-on-surface">
              {attackers.map((a) => (
                <tr key={a.ip} className="hover:bg-surface-container transition-colors">
                  <td className="px-2 py-1.5 font-bold">{a.ip}</td>
                  <td className="px-2 py-1.5 text-outline">{a.macs.join(', ')}</td>
                  <td className="px-2 py-1.5">{a.services.join(', ')}</td>
                  <td className="px-2 py-1.5 text-center">{a.sessionCount}</td>
                  <td className="px-2 py-1.5 text-center">{a.commands.length}</td>
                  <td className="px-2 py-1.5 text-center">{a.alerts}</td>
                  <td className="px-2 py-1.5 text-outline">{fmtDate(a.firstSeen)}</td>
                  <td className="px-2 py-1.5 text-outline">{fmtDate(a.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. IOCs */}
      <section className={card}>
        <h3 className={cardTitle}>
          <span className="material-symbols-outlined text-[16px] text-error">bug_report</span>
          5. Indicadores de Compromiso (IOCs)
        </h3>
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <div>
            <div className="font-label-caps text-[10px] uppercase text-outline mb-1">IPs</div>
            <div className="flex flex-wrap gap-1">
              {iocs.ips.map((ip) => <span key={ip} className={`${chip} border-error-container/30 bg-error-container/10 text-error`}>{ip}</span>)}
            </div>
          </div>
          <div>
            <div className="font-label-caps text-[10px] uppercase text-outline mb-1">MACs</div>
            <div className="flex flex-wrap gap-1">
              {iocs.macs.map((mac) => <span key={mac} className={`${chip} border-tertiary/30 bg-tertiary/10 text-tertiary`}>{mac}</span>)}
            </div>
          </div>
          <div>
            <div className="font-label-caps text-[10px] uppercase text-outline mb-1">Comandos observados</div>
            <div className="flex flex-wrap gap-1">
              {iocs.commands.map((c) => <span key={c} className={`${chip} border-hairline bg-surface-container text-on-surface break-all`}>{c}</span>)}
            </div>
          </div>
        </div>
      </section>

      <p className="font-caption text-[10px] text-outline print:text-black">
        Reporte derivado de attack_history.txt. Los datos reflejan la actividad registrada por los honeypots y no constituyen evidencia legal certificada.
      </p>
    </div>
  );
}
