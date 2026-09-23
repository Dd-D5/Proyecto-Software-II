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
      console.error("Error obteniendo lista de baneos:", err);
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
    <div className="flex flex-col gap-6 p-2">
      {/* Banner Superior Neobrutalista */}
      <div className="bg-[#FED7AA] border-3 border-black p-5 shadow-[5px_5px_0px_0px_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center font-black text-black shadow-[3px_3px_0px_0px_#000]">
            <span className="material-symbols-outlined text-[28px]">block</span>
          </div>
          <div>
            <h2 className="font-black text-xl text-black uppercase tracking-wide">
              Gestor de Lista Negra: IP & Dominios DNS
            </h2>
            <p className="text-xs font-bold text-gray-800">
              Bloqueo activo anti-VPN/Proxy y prevención de inyecciones maliciosas.
            </p>
          </div>
        </div>
        <div className="bg-white border-2 border-black px-4 py-2 font-black text-sm shadow-[3px_3px_0px_0px_#000]">
          Total Baneados: <span className="bg-[#FBCFE8] px-2 border border-black">{bans.length}</span>
        </div>
      </div>

      {/* Formulario para Agregar Baneo */}
      <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] flex flex-col gap-4">
        <h3 className="font-black text-sm uppercase tracking-wider text-black flex items-center gap-2 border-b-2 border-black pb-2">
          <span className="material-symbols-outlined text-[20px]">add_moderator</span>
          Agregar Nuevo Baneo (IP o Nombre de Dominio)
        </h3>

        {error && (
          <div className="bg-[#FECACA] border-2 border-black text-black font-bold text-xs p-3 shadow-[2px_2px_0px_0px_#000]">
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-[#A7F3D0] border-2 border-black text-black font-bold text-xs p-3 shadow-[2px_2px_0px_0px_#000]">
            ✅ {successMsg}
          </div>
        )}

        <form onSubmit={handleAddBan} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-black text-xs uppercase text-black">IP o Dominio DNS:</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Ej: 192.168.1.100 o maliciosos.com"
              className="bg-[#FAF7F2] border-2 border-black font-mono font-bold text-xs p-2.5 outline-none shadow-[2px_2px_0px_0px_#000] focus:bg-white"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-black text-xs uppercase text-black">Razón del Baneo:</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Ataque VPN / Ejecución sudo"
              className="bg-[#FAF7F2] border-2 border-black font-mono font-bold text-xs p-2.5 outline-none shadow-[2px_2px_0px_0px_#000] focus:bg-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FEF08A] hover:bg-[#FDE047] text-black font-black text-xs py-3 px-4 border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 uppercase cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              {loading ? 'Procesando...' : 'Aplicar Baneo'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Registros Baneados */}
      <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] flex flex-col gap-4">
        <h3 className="font-black text-sm uppercase tracking-wider text-black flex items-center gap-2 border-b-2 border-black pb-2">
          <span className="material-symbols-outlined text-[20px]">format_list_bulleted</span>
          Registros en Lista Negra (Filtro Activo)
        </h3>

        {bans.length === 0 ? (
          <div className="bg-[#FAF7F2] border-2 border-black p-6 text-center text-xs font-bold text-gray-700 shadow-[2px_2px_0px_0px_#000]">
            No hay baneos registrados actualmente. Los auto-baneos aparecerán aquí al detectar ataques.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#BAE6FD] border-2 border-black text-black font-black">
                  <th className="p-3 border-r-2 border-black">OBJETIVO (IP/DNS)</th>
                  <th className="p-3 border-r-2 border-black">RESOLUCIÓN CRUZADA</th>
                  <th className="p-3 border-r-2 border-black">RAZÓN DE BLOQUEO</th>
                  <th className="p-3 border-r-2 border-black">ORIGEN</th>
                  <th className="p-3 border-r-2 border-black">FECHA</th>
                  <th className="p-3">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {bans.map((b) => (
                  <tr key={b.id || b.target} className="border-b-2 border-black hover:bg-[#FEF08A]/30">
                    <td className="p-3 font-bold border-r-2 border-black">
                      <span className="bg-[#FBCFE8] px-2 py-0.5 border border-black">{b.target}</span>
                    </td>
                    <td className="p-3 border-r-2 border-black text-[11px]">
                      {b.resolved && b.resolved.length > 0 ? (
                        b.resolved.join(', ')
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="p-3 font-bold border-r-2 border-black text-red-700">{b.reason}</td>
                    <td className="p-3 border-r-2 border-black">
                      <span className={`px-2 py-0.5 border border-black font-bold ${b.banned_by === 'auto' ? 'bg-[#FED7AA]' : 'bg-[#DDD6FE]'}`}>
                        {b.banned_by === 'auto' ? 'AUTOMÁTICO' : 'MANUAL'}
                      </span>
                    </td>
                    <td className="p-3 border-r-2 border-black text-[10px]">
                      {new Date(b.banned_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleRemoveBan(b.target)}
                        className="bg-[#A7F3D0] hover:bg-[#6EE7B7] text-black font-bold text-[10px] px-2.5 py-1 border border-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                      >
                        DESBANEAR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
