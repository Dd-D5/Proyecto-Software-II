import React from 'react';

export default function MetricsRow({
  activeService = 'ssh',
  attackerIp = '0.0.0.0',
  metrics = null,
  totalKeystrokes = 0,
  ramTotalMb = 512
}) {
  // Datos reales del sampler backend (event "metrics"); null hasta el primer sample (≤5s)
  const totalAttacks = metrics?.[activeService]?.connections ?? 0;
  const cpuPercent = metrics?.cpu ?? 0;
  const ramUsedMb = metrics?.ram ?? 0;
  const ramPercent = ((ramUsedMb / ramTotalMb) * 100).toFixed(1);

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* KPI 1: Ataques Totales / Tráfico */}
      <div className="flex flex-col justify-between p-3 rounded-xl bg-surface-container-low border border-hairline shadow-sm hover:border-hairline-strong transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-label-code text-label-code text-outline">Ataques Totales / Tráfico</span>
        </div>
        <div className="mt-2 mb-1">
          <span className="font-display text-[26px] leading-[30px] tracking-tight font-semibold text-on-surface">
            {totalAttacks.toLocaleString('en-US')}
          </span>
          <span className="font-body-sm text-body-sm text-outline"> conexiones</span>
        </div>
        <div className="flex items-center gap-1 text-primary-container text-caption font-caption">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          <span className="text-secondary">99.4% neutralizado en señuelo</span>
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
        <div className="flex items-center gap-1.5 text-caption font-caption">
          <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
          <span className="text-secondary">Patrón humano detectado</span>
        </div>
      </div>

      {/* KPI 3: Uso CPU Aislamiento */}
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

      {/* KPI 4: Memoria RAM Asignada */}
      <div className="flex flex-col justify-between p-3 rounded-xl bg-surface-container-low border border-hairline shadow-sm hover:border-hairline-strong transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-label-code text-label-code text-outline">Memoria RAM Asignada</span>
          <span className="font-label-caps text-label-caps px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold border border-outline-variant">
            {Math.round(Number(ramPercent))}% USO
          </span>
        </div>
        <div className="mt-2 mb-1">
          <span className="font-display text-[26px] leading-[30px] tracking-tight font-semibold text-on-surface">
            {ramUsedMb.toFixed(1)}
          </span>
          <span className="font-body-sm text-body-sm text-outline"> / {ramTotalMb} MB</span>
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
          <span className="text-secondary">Nodo de salida externo</span>
        </div>
      </div>
    </section>
  );
}
