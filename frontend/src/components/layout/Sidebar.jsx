import React from 'react';

export default function Sidebar({ activeTab, onSelectTab, onShieldClick }) {
  const navItems = [
    { id: 'terminal', label: 'Terminal', icon: 'terminal', color: 'bg-[#A7F3D0]' },
    { id: 'servicios', label: 'Servicios', icon: 'dns', color: 'bg-[#BAE6FD]' },
    { id: 'historial', label: 'Historial', icon: 'history', color: 'bg-[#FEF08A]' },
  ];

  return (
    <aside className="fixed left-0 top-0 w-16 bg-[#FAF7F2] border-r-3 border-black z-50 flex flex-col items-center justify-between py-4 select-none h-full shadow-[4px_0px_0px_0px_#000]">
      {/* Icono de escudo superior */}
      <div className="flex flex-col items-center gap-6 w-full">
        <div
          className="w-10 h-10 bg-[#FEF08A] border-2 border-black flex items-center justify-center text-black font-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[-1px] cursor-pointer"
          title="AegisTrap SOC (Presionar 5 veces)"
          onClick={() => {
            onSelectTab('terminal');
            if (onShieldClick) onShieldClick();
          }}
        >
          <span className="material-symbols-outlined text-[24px]">shield</span>
        </div>

        {/* Botones de navegación */}
        <nav className="flex flex-col items-center gap-3 w-full px-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-10 h-10 border-2 border-black flex items-center justify-center transition-all cursor-pointer ${
                  isActive
                    ? `${item.color} shadow-[3px_3px_0px_0px_#000] translate-x-[-1px] font-black`
                    : 'bg-white hover:bg-[#FBCFE8] shadow-[2px_2px_0px_0px_#000]'
                }`}
                title={item.label}
              >
                <span className="material-symbols-outlined text-[20px] text-black">{item.icon}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Indicadores inferiores */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-3 h-3 bg-[#A7F3D0] border border-black animate-pulse shadow-[1px_1px_0px_0px_#000]" title="Kernel Honeypot Activo"></div>
      </div>
    </aside>
  );
}
