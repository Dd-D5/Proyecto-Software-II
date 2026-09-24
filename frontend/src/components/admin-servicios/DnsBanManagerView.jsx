import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';

export default function DnsBanManagerView() {
  const [bans, setBans] = useState([]);
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchBans = async () => {
    try {
      const response = await apiFetch('/api/bans');
      if (response.ok) {
        const data = await response.json();
        setBans(data || []);
      }
    } catch (err) {
      console.error('Error obteniendo lista de baneos:', err);
    }
  };

  useEffect(() => {
    fetchBans();
    const interval = setInterval(fetchBans, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleAddBan = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!target.trim()) {
      setError('Especifique una IP o Dominio DNS a banear.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/api/bans', {
        method: 'POST',
        body: JSON.stringify({
          target: target.trim(),
          reason: reason.trim() || 'Baneo manual desde el Panel SOC'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error agregando el baneo');
      }

      setSuccessMsg(`Bloqueo activado exitosamente para ${target}`);
      setTarget('');
      setReason('');
      fetchBans();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBan = async (targetToRemove) => {
    try {
      const response = await apiFetch(`/api/bans?target=${encodeURIComponent(targetToRemove)}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setSuccessMsg(`Desbaneo procesado para ${targetToRemove}`);
        fetchBans();
      }
    } catch (err) {
      setError('Error al remover baneo');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-1 select-none">
      {/* Banner Superior */}
      <section className="bg-surface-container-low border border-hairline rounded-xl px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-error-container/10 border border-error-container/30 flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-[22px]">block</span>
          </div>
          <div>
            <h2 className="font-headline-sm text-[18px] font-semibold tracking-tight text-on-surface">
              Gestor de Lista Negra: IP & Dominios DNS
            </h2>
            <p className="font-caption text-caption text-outline">
              Bloqueo activo anti-VPN/Proxy y prevención de inyecciones maliciosas.
            </p>
          </div>
        </div>
        <div className="font-label-code text-label-code text-on-surface bg-surface-container border border-hairline px-3 py-1.5 rounded-lg shrink-0">
          Total Baneados: <span className="text-error font-bold">{bans.length}</span>
        </div>
      </section>

      {/* Formulario para Agregar Baneo */}
      <section className="bg-surface-container-low border border-hairline rounded-xl p-4 shadow-sm flex flex-col gap-4">
        <h3 className="font-label-caps text-label-caps text-on-surface uppercase flex items-center gap-2 border-b border-hairline pb-2">
          <span className="material-symbols-outlined text-[18px] text-primary-container">add_moderator</span>
          Agregar Nuevo Baneo (IP o Nombre de Dominio)
        </h3>

        {error && (
          <div className="bg-error-container/10 border border-error-container/30 text-error font-medium text-xs p-3 rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-primary/10 border border-primary/30 text-primary-container font-medium text-xs p-3 rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleAddBan} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-caps text-[10px] text-outline uppercase">IP o Dominio DNS:</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Ej: 192.168.1.100 o maliciosos.com"
              className="bg-surface-container border border-hairline-strong focus:border-primary font-label-code text-xs p-2.5 rounded-lg text-on-surface outline-none transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-caps text-[10px] text-outline uppercase">Razón del Baneo:</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Ataque VPN / Ejecución sudo"
              className="bg-surface-container border border-hairline-strong focus:border-primary font-label-code text-xs p-2.5 rounded-lg text-on-surface outline-none transition-colors"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-error hover:brightness-110 text-on-error font-label-caps text-label-caps uppercase font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">gavel</span>
              {loading ? 'Procesando...' : 'Aplicar Baneo'}
            </button>
          </div>
        </form>
      </section>

      {/* Lista de Registros Baneados */}
      <section className="bg-surface-container-low border border-hairline rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 border-b border-hairline">
          <h3 className="font-label-caps text-label-caps text-on-surface uppercase flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-secondary">format_list_bulleted</span>
            Registros en Lista Negra (Filtro Activo)
          </h3>
        </div>

        {bans.length === 0 ? (
          <div className="p-6 text-center font-label-code text-xs text-outline">
            No hay baneos registrados actualmente. Los auto-baneos aparecerán aquí al detectar ataques.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-label-code text-xs">
              <thead className="bg-surface-container border-b border-hairline font-label-caps text-[10px] text-outline uppercase">
                <tr>
                  <th className="py-2 px-3">Objetivo (IP/DNS)</th>
                  <th className="py-2 px-3">Resolución Cruzada</th>
                  <th className="py-2 px-3">Razón de Bloqueo</th>
                  <th className="py-2 px-3">Origen</th>
                  <th className="py-2 px-3">Fecha</th>
                  <th className="py-2 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-soft text-on-surface">
                {bans.map((b) => (
                  <tr key={b.id || b.target} className="hover:bg-surface-container transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-error bg-error-container/10 border border-error-container/20 px-2 py-0.5 rounded">
                        {b.target}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-outline">
                      {b.resolved && b.resolved.length > 0 ? b.resolved.join(', ') : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-on-surface">{b.reason}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-label-caps text-[9px] px-2 py-0.5 rounded border uppercase font-semibold ${
                          b.banned_by === 'auto'
                            ? 'bg-tertiary/10 text-tertiary border-tertiary/30'
                            : 'bg-primary/10 text-primary-container border-primary/20'
                        }`}
                      >
                        {b.banned_by === 'auto' ? 'Automático' : 'Manual'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-outline">
                      {new Date(b.banned_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleRemoveBan(b.target)}
                        className="bg-surface-container hover:bg-surface-bright text-on-surface font-label-caps text-[10px] uppercase font-semibold px-2.5 py-1 rounded border border-hairline-strong transition-colors cursor-pointer"
                      >
                        Desbanear
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
