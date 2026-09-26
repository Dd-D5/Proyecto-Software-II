import React, { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../../services/api';

export default function AttackHistoryView() {
  const [history, setHistory] = useState('Cargando historial...');
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/logs/attacks`, { mode: 'cors' });
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
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-label-caps text-[10px] uppercase tracking-[0.2em] text-outline">
            Registro
          </p>
          <h2 className="text-xl font-bold text-on-surface">Historial de ataques</h2>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="px-3 py-2 rounded-xl bg-primary-container text-on-primary font-semibold hover:brightness-110 transition"
        >
          Descargar historial
        </button>
      </div>

      <div className="rounded-2xl border border-hairline bg-surface-container-lowest p-3 h-full min-h-[420px]">
        <textarea
          readOnly
          value={history}
          className="w-full h-full min-h-[380px] resize-none rounded-xl border border-hairline bg-background text-on-surface p-3 font-mono text-xs leading-5 outline-none"
          aria-label="Historial de ataques"
        />
      </div>

      {isLoading && <p className="text-xs text-outline">Actualizando historial...</p>}
    </div>
  );
}
