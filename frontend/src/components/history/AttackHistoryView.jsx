import React, { useEffect, useState } from 'react';

export default function AttackHistoryView() {
  const [history, setHistory] = useState('Cargando historial...');
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const host = window.location.hostname || '127.0.0.1';
      const response = await fetch(`http://${host}:8081/logs/attacks`, { mode: 'cors' });
      if (!response.ok) {
        throw new Error('No hay historial disponible');
      }
      const text = await response.text();
      setHistory(text || 'No hay ataques registrados aún.');
    } catch (error) {
      setHistory('No hay historial disponible aún.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDownload = () => {
    const blob = new Blob([history], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'attack_history.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5 p-2 bg-[#FAF7F2]">
      {/* Banner Superior Neobrutalista */}
      <div className="bg-[#FEF08A] border-3 border-black p-5 shadow-[5px_5px_0px_0px_#000] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center font-black text-black shadow-[3px_3px_0px_0px_#000]">
            <span className="material-symbols-outlined text-[28px]">history</span>
          </div>
          <div>
            <h2 className="font-black text-xl text-black uppercase tracking-wide">
              Historial de Intrusiones &amp; Ataques
            </h2>
            <p className="text-xs font-bold text-gray-800">
              Registro persistente de paquetes, comandos ejecutados y eventos de telemetría.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="bg-[#A7F3D0] hover:bg-[#6EE7B7] text-black font-black text-xs py-3 px-4 border-2 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center gap-2 uppercase cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Descargar TXT
        </button>
      </div>

      {/* Contenedor de Textarea Neobrutalista */}
      <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] flex flex-col gap-3">
        <div className="flex items-center justify-between border-b-2 border-black pb-2">
          <span className="font-black text-xs text-black uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">description</span>
            Visualizador de Logs (attack_history.txt)
          </span>
          {isLoading && (
            <span className="bg-[#BAE6FD] text-black border border-black text-[10px] font-bold px-2 py-0.5 animate-pulse">
              Actualizando...
            </span>
          )}
        </div>

        <textarea
          readOnly
          value={history}
          className="w-full min-h-[420px] resize-none border-2 border-black bg-black text-[#A7F3D0] p-4 font-mono text-xs leading-6 outline-none shadow-[3px_3px_0px_0px_#000]"
          aria-label="Historial de ataques"
        />
      </div>
    </div>
  );
}
