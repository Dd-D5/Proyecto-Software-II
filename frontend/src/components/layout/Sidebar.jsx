import React, { useState } from 'react';

export default function Sidebar({ activeTab, onSelectTab }) {
  const [theme, setTheme] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('light') ? 'light' : 'dark'
  );

  // Toggle: classList + persistencia + transición scoped + evento para xterm
  // (sin prop drilling: Sidebar y TerminalFrame son lejanos en el árbol)
  const toggleTheme = () => {
    const isLight = document.documentElement.classList.toggle('light');
    document.documentElement.classList.add('theme-transition');
    setTimeout(() => document.documentElement.classList.remove('theme-transition'), 350);
    try {
      localStorage.setItem('aegistrap:theme', isLight ? 'light' : 'dark');
    } catch {}
    setTheme(isLight ? 'light' : 'dark');
    window.dispatchEvent(new CustomEvent('aegistrap:theme', { detail: isLight ? 'light' : 'dark' }));
  };

  return (
    <aside className="fixed left-0 top-0 w-16 bg-ink border-r border-edge-soft z-50 flex flex-col items-center justify-between py-4 select-none h-full">
      {/* Top: Logo & Main Navigation */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Brand Shield Icon */}
        <div className="flex flex-col items-center">
          <div
            className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-sm hover:scale-105 transition-transform cursor-pointer"
            title="AegisTrap Defense SOC"
            onClick={() => onSelectTab('terminal')}
          >
            <span className="material-symbols-outlined text-[22px]">shield</span>
          </div>
        </div>

        {/* Navigation Buttons */}
        <nav className="flex flex-col items-center gap-3 w-full">
          {/* Terminal / Live Terminal */}
          <button
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'terminal'
                ? 'bg-primary-container text-on-primary shadow-md shadow-primary-container/25 hover:brightness-110'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
            title="Live Terminal Multi-Widget"
            onClick={() => onSelectTab('terminal')}
          >
            <span className="material-symbols-outlined text-[22px]">terminal</span>
          </button>

          {/* Servicios (DNS/Server) */}
          <button
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'servicios'
                ? 'bg-primary-container text-on-primary shadow-md shadow-primary-container/25 hover:brightness-110'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
            title="Gestión de Honeypots & Servicios Falsos"
            onClick={() => onSelectTab('servicios')}
          >
            <span className="material-symbols-outlined text-[22px]">dns</span>
          </button>

          {/* Historial */}
          <button
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'historial'
                ? 'bg-primary-container text-on-primary shadow-md shadow-primary-container/25 hover:brightness-110'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
            title="Historial de ataques"
            onClick={() => onSelectTab('historial')}
          >
            <span className="material-symbols-outlined text-[22px]">history</span>
          </button>

          {/* Radar */}
          <button
            className="w-10 h-10 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors"
            title="Dashboard Telemetría Radar"
            onClick={() => onSelectTab('terminal')}
          >
            <span className="material-symbols-outlined text-[22px]">radar</span>
          </button>
        </nav>
      </div>

      {/* Bottom: Theme Toggle, Settings & Daemon Status Indicator */}
      <div className="flex flex-col items-center gap-3">
        {/* Toggle Modo Claro / Oscuro */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors"
          title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        <button
          className="w-10 h-10 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors"
          title="Configuración de Daemon & Sandboxes"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>

        <div className="relative flex items-center justify-center" title="Kernel Daemon Activo">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
          <span className="absolute w-4 h-4 rounded-full bg-primary/30 animate-ping"></span>
        </div>
      </div>
    </aside>
  );
}
