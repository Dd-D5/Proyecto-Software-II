import React from 'react';
import { baseServiceOf } from '../../hooks/useWebSocket';

export default function MetricsRow({
  activeService = 'ssh',
  attackerIp = '0.0.0.0',
  attackerGeo = '',
  systemStats = null,
  totalKeystrokes = 0,
  attacksPerSec = '+14.8k/s',
  ramTotalMb = null
}) {
  // Datos reales del evento "system_stats" (backend, cada 1s); null hasta el primer sample.
  // connections viene por tipo base ("ssh") aunque haya una instancia seleccionada ("ssh:2223")
  const activeBase = baseServiceOf(activeService);
  const totalAttacks = systemStats?.total_attacks ?? 0;
  const serviceConns = systemStats?.connections?.[activeBase] ?? 0;
  const cpuPercent = systemStats?.cpu_percent ?? 0;
  const ramUsed = systemStats?.ram_used_mb ?? 0;
  const ramTotal = ramTotalMb || systemStats?.ram_total_mb || 1;
  const ramPercent = ((ramUsed / ramTotal) * 100).toFixed(1);

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* KPI 1: Ataques Totales / Tráfico */}
      <div className="flex flex-col justify-between p-3 rounded-xl bg-surface-container-low border border-hairline shadow-sm hover:border-hairline-strong transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-label-code text-label-code text-outline">Ataques Totales / Tráfico</span>
          <span className="font-label-caps text-label-caps px-1.5 py-0.5 rounded bg-primary/15 text-primary-container font-semibold border border-primary/20">
            {attacksPerSec}
          </span>
        </div>
        <div className="mt-2 mb-1">
          <span className="font-display text-[26px] leading-[30px] tracking-tight font-semibold text-on-surface">
            {totalAttacks.toLocaleString('en-US')}
          </span>
          <span className="font-body-sm text-body-sm text-outline"> ataques</span>
        </div>
        <div className="flex items-center gap-1 text-primary-container text-caption font-caption">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          <span className="text-secondary">
            {serviceConns.toLocaleString('en-US')} conexiones en {activeBase.toUpperCase()}
          </span>
        </div>
      </div>

      {/* KPI 2: Comportamiento Intruso */}
      <div className="flex flex-col justify-between p-3 rounded-xl bg-surface-container-low border border-hairline shadow-sm hover:border-hairline-strong transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-label-code text-label-code text-outline">Comportamiento Intruso</span>
          <span className="font-label-caps text-label-caps px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold border border-outline-variant">
            48 WPM
          </span>
        </div>
        <div className="mt-2 mb-1">
          <span className="font-display text-[26px] leading-[30px] tracking-tight font-semibold text-on-surface">
            {typeof totalKeystrokes === 'number' ? totalKeystrokes.toLocaleString('en-US') : totalKeystrokes}
          </span>
          <span className="font-body-sm text-body-sm text-outline"> pulsaciones</span>
        </div>
      </div>

      {/* KPI 3: Uso CPU (host) */}
      <div className="flex flex-col justify-between p-3 rounded-xl bg-surface-container-low border border-hairline shadow-sm hover:border-hairline-strong transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-label-code text-label-code text-outline">Uso CPU Aislamiento</span>
          <span className="font-label-caps text-label-caps px-1.5 py-0.5 rounded bg-primary/15 text-primary-container font-semibold border border-primary/20">
            SEGURO
          </span>
        </div>
        <div className="mt-2 mb-2">
          <span className="font-display text-[26px] leading-[30px] tracking-tight font-semibold text-on-surface">
            {cpuPercent.toFixed(1)}%
          </span>
          <span className="font-body-sm text-body-sm text-outline"> / daemon</span>
        </div>
        <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden border border-hairline">
          <div className="h-full bg-primary-container rounded-full" style={{ width: `${Math.min(cpuPercent, 100)}%` }}></div>
        </div>
      </div>

      {/* KPI 4: Memoria RAM (proceso) */}
      <div className="flex flex-col justify-between p-3 rounded-xl bg-surface-container-low border border-hairline shadow-sm hover:border-hairline-strong transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-label-code text-label-code text-outline">Memoria RAM del Daemon</span>
          <span className="font-label-caps text-label-caps px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold border border-outline-variant">
            {Math.round(Number(ramPercent))}% USO
          </span>
        </div>
        <div className="mt-2 mb-1">
          <span className="font-display text-[26px] leading-[30px] tracking-tight font-semibold text-on-surface">
            {ramUsed.toFixed(0)}
          </span>
          <span className="font-body-sm text-body-sm text-outline"> MB</span>
        </div>
        <div className="flex items-center gap-1 text-caption font-caption text-outline">
          <span className="material-symbols-outlined text-[14px] text-primary-container">memory</span>
          <span className="text-secondary">Estable sin riesgo OOM</span>
        </div>
      </div>

      {/* KPI 5: Origen del Atacante */}
      <div className="flex flex-col justify-between p-3 rounded-xl bg-surface-container-low border border-hairline shadow-sm hover:border-hairline-strong transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-label-code text-label-code text-outline">Origen del Atacante</span>
          <span className="font-label-caps text-label-caps px-1.5 py-0.5 rounded bg-error-container/15 text-error font-bold uppercase tracking-wider border border-error-container/30">
            CRÍTICO
          </span>
        </div>
        <div className="mt-2 mb-1">
          <span className="font-display text-[22px] leading-[30px] tracking-tight font-semibold font-label-code text-on-surface">
            {attackerIp}
          </span>
        </div>
        <div className="flex items-center gap-1 text-caption font-caption text-outline">
          <span className="material-symbols-outlined text-[14px]">public</span>
          <span className="text-secondary truncate">{attackerGeo || 'Resolviendo geolocalización...'}</span>
        </div>
      </div>
    </section>
  );
}
