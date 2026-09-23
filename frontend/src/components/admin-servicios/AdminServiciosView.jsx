import React, { useState, useEffect } from 'react';
import DnsBanManagerView from './DnsBanManagerView';
import { apiFetch } from '../../services/api';

export default function AdminServiciosView() {
  const [subTab, setSubTab] = useState('honeypots'); // 'honeypots' | 'bans'
  const [honeypots, setHoneypots] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('http');
  const [port, setPort] = useState('');
  const [banner, setBanner] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchHoneypots = async () => {
    try {
      const response = await apiFetch('/api/honeypots');
      if (response.ok) {
        const data = await response.json();
        setHoneypots(data || []);
      }
    } catch (err) {
      console.error("Error obteniendo honeypots:", err);
    }
  };

  useEffect(() => {
    fetchHoneypots();
    const interval = setInterval(fetchHoneypots, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateHoneypot = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const portNum = parseInt(port, 10);
    if (!name.trim() || isNaN(portNum) || portNum <= 0) {
      setError('Por favor ingrese un nombre válido y un número de puerto correcto.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/api/honeypots', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          type: type,
          port: portNum,
          banner: banner.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al desplegar el honeypot');
      }

      setNotice(`Honeypot ${name} desplegado y escuchando en puerto ${portNum}`);
      setName('');
      setPort('');
      setBanner('');
      fetchHoneypots();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHoneypot = async (id) => {
    try {
      const response = await apiFetch('/api/honeypots/toggle', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        fetchHoneypots();
      }
    } catch (err) {
      setError('Error al cambiar estado del honeypot');
    }
  };

  const handleDeleteHoneypot = async (id) => {
    try {
      const response = await apiFetch(`/api/honeypots?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setNotice('Honeypot eliminado del panel.');
        fetchHoneypots();
      } else {
        const data = await response.json();
        setError(data.error || 'No se pudo eliminar el honeypot');
      }
    } catch (err) {
      setError('Error al eliminar honeypot');
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto select-none p-2 bg-[#FAF7F2]">
      {/* Selector Neobrutalista de Sub-Pestañas */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSubTab('honeypots')}
          className={`font-black text-xs px-4 py-2.5 border-3 border-black uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'honeypots'
              ? 'bg-[#A7F3D0] shadow-[4px_4px_0px_0px_#000]'
              : 'bg-white hover:bg-[#FEF08A] shadow-[2px_2px_0px_0px_#000]'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">dns</span>
            Gestión Dinámica de Honeypots
          </span>
        </button>

        <button
          onClick={() => setSubTab('bans')}
          className={`font-black text-xs px-4 py-2.5 border-3 border-black uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'bans'
              ? 'bg-[#FED7AA] shadow-[4px_4px_0px_0px_#000]'
              : 'bg-white hover:bg-[#FEF08A] shadow-[2px_2px_0px_0px_#000]'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">block</span>
            Lista Negra de IPs / Filtro DNS
          </span>
        </button>
      </div>

      {subTab === 'bans' ? (
        <DnsBanManagerView />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Header principal */}
          <div className="bg-[#BAE6FD] border-3 border-black p-5 shadow-[5px_5px_0px_0px_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center font-black text-black shadow-[3px_3px_0px_0px_#000]">
                <span className="material-symbols-outlined text-[28px]">deployed_code</span>
              </div>
              <div>
                <h1 className="font-black text-xl text-black uppercase tracking-wide">
                  Panel de Despliegue de Honeypots
                </h1>
                <p className="text-xs font-bold text-gray-800">
                  Adición y monitoreo dinámico de trampas de red (SSH, HTTP, FTP) en puertos personalizados.
                </p>
              </div>
            </div>

            {notice && (
              <div className="bg-[#A7F3D0] border-2 border-black text-black font-bold text-xs p-3 shadow-[3px_3px_0px_0px_#000]">
                ✅ {notice}
              </div>
            )}
          </div>

          {/* Form de creación de nuevos Honeypots */}
          <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] flex flex-col gap-4">
            <h3 className="font-black text-sm uppercase tracking-wider text-black flex items-center gap-2 border-b-2 border-black pb-2">
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Desplegar Nuevo Honeypot Dinámico
            </h3>

            {error && (
              <div className="bg-[#FECACA] border-2 border-black text-black font-bold text-xs p-3 shadow-[2px_2px_0px_0px_#000]">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleCreateHoneypot} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4 flex flex-col gap-1.5">
                <label className="font-black text-xs uppercase text-black">Nombre del Honeypot:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Servidor Web Interno Falso"
                  className="bg-[#FAF7F2] border-2 border-black font-mono font-bold text-xs p-2.5 outline-none shadow-[2px_2px_0px_0px_#000] focus:bg-white"
                  required
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="font-black text-xs uppercase text-black">Tipo de Servicio:</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="bg-[#FAF7F2] border-2 border-black font-mono font-bold text-xs p-2.5 outline-none shadow-[2px_2px_0px_0px_#000] focus:bg-white"
                >
                  <option value="http">HTTP / WEB</option>
                  <option value="ssh">SSH Daemon</option>
                  <option value="ftp">FTP Server</option>
                </select>
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="font-black text-xs uppercase text-black">Puerto Bind:</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="Ej: 8082"
                  className="bg-[#FAF7F2] border-2 border-black font-mono font-bold text-xs p-2.5 outline-none shadow-[2px_2px_0px_0px_#000] focus:bg-white"
                  required
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="font-black text-xs uppercase text-black">Banner Falso (Opcional):</label>
                <input
                  type="text"
                  value={banner}
                  onChange={(e) => setBanner(e.target.value)}
                  placeholder="Apache/2.4.52"
                  className="bg-[#FAF7F2] border-2 border-black font-mono font-bold text-xs p-2.5 outline-none shadow-[2px_2px_0px_0px_#000] focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#A7F3D0] hover:bg-[#6EE7B7] text-black font-black text-xs py-3 px-4 border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 uppercase cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                  {loading ? 'Lanzando...' : 'Desplegar'}
                </button>
              </div>
            </form>
          </div>

          {/* Tabla de Honeypots Activos */}
          <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] flex flex-col gap-4">
            <h3 className="font-black text-sm uppercase tracking-wider text-black flex items-center gap-2 border-b-2 border-black pb-2">
              <span className="material-symbols-outlined text-[20px]">layers</span>
              Honeypots Registrados en el Sistema
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-mono">
                <thead>
                  <tr className="bg-[#FEF08A] border-2 border-black text-black font-black">
                    <th className="p-3 border-r-2 border-black">TRAMPA / NOMBRE</th>
                    <th className="p-3 border-r-2 border-black">TIPO</th>
                    <th className="p-3 border-r-2 border-black">PUERTO BIND</th>
                    <th className="p-3 border-r-2 border-black">BANNER ENVIADO</th>
                    <th className="p-3 border-r-2 border-black">ESTADO</th>
                    <th className="p-3">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {honeypots.map((hp) => (
                    <tr key={hp.id} className="border-b-2 border-black hover:bg-[#BAE6FD]/20">
                      <td className="p-3 font-bold border-r-2 border-black flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">
                          {hp.type === 'ssh' ? 'terminal' : hp.type === 'ftp' ? 'folder_zip' : 'public'}
                        </span>
                        <span>{hp.name}</span>
                      </td>
                      <td className="p-3 uppercase font-bold border-r-2 border-black">
                        <span className="bg-[#DDD6FE] px-2 py-0.5 border border-black">{hp.type}</span>
                      </td>
                      <td className="p-3 font-bold border-r-2 border-black text-blue-800">:{hp.port}</td>
                      <td className="p-3 border-r-2 border-black text-[11px] text-gray-700">
                        {hp.banner || 'Apache / Standard'}
                      </td>
                      <td className="p-3 border-r-2 border-black">
                        <span className={`px-2 py-0.5 border border-black font-bold ${
                          hp.status === 'running' ? 'bg-[#A7F3D0]' : 'bg-[#FECACA]'
                        }`}>
                          {hp.status === 'running' ? '● ACTIVO' : '○ DETENIDO'}
                        </span>
                      </td>
                      <td className="p-3 space-x-2">
                        <button
                          onClick={() => handleToggleHoneypot(hp.id)}
                          className="bg-[#FEF08A] hover:bg-[#FDE047] text-black font-bold text-[10px] px-2.5 py-1 border border-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                        >
                          {hp.status === 'running' ? 'PAUSAR' : 'INICIAR'}
                        </button>
                        {hp.id !== 'default-ssh' && hp.id !== 'default-http' && hp.id !== 'default-ftp' && (
                          <button
                            onClick={() => handleDeleteHoneypot(hp.id)}
                            className="bg-[#FECACA] hover:bg-[#FCA5A5] text-black font-bold text-[10px] px-2.5 py-1 border border-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                          >
                            ELIMINAR
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
