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
      {/* 1. Subheader and Trap Selector */}
      <TrapSelector
        activeService={activeService}
        onSelectService={onSelectService}
        wsUrl={wsUrl}
        breachByService={breachByService}
        keystrokeCountByService={keystrokeCountByService}
      />

      {/* 2. Top 5 KPI Metrics Cards Row */}
      <MetricsRow
        activeService={activeService}
        attackerIp={attackerIp}
        attackerGeo={attackerGeo}
        systemStats={systemStats}
        totalKeystrokes={keystrokeCountByService ? keystrokeCountByService[activeService] : 0}
      />

      {/* 3. Main Center Split (65% / 35% — code.html grid) */}
      {/* ponytail: la col. izquierda fija h-[600px] porque xterm necesita altura
          explícita para el FitAddon; la derecha fluye natural como en code.html. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Terminal Console Frame (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-[600px]">
          <TerminalFrame
            activeService={activeService}
            breached={breachByService ? breachByService[activeService] : false}
            registerTerminalListener={registerTerminalListener}
            isPaused={isPaused}
            onTogglePause={onTogglePause}
          />
        </div>

        {/* Right: Network Fingerprint + Keystroke Inspector (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4 lg:h-[600px]">
          <NetworkFingerprintCard mac={attackerMac} sessionId={sessionId} />
          <KeystrokeInspector keystrokes={keystrokes} />
        </div>
      </div>
    </div>
  );
}
