import React, { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import LiveTerminalView from '../components/live-terminal/LiveTerminalView';
import AdminServiciosView from '../components/admin-servicios/AdminServiciosView';
import { useWebSocket } from '../hooks/useWebSocket';
import { ServiceType } from '../services/types';

export default function DashboardView() {
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' | 'servicios'
  const [activeService, setActiveService] = useState(ServiceType.SSH);

  // Hook WebSocket compartido para toda la aplicación
  const {
    status: wsStatus,
    wsUrl,
    attackerIp,
    attackerMac,
    keystrokes,
    isPaused,
    togglePause,
    registerTerminalListener
  } = useWebSocket(activeService);

  return (
    <AppLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      wsUrl={wsUrl}
      wsStatus={wsStatus}
    >
      {/* Vista 1: Live Terminal (Pestaña Principal) */}
      {activeTab === 'terminal' && (
        <LiveTerminalView
          activeService={activeService}
          onSelectService={setActiveService}
          wsUrl={wsUrl}
          attackerIp={attackerIp}
          attackerMac={attackerMac}
          keystrokes={keystrokes}
          isPaused={isPaused}
          onTogglePause={togglePause}
          registerTerminalListener={registerTerminalListener}
        />
      )}

      {/* Vista 2: Gestión de Servicios */}
      {activeTab === 'servicios' && <AdminServiciosView />}
    </AppLayout>
  );
}
