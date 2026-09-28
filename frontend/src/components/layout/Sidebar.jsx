import React, { useState } from 'react';

export default function Sidebar({ activeTab, onSelectTab, onShieldClick, onLogout }) {
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
          <button
            type="button"
            aria-label="AegisTrap — ir a la terminal en vivo"
            className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-sm hover:scale-105 transition-transform cursor-pointer"
            title="AegisTrap Defense SOC (presionar 5 veces)"
            onClick={() => {
              onSelectTab('terminal');
              if (onShieldClick) onShieldClick();
            }}
          >
            <span className="material-symbols-outlined text-[22px]">shield</span>
          </button>
        </div>

        {/* Navigation Buttons */}
        <nav className="flex flex-col items-center gap-3 w-full" aria-label="Navegación principal">
          {/* Terminal / Live Terminal */}
          <button
            aria-label="Live Terminal Multi-Widget"
            aria-current={activeTab === 'terminal' ? 'page' : undefined}
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
            aria-label="Gestión de Honeypots y Servicios"
            aria-current={activeTab === 'servicios' ? 'page' : undefined}
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
            aria-label="Historial de ataques"
            aria-current={activeTab === 'historial' ? 'page' : undefined}
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

          {/* Reporte Forense */}
          <button
            aria-label="Reporte Forense Post-Ataque"
            aria-current={activeTab === 'reporte' ? 'page' : undefined}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'reporte'
                ? 'bg-primary-container text-on-primary shadow-md shadow-primary-container/25 hover:brightness-110'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
            title="Reporte Forense Post-Ataque"
            onClick={() => onSelectTab('reporte')}
          >
            <span className="material-symbols-outlined text-[22px]">plagiarism</span>
          </button>
        </nav>
      </div>

      {/* Bottom: Theme Toggle, Logout & Daemon Status Indicator */}
      <div className="flex flex-col items-center gap-3">
        {/* Toggle Modo Claro / Oscuro */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          className="w-10 h-10 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors"
          title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            aria-label="Cerrar sesión del SOC"
            className="w-10 h-10 rounded-xl text-error hover:bg-error-container/10 flex items-center justify-center transition-colors"
            title="Cerrar sesión del SOC"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        )}

      </div>
    </aside>
  );
}
