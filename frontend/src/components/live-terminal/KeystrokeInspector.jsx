import React from 'react';

export default function KeystrokeInspector({ keystrokes = [] }) {
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
          Análisis de cadencia y tiempo de respuesta para verificar presencia humana.
        </p>
      </div>

      {/* Progress Metric */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between font-label-code text-body-sm">
          <span className="text-on-surface font-semibold">82% Humano (Cadencia Irregular)</span>
          <span className="text-outline">18% Script/Macro</span>
        </div>
        <div className="w-full h-2 rounded-full bg-surface-container border border-hairline overflow-hidden flex">
          <div className="h-full bg-primary-container rounded-l-full" style={{ width: '82%' }}></div>
          <div className="h-full bg-surface-container-highest rounded-r-full" style={{ width: '18%' }}></div>
        </div>
      </div>

      {/* Forensics Keystroke Table — ventana con slider propio (la scrollbar
          global está oculta; .keystroke-scroll la re-habilita solo aquí) */}
      <div className="keystroke-scroll border border-hairline rounded-lg bg-ink flex flex-col flex-1 min-h-0 overflow-y-auto">
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
              keystrokes.map((row, idx) => (
                <tr key={idx} className="hover:bg-surface-container transition-colors">
                  <td className="py-1.5 px-2.5 text-outline">{row.timestamp}</td>
                  <td className="py-1.5 px-2.5 font-bold font-label-code text-on-surface">{row.key}</td>
                  <td className="py-1.5 px-2.5 text-outline">{row.scancode}</td>
                  <td className="py-1.5 px-2.5 text-right text-primary-container font-bold">{row.delta}</td>
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
        <span>Ventana de muestreo: 300 eventos</span>
      </div>
    </section>
  );
}
