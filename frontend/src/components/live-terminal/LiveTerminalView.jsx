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
  keystrokes,
  isPaused,
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
      />

      {/* 2. Top 5 KPI Metrics Cards Row */}
      <MetricsRow
        attackerIp={attackerIp}
        totalKeystrokes={7247 + (keystrokes ? keystrokes.length - 6 : 0)}
      />

      {/* 3. Main Center Split (7 cols left Terminal, 5 cols right Fingerprint + Keystrokes) */}
      <div className="grid grid-cols-12 gap-3 min-h-[600px]">
        {/* Left: Terminal Console Frame (7 cols) */}
        <div className="col-span-7 flex flex-col h-[600px]">
          <TerminalFrame
            activeService={activeService}
            registerTerminalListener={registerTerminalListener}
            isPaused={isPaused}
            onTogglePause={onTogglePause}
          />
        </div>

        {/* Right: Network Fingerprint + Keystroke Inspector (5 cols) */}
        <div className="col-span-5 flex flex-col gap-3 h-[600px]">
          <NetworkFingerprintCard mac={attackerMac} />
          <KeystrokeInspector keystrokes={keystrokes} />
        </div>
      </div>
    </div>
  );
}
