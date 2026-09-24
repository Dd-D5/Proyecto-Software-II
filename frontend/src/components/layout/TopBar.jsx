import React from 'react';
import { wsClient } from '../../services/wsClient';

// Estado visual del enlace WS + reintento manual al click (connect() es idempotente)
const WS_STATUS = {
  conectado: { label: 'Conectado', cls: 'bg-primary/10 text-primary-container border-primary/20', dot: 'bg-primary' },
  conectando: { label: 'Conectando', cls: 'bg-tertiary/10 text-tertiary border-tertiary/30', dot: 'bg-tertiary animate-pulse' },
  desconectado: { label: 'Desconectado', cls: 'bg-error-container/10 text-error border-error-container/30', dot: 'bg-error' }
};

export default function TopBar({ activeTab, onSelectTab, wsStatus = 'desconectado' }) {
  const tabs = [
    { id: 'terminal', label: 'Live Terminal' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'historial', label: 'Historial' },
    { id: 'reporte', label: 'Reporte' }
  ];

  return (
    <header className="fixed top-0 left-16 h-14 bg-ink/90 backdrop-blur-md border-b border-edge-soft z-40 flex items-center justify-between px-6 shadow-sm w-[calc(100%-4rem)]">
      {/* Brand and Tab Navigation */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelectTab('terminal')}>
          <span className="material-symbols-outlined text-primary text-[22px]">shield</span>
          <span className="font-title-lg text-[17px] font-bold tracking-tight text-on-surface">
            Aegis<span className="text-primary-container">Trap</span>
          </span>
          
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-mono-sm text-mono-sm flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-surface-container-high text-primary font-semibold border border-primary/20 shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right: WS status & Operator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => wsClient.connect()}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-label-caps text-label-caps font-semibold uppercase transition-colors ${WS_STATUS[wsStatus]?.cls || WS_STATUS.desconectado.cls}`}
          title={wsStatus === 'desconectado' ? 'Click para reintentar conexión' : `WebSocket: ${wsStatus}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${WS_STATUS[wsStatus]?.dot || WS_STATUS.desconectado.dot}`}></span>
          {WS_STATUS[wsStatus]?.label || 'Desconectado'}
        </button>

        <div className="flex items-center gap-2 bg-surface-container-low border border-hairline px-3 py-1 rounded-lg">
          <div className="flex flex-col items-end leading-tight">
            <span className="font-mono-sm text-[11px] text-on-surface font-semibold">sec-ops@node-01</span>
            <span className="font-label-caps text-[8px] text-outline uppercase tracking-wider">SOC Admin</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-[15px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
