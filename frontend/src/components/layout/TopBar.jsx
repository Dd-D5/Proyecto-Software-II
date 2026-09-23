import React from 'react';

export default function TopBar({ activeTab, onSelectTab, wsUrl = 'ws://127.0.0.1:8080/stream/pts3', wsStatus = 'conectado' }) {
  // Tabs definition
  const tabs = [
    { id: 'terminal', label: 'Live Terminal' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'historial', label: 'Historial' }
  ];

  return (
    <header className="fixed top-0 left-16 h-14 bg-[#0f131c]/90 backdrop-blur-md border-b border-[#1e2330] z-40 flex items-center justify-between px-6 shadow-sm w-[calc(100%-4rem)]">
      {/* Brand and Tab Navigation */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelectTab('terminal')}>
          <span className="font-title-lg text-title-lg font-bold tracking-tight text-on-surface">AEGISTRAP</span>
          <span className="font-label-caps text-[10px] bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
            v4.2-SEC
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

      {/* Right: LAN WS & Operator Badges */}
      <div className="flex items-center gap-3">
        {/* LAN WS Indicator */}
        <div className="flex items-center gap-2 bg-surface-container-lowest border border-[#1e2330] px-3 py-1 rounded-lg">
          <span className="material-symbols-outlined text-secondary text-[15px]">wifi_tethering</span>
          <span className="font-label-caps text-label-caps text-outline uppercase">LAN:</span>
          <span className="font-mono-sm text-mono-sm text-secondary font-medium truncate max-w-xs" id="lan-ws-url">
            {wsUrl}
          </span>
          <span className="font-label-caps text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
            DHCP
          </span>
        </div>

        {/* Operator Badge */}
        <div className="flex items-center gap-2 bg-surface-container-low border border-[#1e2330] px-2.5 py-1 rounded-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              wsStatus === 'conectado'
                ? 'bg-primary animate-pulse'
                : wsStatus === 'conectando'
                ? 'bg-tertiary animate-pulse'
                : 'bg-error'
            }`}
          ></span>
          <span className="font-mono-sm text-mono-sm text-on-surface font-semibold">OPERATOR_0X8F</span>
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[#003824]">
            <span className="material-symbols-outlined text-[14px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
