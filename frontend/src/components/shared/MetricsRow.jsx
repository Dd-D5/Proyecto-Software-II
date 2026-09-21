import React from 'react';

export default function MetricsRow({
  attackerIp = '0.0.0.0',
  totalKeystrokes = 0,
  totalAttacks = '0',
  attacksPerSec = '+14.8k/s',
  cpuPercent = 14.2,
  ramUsedMb = 148.6,
  ramTotalMb = 512
}) {
  const ramPercent = ((ramUsedMb / ramTotalMb) * 100).toFixed(1);

  return (
    <section className="grid grid-cols-5 gap-2.5 select-none">
      {/* 1. Total Ataques / Pkts */}
      <div className="bg-surface-container-low border border-[#1e2330] rounded-xl p-2.5 flex flex-col justify-between shadow-sm h-[88px]">
        <div className="flex items-center justify-between text-outline">
          <span className="font-label-caps text-[9px] uppercase tracking-wider">TOTAL ATAQUES / PKTS</span>
          <span className="material-symbols-outlined text-[15px] text-secondary">analytics</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-headline-xl text-[22px] leading-tight text-on-surface font-bold">
            {totalAttacks}
          </span>
          <span className="font-mono-sm text-[11px] text-primary">{attacksPerSec}</span>
        </div>
        <div className="flex items-center justify-between font-mono-sm text-[10px] text-on-surface-variant">
          <span>SSH Dionaea Hook</span>
          <span className="text-primary font-semibold">99.4% CAPTURE</span>
        </div>
      </div>

      {/* 2. Pulsaciones Registradas */}
      <div className="bg-surface-container-low border border-[#1e2330] rounded-xl p-2.5 flex flex-col justify-between shadow-sm h-[88px]">
        <div className="flex items-center justify-between text-outline">
          <span className="font-label-caps text-[9px] uppercase tracking-wider">PULSACIONES REGISTRADAS</span>
          <span className="material-symbols-outlined text-[15px] text-tertiary">keyboard</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-headline-xl text-[22px] leading-tight text-tertiary font-bold">
            {typeof totalKeystrokes === 'number' ? totalKeystrokes.toLocaleString('en-US') : totalKeystrokes}
          </span>
          <span className="font-mono-sm text-[11px] text-tertiary font-medium">TTY/PTS3</span>
        </div>
        <div className="flex items-center justify-between font-mono-sm text-[10px] text-on-surface-variant">
          <span>Patrón Tipeo: Humano</span>
          <span className="text-secondary font-semibold">48 WPM</span>
        </div>
      </div>

      {/* 3. Consumo CPU CFS */}
      <div className="bg-surface-container-low border border-[#1e2330] rounded-xl p-2.5 flex flex-col justify-between shadow-sm h-[88px]">
        <div className="flex items-center justify-between text-outline">
          <span className="font-label-caps text-[9px] uppercase tracking-wider">CONSUMO CPU CFS</span>
          <span className="material-symbols-outlined text-[15px] text-primary">memory</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-headline-xl text-[22px] leading-tight text-primary font-bold">
            {cpuPercent}%
          </span>
          <span className="font-mono-sm text-[11px] text-outline">/ 100%</span>
        </div>
        <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(cpuPercent, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* 4. Memoria RAM CGroup */}
      <div className="bg-surface-container-low border border-[#1e2330] rounded-xl p-2.5 flex flex-col justify-between shadow-sm h-[88px]">
        <div className="flex items-center justify-between text-outline">
          <span className="font-label-caps text-[9px] uppercase tracking-wider">MEMORIA RAM CGROUP</span>
          <span className="material-symbols-outlined text-[15px] text-secondary">storage</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-headline-xl text-[22px] leading-tight text-secondary font-bold">
            {ramUsedMb}
          </span>
          <span className="font-mono-sm text-[11px] text-on-surface-variant">
            MB / {ramTotalMb} MB
          </span>
        </div>
        <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-secondary h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(Number(ramPercent), 100)}%` }}
          ></div>
        </div>
      </div>

      {/* 5. IP Atacante */}
      <div className="bg-surface-container-low border border-[#1e2330] rounded-xl p-2.5 flex flex-col justify-between shadow-sm h-[88px]">
        <div className="flex items-center justify-between text-outline">
          <span className="font-label-caps text-[9px] uppercase tracking-wider text-error font-bold">
            IP Atacante
          </span>
          <span className="material-symbols-outlined text-[15px] text-error">public</span>
        </div>
        <div className="my-0.5">
          <div className="font-mono-lg text-[13px] text-error font-bold tracking-wider truncate bg-error-container/20 px-2 py-0.5 rounded border border-error/30 text-center">
            {attackerIp}
          </div>
        </div>
        <div className="flex items-center justify-end font-mono-sm text-[10px]">
          <span className="text-error font-bold font-label-caps text-[8px] bg-error-container/20 px-1 py-0.5 rounded border border-error/30">
            TOR EXIT NODE
          </span>
        </div>
      </div>
    </section>
  );
}
