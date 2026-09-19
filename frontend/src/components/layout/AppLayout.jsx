import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Footer from './Footer';

export default function AppLayout({
  activeTab,
  onSelectTab,
  wsUrl,
  wsStatus,
  children
}) {
  return (
    <div className="min-h-screen w-full bg-[#0f131c] text-[#dfe2ef] flex flex-col relative font-sans">
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
      <main className="ml-16 mt-14 mb-10 px-4 pt-3 pb-8 bg-[#0f131c] flex flex-col gap-3 h-[calc(100vh-3.5rem-2.5rem)] w-[calc(100%-4rem)] overflow-y-auto">
        {children}
      </main>

      {/* 4. Footer Status Bar (h-10 / 40px) */}
      <Footer />
    </div>
  );
}
