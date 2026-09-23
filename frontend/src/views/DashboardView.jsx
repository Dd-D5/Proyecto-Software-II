import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import LiveTerminalView from '../components/live-terminal/LiveTerminalView';
import AdminServiciosView from '../components/admin-servicios/AdminServiciosView';
import AttackHistoryView from '../components/history/AttackHistoryView';
import LoginView from '../components/auth/LoginView';
import DevModeBanner from '../components/shared/DevModeBanner';
import { useWebSocket } from '../hooks/useWebSocket';
import { ServiceType } from '../services/types';
import { wsClient } from '../services/wsClient';

const KONAMI_CODE = ['w', 'w', 's', 's', 'a', 'd', 'a', 'd', 'b', 'a'];

export default function DashboardView() {
  const [token, setToken] = useState(() => localStorage.getItem('aegis_token') || '');
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' | 'servicios' | 'historial'
  const [activeService, setActiveService] = useState(ServiceType.SSH);
  const [shieldClicks, setShieldClicks] = useState(0);
  const [konamiUnlocked, setKonamiUnlocked] = useState(false);
  const [devModeActive, setDevModeActive] = useState(false);
  const [devHintMsg, setDevHintMsg] = useState(null);

  const keyBufferRef = useRef([]);
  const clickTimerRef = useRef(null);

  const handleLoginSuccess = (newToken) => {
    setToken(newToken);
    localStorage.setItem('aegis_token', newToken);
    wsClient.connect();
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('aegis_token');
    wsClient.disconnect();
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      handleLogout();
    };
    window.addEventListener('aegis_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('aegis_unauthorized', handleUnauthorized);
  }, []);

  // Manejo de 5 clics en el icono del Escudo AegisTrap
  const handleShieldClick = () => {
    setShieldClicks((prev) => {
      const next = prev + 1;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => setShieldClicks(0), 4000);

      if (next >= 5) {
        setKonamiUnlocked(true);
        setDevHintMsg('🛡️ ESCUDO CLICKLEADO 5 VECES: Introduzca el Código Konami (W,W,S,S,A,D,A,D,B,A)');
        setTimeout(() => setDevHintMsg(null), 8000);
      }
      return next;
    });
  };

  // Escuchador del Código Konami (W, W, S, S, A, D, A, D, B, A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      // Si la tecla es una de las del código Konami
      if (['w', 's', 'a', 'd', 'b'].includes(key)) {
        keyBufferRef.current = [...keyBufferRef.current, key].slice(-10);
        const currentSeq = keyBufferRef.current.join(',');
        const targetSeq = KONAMI_CODE.join(',');

        if (currentSeq === targetSeq) {
          setDevModeActive(true);
          setDevHintMsg('🔓 MODO DESARROLLADOR ACTIVADO: Permisos de Administrador Master Concedidos!');
          setTimeout(() => setDevHintMsg(null), 6000);
          keyBufferRef.current = [];
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Hook WebSocket compartido para toda la aplicación
  const {
    status: wsStatus,
    wsUrl,
    attackerIp,
    attackerMac,
    attackerGeo,
    sessionId,
    systemStats,
    keystrokes,
    isPaused,
    breachByService,
    keystrokeCountByService,
    togglePause,
    registerTerminalListener
  } = useWebSocket(activeService);

  if (!token) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AppLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      wsUrl={wsUrl}
      wsStatus={wsStatus}
      onLogout={handleLogout}
      onShieldClick={handleShieldClick}
    >
      {/* Banner de Pista / Mensaje Dev */}
      {devHintMsg && (
        <div className="bg-[#A7F3D0] border-3 border-black text-black font-black text-xs p-3 shadow-[4px_4px_0px_0px_#000] animate-pulse">
          {devHintMsg}
        </div>
      )}

      {/* Banner de Modo Desarrollador Desbloqueado */}
      {devModeActive && (
        <DevModeBanner onClose={() => setDevModeActive(false)} />
      )}

      {/* Vista 1: Live Terminal */}
      <div className={activeTab === 'terminal' ? 'flex flex-col flex-1 h-full' : 'hidden'}>
        <LiveTerminalView
          activeService={activeService}
          onSelectService={setActiveService}
          wsUrl={wsUrl}
          attackerIp={attackerIp}
          attackerMac={attackerMac}
          attackerGeo={attackerGeo}
          sessionId={sessionId}
          systemStats={systemStats}
          keystrokes={keystrokes}
          isPaused={isPaused}
          breachByService={breachByService}
          keystrokeCountByService={keystrokeCountByService}
          onTogglePause={togglePause}
          registerTerminalListener={registerTerminalListener}
        />
      </div>

      {/* Vista 2: Gestión de Servicios y Honeypots Dinámicos */}
      <div className={activeTab === 'servicios' ? 'flex flex-col flex-1 h-full' : 'hidden'}>
        <AdminServiciosView />
      </div>

      {/* Vista 3: Historial de ataques */}
      <div className={activeTab === 'historial' ? 'flex flex-col flex-1 h-full' : 'hidden'}>
        <AttackHistoryView />
      </div>
    </AppLayout>
  );
}
