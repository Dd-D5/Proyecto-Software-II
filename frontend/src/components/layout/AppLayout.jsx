import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout({
  activeTab,
  onSelectTab,
  wsUrl,
  wsStatus,
  onLogout,
  onShieldClick,
  children
}) {
  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] text-black flex flex-row relative font-sans">
      {/* 1. Sidebar Dock (64px) */}
      <Sidebar activeTab={activeTab} onSelectTab={onSelectTab} onShieldClick={onShieldClick} />

      {/* 2. Área de Trabajo Principal (Header + Contenido) */}
      <div className="ml-16 flex-1 flex flex-col min-h-screen w-[calc(100%-4rem)]">
        <TopBar
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          wsUrl={wsUrl}
          wsStatus={wsStatus}
          onLogout={onLogout}
        />

        <main className="p-4 bg-[#FAF7F2] flex flex-col gap-4 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
