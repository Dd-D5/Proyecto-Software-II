import React from 'react';

export default function KeystrokeInspector({ keystrokes = [] }) {
  return (
    <section className="bg-white border-2 border-black p-3.5 shadow-[4px_4px_0px_0px_#000] flex flex-col gap-2 flex-1 overflow-hidden select-none min-w-0">
      {/* Encabezado */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FEF08A] border-2 border-black flex items-center justify-center text-black font-black shadow-[2px_2px_0px_0px_#000]">
            <span className="material-symbols-outlined text-[18px]">keyboard</span>
          </div>
          <div className="flex flex-col">
            <h2 className="font-black text-xs text-black uppercase tracking-wider">
              Inspector de Pulsaciones · Tecla a Tecla
            </h2>
            <span className="font-mono text-[9px] font-bold text-gray-800">
              Telemetría en Tiempo Real de Milisegundos
            </span>
          </div>
        </div>

        <div className="bg-[#A7F3D0] border-2 border-black px-2.5 py-1 shadow-[2px_2px_0px_0px_#000]">
          <span className="font-black text-[9px] text-black uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
            FULL INTERCEPT LIVE
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1 overflow-hidden min-w-0">
        {/* Caja de Métricas Heurísticas Neobrutalista */}
        <div className="bg-[#FAF7F2] border-2 border-black p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center shadow-[2px_2px_0px_0px_#000]">
          {/* Col 1: Heurística Bot */}
          <div className="flex flex-col gap-1 border-b-2 sm:border-b-0 sm:border-r-2 border-black pb-2 sm:pb-0 sm:pr-2">
            <div className="flex items-center justify-between text-black font-black text-[9px]">
              <span>HEURÍSTICA BOT</span>
              <span className="bg-[#BAE6FD] px-1 border border-black text-[9px]">±42ms Jitter</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-sm font-black text-black">HUMANO</span>
              <span className="bg-[#A7F3D0] border border-black px-1.5 py-0.5 text-[9px] font-black text-black uppercase">
                VERIFICADO
              </span>
            </div>
            <div className="w-full bg-white border border-black h-2 overflow-hidden">
              <div className="bg-black h-full" style={{ width: '82%' }}></div>
            </div>
          </div>

          {/* Col 2: Scores de Automatización */}
          <div className="flex flex-col justify-center gap-1 border-b-2 sm:border-b-0 sm:border-r-2 border-black pb-2 sm:pb-0 px-0 sm:px-2 font-mono text-[11px] font-black text-black">
            <div className="flex items-center justify-between">
              <span className="text-gray-900">Score Auto:</span>
              <span className="bg-[#FEF08A] px-1.5 border border-black">18%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-900">Copy-Paste:</span>
              <span className="bg-white px-1.5 border border-black">0 flags</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-900">Macro:</span>
              <span className="bg-[#DDD6FE] px-1.5 border border-black">Negativo</span>
            </div>
          </div>

          {/* Col 3: Cadencia WPM */}
          <div className="flex flex-col justify-center pl-0 sm:pl-2">
            <div className="flex items-center justify-between text-black font-black text-[9px]">
              <span>WPM CADENCIA</span>
              <span className="bg-[#A7F3D0] border border-black px-1 text-[9px]">Matched</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-mono font-black text-xl text-black">48</span>
              <span className="text-xs font-black text-black">WPM</span>
            </div>
          </div>
        </div>

        {/* Tabla de Pulsaciones (5 Columnas Alineadas por Grid) */}
        <div className="flex flex-col bg-white border-2 border-black overflow-hidden flex-1 min-h-[260px] shadow-[2px_2px_0px_0px_#000] min-w-0">
          {/* Encabezado de Tabla */}
          <div className="bg-[#FEF08A] px-2.5 py-1.5 grid grid-cols-[85px_65px_1fr_65px_65px] gap-1.5 items-center border-b-2 border-black font-black text-[10px] text-black uppercase select-none min-w-[340px]">
            <span>TIMESTAMP</span>
            <span>EVENTO</span>
            <span>TECLA</span>
            <span className="text-right">SCANCODE</span>
            <span className="text-right">DELTA (Δ)</span>
          </div>

          {/* Filas de Tabla */}
          <div className="p-2 flex flex-col gap-1.5 font-mono text-xs font-bold text-black overflow-y-auto overflow-x-auto flex-1">
            {keystrokes && keystrokes.length > 0 ? (
              keystrokes.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[85px_65px_1fr_65px_65px] gap-1.5 items-center bg-[#FAF7F2] hover:bg-[#FEF08A]/40 px-2 py-1 border border-black transition-colors min-w-[340px]"
                >
                  <span className="text-gray-800 text-[10px] font-bold truncate">{row.timestamp}</span>
                  <span className="text-black font-black text-[11px] truncate">{row.event || 'KeyDown'}</span>
                  <div className="overflow-hidden">
                    <span className="text-black font-black bg-[#A7F3D0] px-1.5 py-0.5 border border-black text-[11px] inline-block truncate max-w-full">
                      {row.key}
                    </span>
                  </div>
                  <span className="text-gray-800 text-[10px] text-right font-bold truncate">{row.scancode}</span>
                  <div className="flex justify-end overflow-hidden">
                    <span className="text-black font-black bg-[#BAE6FD] px-1 py-0.5 border border-black text-[10px] text-right truncate">
                      {row.delta}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center font-bold text-gray-700 text-xs py-6">
                Esperando eventos de teclado en vivo...
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
