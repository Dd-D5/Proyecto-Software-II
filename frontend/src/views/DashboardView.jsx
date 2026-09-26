import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import LiveTerminalView from '../components/live-terminal/LiveTerminalView';
import AdminServiciosView from '../components/admin-servicios/AdminServiciosView';
import AttackHistoryView from '../components/history/AttackHistoryView';
import ForensicReportTab from '../components/history/ForensicReportTab';
import LoginView from '../components/auth/LoginView';
import DevModeBanner from '../components/shared/DevModeBanner';
import BreachToast from '../components/shared/BreachToast';
import { useWebSocket } from '../hooks/useWebSocket';
import { wsClient } from '../services/wsClient';

const KONAMI_CODE = ['w', 'w', 's', 's', 'a', 'd', 'a', 'd', 'b', 'a'];
// Breach sobre estas claves NO redirige (solo toast): bases + 3 defaults
const DEFAULT_BREACH_KEYS = ['ssh', 'ftp', 'http', 'ssh:2222', 'ftp:2121', 'http:8081'];

export default function DashboardView() {
  const [token, setToken] = useState(() => localStorage.getItem('aegis_token') || '');
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' | 'servicios' | 'historial' | 'reporte'
  const [activeService, setActiveService] = useState('ssh:2222'); // instancia default SSH
  const [shieldClicks, setShieldClicks] = useState(0);
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
    const handleUnauthorized = () => handleLogout();
    window.addEventListener('aegis_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('aegis_unauthorized', handleUnauthorized);
  }, []);

  // 5 clics en el escudo del Sidebar desbloquean la pista del código Konami
  const handleShieldClick = () => {
    setShieldClicks((prev) => {
      const next = prev + 1;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => setShieldClicks(0), 4000);

      if (next >= 5) {
        setDevHintMsg('Escudo presionado 5 veces: introduzca el Código Konami (W,W,S,S,A,D,A,D,B,A)');
        setTimeout(() => setDevHintMsg(null), 8000);
      }
      return next;
    });
  };

  // Código Konami (W, W, S, S, A, D, A, D, B, A) → modo desarrollador
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 's', 'a', 'd', 'b'].includes(key)) {
        keyBufferRef.current = [...keyBufferRef.current, key].slice(-10);
        if (keyBufferRef.current.join(',') === KONAMI_CODE.join(',')) {
          setDevModeActive(true);
          setDevHintMsg('Modo Desarrollador activado: permisos de Administrador Master concedidos');
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

  // Breach en cualquier honeypot: se notifica por Toast sin forzar cambio de pestaña involuntario
  const handleNewBreach = (keys) => {
    // Los toasts flotantes informan de la intrusión sin interrumpir la vista activa del operador
  };

  // Fila de honeypot / selector → cambiar a la terminal de ESA instancia
  const handleOpenService = (serviceKey) => {
    setActiveService(serviceKey);
    setActiveTab('terminal');
  };

  return (
    <AppLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      wsStatus={wsStatus}
      onLogout={handleLogout}
      onShieldClick={handleShieldClick}
    >
      {/*
       * ESTRATEGIA: Todas las vistas permanecen montadas en el DOM.
       * La visibilidad se controla únicamente por CSS (hidden / block),
       * preservando el buffer de xterm.js y el historial del Inspector.
       */}

      {/* Toasts de intrusión (top-right) */}
      <BreachToast breachByService={breachByService} onNewBreach={handleNewBreach} />

      {/* Banner de Pista / Mensaje Dev */}
      {devHintMsg && (
        <div className="bg-primary/10 border border-primary/30 text-primary-container font-label-code text-xs p-3 rounded-lg animate-pulse">
          {devHintMsg}
        </div>
      )}

      {/* Banner de Modo Desarrollador */}
      {devModeActive && <DevModeBanner onClose={() => setDevModeActive(false)} />}

      {/* Vista 1: Live Terminal — siempre montada */}
      <div className={activeTab === 'terminal' ? 'flex flex-col flex-1 h-full' : 'hidden'}>
        <LiveTerminalView
          activeService={activeService}
          onSelectService={setActiveService}
          onNavigateToAdmin={setActiveTab}
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

      {/* Vista 2: Gestión de Servicios — siempre montada */}
      <div className={activeTab === 'servicios' ? 'flex flex-col flex-1 h-full' : 'hidden'}>
        <AdminServiciosView
          breachByService={breachByService}
          onOpenService={handleOpenService}
        />
      </div>

      {/* Vista 3: Historial de ataques — siempre montada */}
      <div className={activeTab === 'historial' ? 'flex flex-col flex-1 h-full' : 'hidden'}>
        <AttackHistoryView />
      </div>

      {/* Vista 4: Reporte forense post-ataque — siempre montada */}
      <div className={activeTab === 'reporte' ? 'flex flex-col flex-1 h-full' : 'hidden'}>
        <ForensicReportTab />
      </div>
    </AppLayout>
  );
}
