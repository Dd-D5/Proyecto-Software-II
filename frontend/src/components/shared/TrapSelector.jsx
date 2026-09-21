import React from 'react';
import { ServiceType } from '../../services/types';

export default function TrapSelector({
  activeService = ServiceType.SSH,
  onSelectService,
  wsUrl = 'ws://127.0.0.1:8080/stream/pts3',
  breachByService = {}
}) {
  const honeypots = [
    {
      id: ServiceType.SSH,
      name: 'SSH Honeypot (:2222)',
      activeClass: 'bg-error-container text-on-error font-semibold shadow-sm'
    },
    {
      id: ServiceType.FTP,
      name: 'FTP Honeypot (:2121)',
      activeClass: 'bg-secondary-container/30 text-secondary border border-secondary/30 font-semibold shadow-sm'
    },
    {
      id: ServiceType.HTTP,
      name: 'HTTP Portal (:8080)',
      activeClass: 'bg-tertiary-container/30 text-tertiary border border-tertiary/30 font-semibold shadow-sm'
    }
  ];

  return (
    <section className="bg-surface-container-low border border-[#1e2330] rounded-xl px-3 py-2 flex flex-col gap-1.5 shadow-sm select-none">
      {/* Upper header line */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shadow-inner border border-outline-variant/30">
            <span className="material-symbols-outlined text-[18px]">terminal</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-[17px] leading-tight text-on-surface tracking-tight font-bold">
                Centro de Mando: Telemetría &amp; Live Terminal
              </h1>
              <span className="font-label-caps text-label-caps bg-surface-container-highest px-1.5 py-0.5 rounded text-secondary uppercase font-bold">
                SOC-LIVE
              </span>
            </div>
          </div>
        </div>

        {/* WS active link badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-surface-container px-2 py-0.5 rounded font-mono-sm text-mono-sm border border-outline-variant/30">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-outline uppercase font-label-caps text-label-caps text-[9px]">ENLACE WS:</span>
            <span className="text-primary truncate max-w-xs text-[11px]" id="active-ws-node">
              {wsUrl}
            </span>
          </div>
        </div>
      </div>

      {/* Honeypot selector tabs and sandbox indicators */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#1e2330]">
        <div className="flex items-center gap-1.5 bg-surface-container-lowest p-0.5 rounded-lg border border-[#1e2330]">
          {honeypots.map((hp) => {
            const isActive = activeService === hp.id;
            // Estado de intrusión por servicio: todas IDLE por defecto, BREACH con evento connection
            const isBreached = !!breachByService[hp.id];
            const badge = isBreached ? 'BREACH' : 'IDLE';
            const badgeClass = isBreached ? 'bg-error/30 text-white' : 'text-outline';
            return (
              <button
                key={hp.id}
                onClick={() => onSelectService && onSelectService(hp.id)}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded font-mono-sm text-[11px] transition-all ${
                  isActive
                    ? hp.activeClass
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isBreached ? 'bg-error animate-pulse' : 'bg-outline/60'}`}></span>
                <span>{hp.name}</span>
                <span className={`text-[9px] px-1 rounded font-label-caps font-bold ${badgeClass}`}>
                  {badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Security badges */}
        <div className="flex items-center gap-3 text-outline font-mono-sm text-[11px]">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">shield</span>
            SANDBOX CGROUP: v2-ISOLATED
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-secondary">fingerprint</span>
            SELINUX: ENFORCING_HONEY
          </span>
        </div>
      </div>
    </section>
  );
}
