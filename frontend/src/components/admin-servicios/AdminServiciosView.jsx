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
      console.error('Error obteniendo honeypots:', err);
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

  const inputCls = 'bg-surface-container border border-hairline-strong focus:border-primary font-label-code text-xs p-2.5 rounded-lg text-on-surface outline-none transition-colors';
  const labelCls = 'font-label-caps text-[10px] text-outline uppercase';

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto select-none p-1">
      {/* Selector de Sub-Pestañas */}
      <div className="flex items-center gap-2 bg-surface-container-lowest p-1 rounded-lg border border-hairline self-start">
        <button
          onClick={() => setSubTab('honeypots')}
          className={`font-label-caps text-label-caps uppercase px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-2 ${
            subTab === 'honeypots'
              ? 'bg-primary/10 text-primary-container border border-primary/30 font-semibold'
              : 'text-outline hover:text-on-surface hover:bg-surface-container border border-transparent'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">dns</span>
          Gestión Dinámica de Honeypots
        </button>

        <button
          onClick={() => setSubTab('bans')}
          className={`font-label-caps text-label-caps uppercase px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-2 ${
            subTab === 'bans'
              ? 'bg-error-container/10 text-error border border-error-container/30 font-semibold'
              : 'text-outline hover:text-on-surface hover:bg-surface-container border border-transparent'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">block</span>
          Lista Negra de IPs / Filtro DNS
        </button>
      </div>

      {subTab === 'bans' ? (
        <DnsBanManagerView />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Header principal */}
          <div className="bg-surface-container-low border border-hairline rounded-xl px-4 py-3 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[22px]">deployed_code</span>
              </div>
              <div>
                <h1 className="font-headline-sm text-headline-sm font-semibold tracking-tight text-on-surface">
                  Panel de Despliegue de Honeypots
                </h1>
                <p className="font-caption text-caption text-outline">
                  Adición y monitoreo dinámico de trampas de red (SSH, HTTP, FTP) en puertos personalizados.
                </p>
              </div>
            </div>

            {notice && (
              <div className="bg-primary/10 border border-primary/30 text-primary-container font-label-code text-xs p-3 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                {notice}
              </div>
            )}
          </div>

          {/* Form de creación de nuevos Honeypots */}
          <div className="bg-surface-container-low border border-hairline rounded-xl p-4 shadow-sm flex flex-col gap-4">
            <h3 className="font-label-caps text-label-caps text-on-surface uppercase flex items-center gap-2 border-b border-hairline pb-2">
              <span className="material-symbols-outlined text-[18px] text-primary-container">add_circle</span>
              Desplegar Nuevo Honeypot Dinámico
            </h3>

            {error && (
              <div className="bg-error-container/10 border border-error-container/30 text-error font-label-code text-xs p-3 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateHoneypot} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4 flex flex-col gap-1.5">
                <label className={labelCls}>Nombre del Honeypot:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Servidor Web Interno Falso"
                  className={inputCls}
                  required
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelCls}>Tipo de Servicio:</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={inputCls}
                >
                  <option value="http">HTTP / WEB</option>
                  <option value="ssh">SSH Daemon</option>
                  <option value="ftp">FTP Server</option>
                </select>
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelCls}>Puerto Bind:</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="Ej: 8082"
                  className={inputCls}
                  required
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className={labelCls}>Banner Falso (Opcional):</label>
                <input
                  type="text"
                  value={banner}
                  onChange={(e) => setBanner(e.target.value)}
                  placeholder="Apache/2.4.52"
                  className={inputCls}
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-caps text-label-caps uppercase font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                  {loading ? 'Lanzando...' : 'Desplegar'}
                </button>
              </div>
            </form>
          </div>

          {/* Tabla de Honeypots Activos */}
          <div className="bg-surface-container-low border border-hairline rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-hairline">
              <h3 className="font-label-caps text-label-caps text-on-surface uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">layers</span>
                Honeypots Registrados en el Sistema
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-label-code text-xs">
                <thead className="bg-surface-container border-b border-hairline font-label-caps text-[10px] text-outline uppercase">
                  <tr>
                    <th className="p-3">Trampa / Nombre</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Puerto Bind</th>
                    <th className="p-3">Banner Enviado</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-soft text-on-surface">
                  {honeypots.map((hp) => (
                    <tr key={hp.id} className="hover:bg-surface-container transition-colors">
                      <td className="p-3 font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-secondary">
                          {hp.type === 'ssh' ? 'terminal' : hp.type === 'ftp' ? 'folder_zip' : 'public'}
                        </span>
                        <span>{hp.name}</span>
                      </td>
                      <td className="p-3 uppercase font-semibold">
                        <span className="bg-tertiary/10 text-tertiary border border-tertiary/30 px-2 py-0.5 rounded">
                          {hp.type}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-primary-container">:{hp.port}</td>
                      <td className="p-3 text-[11px] text-outline">
                        {hp.banner || 'Apache / Standard'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-label-caps text-[9px] px-2 py-0.5 rounded border uppercase font-semibold ${
                            hp.status === 'running'
                              ? 'bg-primary/10 text-primary-container border-primary/20'
                              : 'bg-error-container/10 text-error border-error-container/30'
                          }`}
                        >
                          {hp.status === 'running' ? '● Activo' : '○ Detenido'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleToggleHoneypot(hp.id)}
                          className="bg-surface-container hover:bg-surface-bright text-on-surface font-label-caps text-[9px] uppercase font-semibold px-2.5 py-1 rounded border border-hairline-strong transition-colors cursor-pointer"
                        >
                          {hp.status === 'running' ? 'Pausar' : 'Iniciar'}
                        </button>
                        {hp.id !== 'default-ssh' && hp.id !== 'default-http' && hp.id !== 'default-ftp' && (
                          <button
                            onClick={() => handleDeleteHoneypot(hp.id)}
                            className="bg-error-container/10 hover:bg-error-container/20 text-error font-label-caps text-[9px] uppercase font-semibold px-2.5 py-1 rounded border border-error-container/30 transition-colors cursor-pointer"
                          >
                            Eliminar
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
