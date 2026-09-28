import React from 'react';

export default function KeystrokeInspector({ keystrokes = [], botVerdict = '' }) {
  // Cadencia <150ms = tipeo scripted/automatizado — señal forense útil.
  // ponytail: parse por fila del "Δ Nms" renderizado; barato con cap de 50 filas.
  // Upgrade path: guardar deltaMs numérico en el entry si la tabla crece.
  const isFastDelta = (delta) => parseInt(String(delta).replace(/[^\d]/g, ''), 10) < 150;

  // Barra revivida con el veredicto REAL del backend (antes era decorativa).
  // Tri-estado: el backend no emite score continuo — YAGNI.
  const VERDICTS = {
    human: { label: 'HUMANO', cls: 'bg-primary text-on-primary' },
    bot: { label: 'BOT', cls: 'bg-error text-on-error' },
    suspect: { label: 'SOSPECHOSO', cls: 'bg-tertiary text-on-tertiary' }
  };
  const verdictInfo = VERDICTS[botVerdict];

  return (
    <section className="p-4 rounded-xl bg-surface-container-low border border-hairline shadow-sm flex flex-col gap-3 flex-1 min-h-0">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container text-[20px]">keyboard</span>
          <h2 className="font-headline-sm text-[16px] leading-[20px] font-semibold text-on-surface">
            Inspector de Pulsaciones
          </h2>
        </div>
        <p className="font-caption text-caption text-outline">
          Análisis de cadencia y tiempo de respuesta de cada pulsación.
        </p>
      </div>

      {/* Clasificación HUMANO/BOT del operador conectado (detector backend) */}
      <div role="status" className="flex items-center justify-between gap-2">
        <span className="font-label-caps text-[10px] uppercase tracking-wider text-outline shrink-0">
          Clasificación
        </span>
        {verdictInfo ? (
          <span className={`font-label-caps text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${verdictInfo.cls}`}>
            {verdictInfo.label}
          </span>
        ) : (
          <span className="font-label-caps text-[10px] px-2 py-0.5 rounded uppercase tracking-wider bg-surface-container-high text-outline border border-hairline animate-pulse">
            Analizando…
          </span>
        )}
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden border border-hairline bg-surface-container">
        {/* Barra segmentada: 1/3 humano · 1/3 sospechoso · 1/3 bot; el estado activo se ilumina */}
        {['human', 'suspect', 'bot'].map((k) => (
          <span key={k} className={`flex-1 transition-colors ${botVerdict === k ? VERDICTS[k].cls : 'bg-transparent'}`}></span>
        ))}
      </div>

      {/* Forensics Keystroke Table — ventana con slider propio (la scrollbar
          global está oculta; .panel-scroll la re-habilita solo aquí) */}
      <div className="panel-scroll border border-hairline rounded-lg bg-ink flex flex-col flex-1 min-h-0 overflow-y-auto">
        <table className="w-full text-left font-label-code text-[12px]">
          <thead className="sticky top-0 bg-surface-container border-b border-hairline font-label-caps text-[10px] text-outline uppercase">
            <tr>
              <th className="py-1.5 px-2.5">Hora</th>
              <th className="py-1.5 px-2.5">Tecla</th>
              <th className="py-1.5 px-2.5">Código</th>
              <th className="py-1.5 px-2.5 text-right">Delta (ms)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge-soft bg-ink text-on-surface">
            {keystrokes && keystrokes.length > 0 ? (
              keystrokes.map((row) => (
                <tr key={row.id} className="hover:bg-surface-container transition-colors">
                  <td className="py-1.5 px-2.5 text-outline">{row.timestamp}</td>
                  <td className="py-1.5 px-2.5 font-bold font-label-code text-on-surface">{row.key}</td>
                  <td className="py-1.5 px-2.5 text-outline">{row.scancode}</td>
                  <td
                    className={`py-1.5 px-2.5 text-right font-bold ${isFastDelta(row.delta) ? 'text-tertiary' : 'text-primary-container'}`}
                    title={isFastDelta(row.delta) ? 'Cadencia rápida — posible scripted/automatización' : undefined}
                  >
                    {row.delta}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-4 text-center text-outline text-[11px]">
                  Esperando eventos de teclado en vivo...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Meta */}
      <div className="flex items-center justify-between text-caption font-caption text-outline pt-1">
        <span>Ventana de muestreo: 50 eventos</span>
      </div>
    </section>
  );
}
