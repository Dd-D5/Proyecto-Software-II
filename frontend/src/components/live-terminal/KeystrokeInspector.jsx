import React from 'react';

export default function KeystrokeInspector({ keystrokes = [] }) {
  return (
    <section className="bg-surface-container-low border border-[#1e2330] rounded-xl p-2.5 shadow-sm flex flex-col gap-2 flex-1 overflow-hidden select-none">
      {/* Title & Intercept Status Header */}
      <div className="flex items-center justify-between border-b border-[#1e2330] pb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-tertiary border border-outline-variant/30">
            <span className="material-symbols-outlined text-[16px]">keyboard</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-title-md text-[12px] text-on-surface font-semibold">
                Inspector de Pulsaciones
              </span>
              <span className="font-title-md text-[12px] text-primary font-bold">
                Tecla a Tecla
              </span>
            </div>
            <span className="font-mono-sm text-[9px] text-outline">
              Daemon Hook Millisecond Telemetry (Live Raw Stream)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-surface-container-lowest px-2 py-0.5 rounded-lg border border-primary/30">
          <div className="flex flex-col text-right">
            <span className="font-label-caps text-[8px] text-outline uppercase tracking-wider font-bold">
              FULL INTERCEPT
            </span>
            <span className="font-mono-sm text-[9px] text-primary font-bold flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              LIVE
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1 overflow-hidden">
        {/* Upper Heuristics Metrics Box */}
        <div className="bg-surface-container-lowest border border-[#1e2330] p-2 rounded-xl grid grid-cols-3 gap-2.5 items-center">
          {/* Col 1: Bot Heuristic */}
          <div className="flex flex-col gap-0.5 border-r border-[#1e2330]/60 pr-2">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-caps text-[8px] uppercase tracking-wider">HEURÍSTICA BOT</span>
              <span className="font-mono-sm text-[9px] text-secondary">±42ms Jitter</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono-lg text-[13px] text-primary font-bold">Humano</span>
              <span className="font-label-caps text-[8px] text-primary bg-primary/10 border border-primary/20 px-1 py-0.5 rounded font-semibold uppercase">
                Verificado
              </span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-1 overflow-hidden my-0.5">
              <div className="bg-primary h-full rounded-full" style={{ width: '82%' }}></div>
            </div>
          </div>

          {/* Col 2: Automation Scores */}
          <div className="flex flex-col justify-center gap-0.5 border-r border-[#1e2330]/60 px-2">
            <div className="flex items-center justify-between text-[10px] font-mono-sm">
              <span className="text-on-surface-variant">Score Auto:</span>
              <span className="text-primary font-semibold">18%</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono-sm">
              <span className="text-on-surface-variant">Copy-Paste:</span>
              <span className="text-outline font-semibold">0 flags</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono-sm">
              <span className="text-on-surface-variant">Macro:</span>
              <span className="text-secondary font-semibold">Negativo</span>
            </div>
          </div>

          {/* Col 3: WPM Cadence */}
          <div className="flex flex-col justify-center pl-1.5">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-caps text-[8px] uppercase tracking-wider">WPM CADENCIA</span>
              <span className="font-mono-sm text-[8px] text-primary bg-primary/10 border border-primary/20 px-1 py-0.5 rounded font-semibold">
                Matched
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-headline-xl text-[18px] text-tertiary font-bold leading-tight">48</span>
              <span className="text-[10px] font-mono-sm text-on-surface-variant">WPM</span>
            </div>
          </div>
        </div>

        {/* Keystroke Table (5 Columns) */}
        <div className="flex flex-col bg-surface-container-lowest border border-[#1e2330] rounded-xl overflow-hidden flex-1 min-h-[280px]">
          {/* Table Header */}
          <div className="bg-surface-container-high px-3 py-1.5 flex items-center justify-between border-b border-[#1e2330] text-outline font-label-caps text-[9px]">
            <div className="flex items-center gap-6">
              <span className="w-24">TIMESTAMP</span>
              <span className="w-20">EVENTO</span>
              <span>TECLA CAPTURADA</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="w-20 text-right">SCANCODE</span>
              <span className="w-16 text-right">DELTA (Δ)</span>
            </div>
          </div>

          {/* Table Rows (Scrollable) */}
          <div className="p-2 flex flex-col gap-1.5 font-mono-sm text-[10px] overflow-y-auto flex-1">
            {keystrokes && keystrokes.length > 0 ? (
              keystrokes.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-surface-container/30 px-2.5 py-1 rounded border border-[#1e2330]/40 transition-colors hover:bg-surface-container/60"
                >
                  <div className="flex items-center gap-6">
                    <span className="text-outline text-[9px] w-24">{row.timestamp}</span>
                    <span className="text-on-surface font-semibold w-20">{row.event || 'KeyDown'}</span>
                    <span className="text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 font-mono-sm">
                      {row.key}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-outline text-[9px] w-20 text-right">{row.scancode}</span>
                    <span className="text-secondary font-semibold w-16 text-right">{row.delta}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-outline text-[11px] py-4">
                Esperando eventos de teclado en vivo...
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
