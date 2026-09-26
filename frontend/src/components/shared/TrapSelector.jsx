import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../services/api';

// ponytail: SONDEADO se deriva de keystrokeCountByService (actividad IO sin sesión
// activa). No hay estado dedicado en el backend. Upgrade path: emitir un evento
// "probe" real si se necesita distinguir sondeo de conexión.
const serviceState = (isBreached, activity) => {
  if (isBreached) return 'ALERTA';
  return 'ESPERA';
};

export default function TrapSelector({
  activeService = 'ssh:2222',
  onSelectService,
  onNavigateToAdmin,
  wsUrl = 'ws://127.0.0.1:8080/ws',
  breachByService = {},
  keystrokeCountByService = {}
}) {
  const [honeypotsList, setHoneypotsList] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Chips default
  const defaultHoneypots = [
    { key: 'ssh:2222', label: 'SSH', port: ':2222' },
    { key: 'http:8081', label: 'HTTP', port: ':8081' },
    { key: 'ftp:2121', label: 'FTP', port: ':2121' }
  ];

  // Obtener honeypots configurados desde la API
  const fetchCustomHoneypots = async () => {
    try {
      const res = await apiFetch('/api/honeypots');
      if (res.ok) {
        const data = await res.json();
        setHoneypotsList(data || []);
      }
    } catch (e) {
      // Ignorar fallo de red si backend reconecta
    }
  };

  useEffect(() => {
    fetchCustomHoneypots();
    const interval = setInterval(fetchCustomHoneypots, 4000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar al hacer clic fuera del menú
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleHoneypot = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await apiFetch('/api/honeypots/toggle', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchCustomHoneypots();
      }
    } catch (err) {
      console.error('Error al conmutar estado:', err);
    }
  };

  const handleDeleteHoneypot = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/honeypots?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchCustomHoneypots();
      }
    } catch (err) {
      console.error('Error al eliminar honeypot:', err);
    }
  };

  // Filtrar honeypots dinámicos agregados por el admin
  const customHoneypots = honeypotsList.filter(
    (hp) => !['ssh-2222', 'ftp-2121', 'http-8081'].includes(hp.id)
  );

  const anyBreach = Object.values(breachByService).some(Boolean);
  const anyCustomBreach = customHoneypots.some(
    (hp) => !!breachByService[`${hp.type}:${hp.port}`]
  );

  const dotClass = {
    ALERTA: 'bg-error',
    SONDEADO: 'bg-tertiary',
    ESPERA: 'bg-secondary-container'
  };
  const badgeClass = {
    ALERTA: 'bg-error text-ink font-bold',
    SONDEADO: 'bg-surface-container-high text-outline font-medium',
    ESPERA: 'bg-surface-container-high text-outline font-medium'
  };

  return (
    <section className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low border border-hairline shadow-sm relative">
      {/* Left Meta */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center border border-outline-variant text-primary-container shrink-0">
          <span className="material-symbols-outlined text-[22px]">security</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-headline-sm text-headline-sm font-semibold tracking-tight text-on-surface">
              Centro de Mando: Telemetría & Detección Activa
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary-container font-label-caps text-label-caps font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Canal Seguro WebSocket Sincronizado
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-body-sm text-body-sm text-outline">Monitor Forense de Ciberdefensa</p>
            <span className="flex items-center gap-1.5 bg-surface-container-lowest border border-hairline px-2 py-0.5 rounded-lg font-mono-sm text-mono-sm text-secondary">
              <span className="material-symbols-outlined text-[13px]">wifi_tethering</span>
              <span className="truncate max-w-[240px]" id="active-ws-node">{wsUrl}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Center Threat State Indicator */}
      <div
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border ${
          anyBreach
            ? 'bg-error-container/10 border-error-container/30'
            : 'bg-primary/10 border-primary/30'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${anyBreach ? 'bg-error-container animate-ping' : 'bg-primary'} `}></span>
        <span className="font-label-code text-label-code text-on-surface font-medium">
          Estado General de Amenaza:{' '}
          <span className={anyBreach ? 'text-error font-semibold' : 'text-primary font-semibold'}>
            {anyBreach ? 'Intrusión Aislada en Sandbox (Bajo Control)' : 'Perímetro Estable · Sin Intrusión Activa'}
          </span>
        </span>
      </div>

      {/* Right Honeypot Selector + Dynamic Dropdown */}
      <div className="flex items-center gap-1.5 bg-ink p-1 rounded-lg border border-hairline relative">
        {/* Default Services Chips */}
        {defaultHoneypots.map((hp) => {
          const isActive = activeService === hp.key;
          const state = serviceState(!!breachByService[hp.key], keystrokeCountByService[hp.key] || 0);
          return (
            <button
              key={hp.key}
              onClick={() => onSelectService && onSelectService(hp.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all ${
                isActive
                  ? 'bg-surface-container-high border border-hairline-strong shadow-sm'
                  : 'text-outline hover:text-on-surface hover:bg-surface-container border border-transparent'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dotClass[state]}`}></span>
              <span className="font-label-code text-label-code text-on-surface font-medium">
                {hp.label} {hp.port}
              </span>
              <span className={`font-label-caps text-[10px] px-1 py-0.2 rounded uppercase tracking-wider ${badgeClass[state]}`}>
                {state.charAt(0) + state.slice(1).toLowerCase()}
              </span>
            </button>
          );
        })}

        {/* Dropdown Button for Admin Custom Honeypots */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all font-mono-sm text-xs border ${
              dropdownOpen || anyCustomBreach
                ? 'bg-secondary/20 border-secondary/50 text-secondary font-bold shadow-sm'
                : 'bg-surface-container/60 hover:bg-surface-container text-on-surface border-hairline'
            }`}
            title="Gestión de Honeypots Personalizados creados por el Administrador"
          >
            <span className="material-symbols-outlined text-[15px]">tune</span>
            <span>Trampas Admin ({customHoneypots.length})</span>
            {anyCustomBreach && (
              <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
            )}
            <span className="material-symbols-outlined text-[14px]">
              {dropdownOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {/* Popover Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-hairline-strong rounded-xl shadow-2xl z-50 p-2 text-on-surface animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-hairline">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[16px]">dns</span>
                  <span className="font-label-caps text-[11px] font-bold uppercase tracking-wider text-on-surface">
                    Honeypots Administrador
                  </span>
                </div>
                <span className="font-mono-sm text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded font-semibold">
                  {customHoneypots.length} activos
                </span>
              </div>

              {/* List of Custom Honeypots */}
              <div className="max-h-60 overflow-y-auto my-1 flex flex-col gap-1 px-1">
                {customHoneypots.length === 0 ? (
                  <div className="p-4 text-center text-outline text-xs flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined text-[20px]">layers_clear</span>
                    <span>No hay honeypots personalizados desplegados.</span>
                  </div>
                ) : (
                  customHoneypots.map((hp) => {
                    const instanceKey = `${hp.type}:${hp.port}`;
                    const isSelected = activeService === instanceKey;
                    const isBreached = !!breachByService[instanceKey];
                    const isRunning = hp.status === 'running';

                    return (
                      <div
                        key={hp.id}
                        onClick={() => {
                          if (onSelectService) onSelectService(instanceKey);
                          if (onNavigateToAdmin) onNavigateToAdmin('terminal');
                          setDropdownOpen(false);
                        }}
                        className={`group flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-surface-container-high border-secondary/40'
                            : 'bg-surface-container-low/50 hover:bg-surface-container-low border-hairline'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isBreached
                                ? 'bg-error animate-ping'
                                : isRunning
                                ? 'bg-emerald-400'
                                : 'bg-outline'
                            }`}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[12px] truncate text-on-surface group-hover:text-primary">
                              {hp.name}
                            </span>
                            <span className="font-mono-sm text-[10px] text-outline">
                              {hp.type.toUpperCase()} :{hp.port} · {isRunning ? 'ACTIVO' : 'PAUSADO'}
                            </span>
                          </div>
                        </div>

                        {/* Quick Actions per Honeypot */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => handleToggleHoneypot(hp.id, e)}
                            className={`p-1 rounded hover:bg-surface-container transition text-[13px] ${
                              isRunning ? 'text-emerald-400 hover:text-emerald-300' : 'text-outline hover:text-on-surface'
                            }`}
                            title={isRunning ? 'Pausar Honeypot' : 'Activar Honeypot'}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isRunning ? 'pause_circle' : 'play_circle'}
                            </span>
                          </button>

                          <button
                            onClick={(e) => handleDeleteHoneypot(hp.id, e)}
                            className="p-1 rounded hover:bg-error/20 text-outline hover:text-error transition text-[13px]"
                            title="Eliminar Honeypot"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Quick Deploy Link */}
              <div className="pt-2 border-t border-hairline mt-1">
                <button
                  onClick={() => {
                    if (onNavigateToAdmin) onNavigateToAdmin('servicios');
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 font-bold font-mono-sm text-xs rounded-lg transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">add_box</span>
                  <span>+ Desplegar en Panel Admin</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

