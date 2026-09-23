import React from 'react';

export default function TopBar({ activeTab, onSelectTab, wsUrl = 'ws://127.0.0.1:8080/ws', wsStatus = 'conectado', onLogout }) {
  const tabs = [
    { id: 'terminal', label: 'Live Terminal', icon: 'terminal' },
    { id: 'servicios', label: 'Gestión & Honeypots', icon: 'dns' },
    { id: 'historial', label: 'Historial de Ataques', icon: 'history' }
  ];

  return (
    <header className="sticky top-0 w-full bg-[#FAF7F2] border-b-3 border-black z-40 flex items-center justify-between px-4 sm:px-6 py-2.5 flex-wrap gap-2 shadow-[0px_4px_0px_0px_#000]">
      {/* Marca & Pestañas */}
      <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
        <div 
          className="flex items-center gap-2 cursor-pointer bg-[#FEF08A] border-2 border-black px-3 py-1 shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
          onClick={() => onSelectTab('terminal')}
        >
          <span className="font-black text-base sm:text-lg tracking-tight text-black">AEGISTRAP</span>
          <span className="font-black text-[9px] sm:text-[10px] bg-[#A7F3D0] border border-black px-1.5 py-0.5 text-black uppercase">
            v2.0 SOC
          </span>
        </div>

        <nav className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 font-bold text-[10px] sm:text-xs uppercase flex items-center gap-1.5 border-2 border-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#A7F3D0] text-black shadow-[3px_3px_0px_0px_#000] font-black'
                    : 'bg-white text-black hover:bg-[#BAE6FD] shadow-[2px_2px_0px_0px_#000]'
                }`}
              >
                <span className="material-symbols-outlined text-[14px] sm:text-[16px]">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="inline sm:hidden">{tab.id.toUpperCase()}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Derecha: Indicador LAN & Sesión */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Indicador WebSocket */}
        <div className="hidden md:flex items-center gap-1.5 sm:gap-2 bg-white border-2 border-black px-2 sm:px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
          <span className="material-symbols-outlined text-black text-[14px] sm:text-[16px]">wifi_tethering</span>
          <span className="font-black text-[9px] sm:text-[10px] uppercase text-black">WS:</span>
          <span className="font-mono text-[10px] sm:text-xs font-bold text-black truncate max-w-[120px] sm:max-w-xs">
            {wsUrl}
          </span>
          <span className={`px-1.5 sm:px-2 py-0.5 border border-black text-[8px] sm:text-[9px] font-black uppercase ${
            wsStatus === 'conectado' ? 'bg-[#A7F3D0]' : 'bg-[#FECACA]'
          }`}>
            {wsStatus}
          </span>
        </div>

        {/* Badge de Operador & Botón Logout */}
        <div className="flex items-center gap-1.5 bg-[#DDD6FE] border-2 border-black px-2 sm:px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-black animate-pulse"></span>
          <span className="font-black text-[10px] sm:text-xs text-black">ADMIN_SOC</span>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            title="Cerrar Sesión"
            className="bg-[#FECACA] hover:bg-[#FCA5A5] text-black font-black text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000] cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
          >
            SALIR
          </button>
        )}
      </div>
    </header>
  );
}
