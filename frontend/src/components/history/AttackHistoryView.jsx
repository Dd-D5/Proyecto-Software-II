import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';

export default function AttackHistoryView() {
  const [history, setHistory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      // apiFetch (no fetch crudo): un 401 dispara el logout global
      const response = await apiFetch('/logs/attacks');
      if (!response.ok) {
        throw new Error('respuesta no OK');
      }
      const text = await response.text();
      setHistory(text || 'No hay ataques registrados aún.');
      setLoadError(null);
    } catch (error) {
      setLoadError('No se pudo cargar el historial. Verifique que el backend esté iniciado.');
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
          className="px-3 py-2 rounded-btn bg-primary-container text-on-primary font-semibold hover:brightness-110 transition"
        >
          Descargar historial
        </button>
      </div>

      {loadError ? (
        <div role="alert" className="rounded-2xl border border-error-container/30 bg-error-container/10 p-6 min-h-[420px] flex flex-col items-center justify-center gap-3 text-center">
          <span className="material-symbols-outlined text-error text-[32px]">cloud_off</span>
          <p className="font-label-code text-sm text-error">{loadError}</p>
          <button
            onClick={loadHistory}
            className="px-3 py-1.5 rounded-md bg-surface-container hover:bg-surface-bright text-on-surface border border-outline-variant font-label-code text-label-code transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-hairline bg-surface-container-lowest p-3 h-full min-h-[420px]">
          <textarea
            readOnly
            value={history}
            className="w-full h-full min-h-[380px] resize-none rounded-xl border border-hairline bg-background text-on-surface p-3 font-mono text-xs leading-5 outline-none"
            aria-label="Historial de ataques"
          />
        </div>
      )}

      {isLoading && <p className="text-xs text-outline" role="status">Actualizando historial...</p>}
    </div>
  );
}
