import React from 'react';
import TrapSelector from '../shared/TrapSelector';
import MetricsRow from '../shared/MetricsRow';
import TerminalFrame from './TerminalFrame';
import NetworkFingerprintCard from './NetworkFingerprintCard';
import KeystrokeInspector from './KeystrokeInspector';

export default function LiveTerminalView({
  activeService,
  onSelectService,
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
  onTogglePause,
  registerTerminalListener
}) {
  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* 1. Selector de Trampas / Honeypot activo */}
      <TrapSelector
        activeService={activeService}
        onSelectService={onSelectService}
        wsUrl={wsUrl}
        breachByService={breachByService}
      />

      {/* 2. Fila de Tarjetas de Métricas KPI Dinámicas */}
      <MetricsRow
        attackerIp={attackerIp}
        attackerGeo={attackerGeo}
        systemStats={systemStats}
        totalKeystrokes={keystrokeCountByService ? keystrokeCountByService[activeService] : 0}
      />

      {/* 3. Panel Central: Terminal e Inspección */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[600px]">
        {/* Izquierda: Marco de la Consola Terminal (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-[600px]">
          <TerminalFrame
            activeService={activeService}
            breached={breachByService ? breachByService[activeService] : false}
            registerTerminalListener={registerTerminalListener}
            isPaused={isPaused}
            onTogglePause={onTogglePause}
          />
        </div>

        {/* Derecha: Huella L2/L3 + Inspector de Teclado (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 h-[600px]">
          <NetworkFingerprintCard mac={attackerMac} sessionId={sessionId} attackerGeo={attackerGeo} />
          <KeystrokeInspector keystrokes={keystrokes} />
        </div>
      </div>
    </div>
  );
}
