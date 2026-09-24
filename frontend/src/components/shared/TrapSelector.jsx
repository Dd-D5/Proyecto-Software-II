import React from 'react';
import { ServiceType } from '../../services/types';

// ponytail: SONDEADO se deriva de keystrokeCountByService (actividad IO sin sesión
// activa). No hay estado dedicado en el backend. Upgrade path: emitir un evento
// "probe" real si se necesita distinguir sondeo de conexión.
const serviceState = (isBreached, activity) => {
  if (isBreached) return 'ALERTA';
  if (activity > 0) return 'SONDEADO';
  return 'ESPERA';
};

export default function TrapSelector({
  activeService = ServiceType.SSH,
  onSelectService,
  wsUrl = 'ws://127.0.0.1:8080/ws',
  breachByService = {},
  keystrokeCountByService = {}
}) {
  const honeypots = [
    { id: ServiceType.SSH, label: 'SSH', port: ':2222' },
    { id: ServiceType.HTTP, label: 'HTTP', port: ':8080' },
    { id: ServiceType.FTP, label: 'FTP', port: ':2121' }
  ];

  const anyBreach = Object.values(breachByService).some(Boolean);

  const dotClass = {
    ALERTA: 'bg-error',
    SONDEADO: 'bg-tertiary',
    ESPERA: 'bg-secondary-container'
  };
  const badgeClass = {
    ALERTA: 'bg-error text-ink font-bold',
    SONDEADO: 'bg-surface-container-high text-outline font-medium',
    ESPERA: 'bg-surface-container-high text-outline font-medium'
  };

  return (
    <section className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low border border-hairline shadow-sm">
      {/* Left Meta */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center border border-outline-variant text-primary-container shrink-0">
          <span className="material-symbols-outlined text-[22px]">security</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-headline-sm text-headline-sm font-semibold tracking-tight text-on-surface">
              Centro de Mando: Telemetría & Detección Activa
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary-container font-label-caps text-label-caps font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Canal Seguro WebSocket Sincronizado
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-body-sm text-body-sm text-outline">Monitor Forense de Ciberdefensa</p>
            <span className="flex items-center gap-1.5 bg-surface-container-lowest border border-hairline px-2 py-0.5 rounded-lg font-mono-sm text-mono-sm text-secondary">
              <span className="material-symbols-outlined text-[13px]">wifi_tethering</span>
              <span className="truncate max-w-[240px]" id="active-ws-node">{wsUrl}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Center Threat State Indicator */}
      <div
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border ${
          anyBreach
            ? 'bg-error-container/10 border-error-container/30'
            : 'bg-primary/10 border-primary/30'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${anyBreach ? 'bg-error-container animate-ping' : 'bg-primary'} `}></span>
        <span className="font-label-code text-label-code text-on-surface font-medium">
          Estado General de Amenaza:{' '}
          <span className={anyBreach ? 'text-error font-semibold' : 'text-primary font-semibold'}>
            {anyBreach ? 'Intrusión Aislada en Sandbox (Bajo Control)' : 'Perímetro Estable · Sin Intrusión Activa'}
          </span>
        </span>
      </div>

      {/* Right Honeypot Selector */}
      <div className="flex items-center gap-1.5 bg-ink p-1 rounded-lg border border-hairline">
        {honeypots.map((hp) => {
          const isActive = activeService === hp.id;
          const state = serviceState(!!breachByService[hp.id], keystrokeCountByService[hp.id] || 0);
          return (
            <button
              key={hp.id}
              onClick={() => onSelectService && onSelectService(hp.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all ${
                isActive
                  ? 'bg-surface-container-high border border-hairline-strong shadow-sm'
                  : 'text-outline hover:text-on-surface hover:bg-surface-container border border-transparent'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dotClass[state]}`}></span>
              <span className="font-label-code text-label-code text-on-surface font-medium">
                {hp.label} {hp.port}
              </span>
              <span className={`font-label-caps text-[10px] px-1 py-0.2 rounded uppercase tracking-wider ${badgeClass[state]}`}>
                {state.charAt(0) + state.slice(1).toLowerCase()}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
