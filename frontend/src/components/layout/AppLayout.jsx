import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout({
  activeTab,
  onSelectTab,
  wsUrl,
  wsStatus,
  children
}) {
  return (
    <div className="min-h-screen w-full bg-background text-on-surface flex flex-col relative font-sans">
      {/* 1. Sidebar Dock (64px) */}
      <Sidebar activeTab={activeTab} onSelectTab={onSelectTab} />

      {/* 2. Top Header (h-14 / 56px) */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        wsUrl={wsUrl}
        wsStatus={wsStatus}
      />

      {/* 3. Main Workspace Area */}
      <main className="ml-16 mt-14 px-6 pt-4 pb-6 bg-background flex flex-col gap-4 h-[calc(100vh-3.5rem)] w-[calc(100%-4rem)] overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
