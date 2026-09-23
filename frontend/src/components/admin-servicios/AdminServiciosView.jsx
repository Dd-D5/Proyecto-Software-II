import React, { useState } from 'react';
import ServiceList from './ServiceList';

const INITIAL_SERVICES = [
  {
    id: 'ssh',
    name: 'SSH Honeypot Daemon (Cowrie / Dionaea)',
    port: ':2222',
    protocol: 'TCP / SSH-2.0',
    sandbox: 'cgroup-v2 / chroot',
    status: 'BREACH',
    activeSessions: 1,
    icon: 'terminal'
  },
  {
    id: 'ftp',
    name: 'FTP Decoy Daemon (ProFTPd Fake)',
    port: ':2121',
    protocol: 'TCP / FTP',
    sandbox: 'v2-isolated',
    status: 'ACTIVO',
    activeSessions: 0,
    icon: 'dns'
  },
  {
    id: 'http',
    name: 'HTTP Fake Administration Portal',
    port: ':8080',
    protocol: 'HTTP/1.1 REST',
    sandbox: 'cgroup-isolated',
    status: 'ACTIVO',
    activeSessions: 4,
    icon: 'public'
  },
  {
    id: 'rdp',
    name: 'RDP BlueKeep Decoy Receptor',
    port: ':3389',
    protocol: 'TCP / RDP',
    sandbox: 'v2-isolated',
    status: 'INACTIVO',
    activeSessions: 0,
    icon: 'desktop_windows'
  }
];

export default function AdminServiciosView() {
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [newServiceName, setNewServiceName] = useState('');
  const [newPort, setNewPort] = useState('');
  const [newProtocol, setNewProtocol] = useState('TCP');
  const [notice, setNotice] = useState(null);

  const handleToggle = (id) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: s.status === 'INACTIVO' ? 'ACTIVO' : 'INACTIVO',
              activeSessions: s.status === 'INACTIVO' ? 0 : 0
            }
          : s
      )
    );
    setNotice(`Servicio ${id.toUpperCase()} actualizado.`);
    setTimeout(() => setNotice(null), 2500);
  };

  const handleRestart = (id) => {
    setNotice(`Reiniciando sandbox para trampa ${id.toUpperCase()}...`);
    setTimeout(() => {
      setNotice(`Trampa ${id.toUpperCase()} reiniciada nominalmente.`);
      setTimeout(() => setNotice(null), 2500);
    }, 1200);
  };

  const handleAddService = (e) => {
    e.preventDefault();
    if (!newServiceName || !newPort) return;

    const newEntry = {
      id: `custom_${Date.now()}`,
      name: newServiceName,
      port: newPort.startsWith(':') ? newPort : `:${newPort}`,
      protocol: newProtocol,
      sandbox: 'cgroup-v2',
      status: 'ACTIVO',
      activeSessions: 0,
      icon: 'settings_input_component'
    };

    setServices((prev) => [...prev, newEntry]);
    setNewServiceName('');
    setNewPort('');
    setNotice(`Honeypot ${newEntry.name} desplegado en puerto ${newEntry.port}.`);
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto select-none p-1">
      {/* Top Banner */}
      <section className="bg-surface-container-low border border-hairline rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary border border-outline-variant/30">
            <span className="material-symbols-outlined text-[20px]">dns</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-[17px] text-on-surface font-bold">
                Gestión de Honeypots &amp; Servicios Falsos
              </h1>
              <span className="font-label-caps text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-bold uppercase">
                ACTIVE DEFENSE
              </span>
            </div>
            <p className="font-mono-sm text-[11px] text-outline">
              Supervisión de trampas de red activas, bind de sockets y políticas de jaula en sandbox.
            </p>
          </div>
        </div>

        {notice && (
          <div className="font-mono-sm text-[11px] text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/30 animate-fade-in">
            {notice}
          </div>
        )}
      </section>

      {/* Services Table */}
      <ServiceList
        services={services}
        onToggleService={handleToggle}
        onRestartService={handleRestart}
      />

      {/* Deploy New Trap Form */}
      <section className="bg-surface-container-low border border-hairline rounded-xl p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-2 border-b border-hairline pb-2">
          <span className="material-symbols-outlined text-secondary text-[18px]">add_moderator</span>
          <h2 className="font-title-md text-[13px] text-on-surface font-bold">
            Desplegar Nueva Trampa / Servicio de Emulación
          </h2>
        </div>

        <form onSubmit={handleAddService} className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-5 flex flex-col gap-1">
            <label className="font-label-caps text-[9px] text-outline uppercase tracking-wider">
              Nombre de la Trampa
            </label>
            <input
              type="text"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="Ej: MySQL Decoy Daemon v8.0"
              className="bg-surface-container-lowest border border-hairline rounded-lg px-3 py-1.5 font-mono-sm text-[11px] text-on-surface focus:outline-none focus:border-secondary"
            />
          </div>

          <div className="col-span-3 flex flex-col gap-1">
            <label className="font-label-caps text-[9px] text-outline uppercase tracking-wider">
              Puerto Local (Bind)
            </label>
            <input
              type="text"
              value={newPort}
              onChange={(e) => setNewPort(e.target.value)}
              placeholder=":3306"
              className="bg-surface-container-lowest border border-hairline rounded-lg px-3 py-1.5 font-mono-sm text-[11px] text-on-surface focus:outline-none focus:border-secondary"
            />
          </div>

          <div className="col-span-2 flex flex-col gap-1">
            <label className="font-label-caps text-[9px] text-outline uppercase tracking-wider">
              Protocolo
            </label>
            <select
              value={newProtocol}
              onChange={(e) => setNewProtocol(e.target.value)}
              className="bg-surface-container-lowest border border-hairline rounded-lg px-3 py-1.5 font-mono-sm text-[11px] text-on-surface focus:outline-none focus:border-secondary"
            >
              <option value="TCP">TCP</option>
              <option value="UDP">UDP</option>
              <option value="HTTP">HTTP/HTTPS</option>
              <option value="SSH">SSH-2</option>
            </select>
          </div>

          <div className="col-span-2">
            <button
              type="submit"
              className="w-full bg-primary-container hover:brightness-110 text-on-primary font-bold font-mono-sm text-[11px] py-2 px-3 rounded-lg shadow transition-all"
            >
              + Desplegar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
