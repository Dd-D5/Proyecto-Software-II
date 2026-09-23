import React, { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import LiveTerminalView from '../components/live-terminal/LiveTerminalView';
import AdminServiciosView from '../components/admin-servicios/AdminServiciosView';
import AttackHistoryView from '../components/history/AttackHistoryView';
import { useWebSocket } from '../hooks/useWebSocket';
import { ServiceType } from '../services/types';

export default function DashboardView() {
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' | 'servicios' | 'historial'
  const [activeService, setActiveService] = useState(ServiceType.SSH);

  // Hook WebSocket compartido para toda la aplicación
  const {
    status: wsStatus,
    wsUrl,
    attackerIp,
    attackerMac,
    sessionId,
    keystrokes,
    isPaused,
    breachByService,
    keystrokeCountByService,
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
      {/*
       * ESTRATEGIA 1: Todas las vistas permanecen montadas en el DOM.
       * La visibilidad se controla únicamente por CSS (hidden / block),
       * lo que preserva el buffer de xterm.js y el historial del
       * Inspector de Pulsaciones sin importar cuántas veces se cambie
       * entre pestañas.
       */}

      {/* Vista 1: Live Terminal — siempre montada, visible solo si activeTab === 'terminal' */}
      <div className={activeTab === 'terminal' ? 'flex flex-col flex-1 h-full' : 'hidden'}>
        <LiveTerminalView
          activeService={activeService}
          onSelectService={setActiveService}
          wsUrl={wsUrl}
          attackerIp={attackerIp}
          attackerMac={attackerMac}
          sessionId={sessionId}
          keystrokes={keystrokes}
          isPaused={isPaused}
          breachByService={breachByService}
          keystrokeCountByService={keystrokeCountByService}
          onTogglePause={togglePause}
          registerTerminalListener={registerTerminalListener}
        />
      </div>

      {/* Vista 2: Gestión de Servicios — siempre montada, visible solo si activeTab === 'servicios' */}
      <div className={activeTab === 'servicios' ? 'flex flex-col flex-1 h-full' : 'hidden'}>
        <AdminServiciosView />
      </div>

      {/* Vista 3: Historial de ataques — siempre montada, visible solo si activeTab === 'historial' */}
      <div className={activeTab === 'historial' ? 'flex flex-col flex-1 h-full' : 'hidden'}>
        <AttackHistoryView />
      </div>
    </AppLayout>
  );
}
