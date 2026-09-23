import React from 'react';
import { ServiceType } from '../../services/types';

export default function TrapSelector({
  activeService = ServiceType.SSH,
  onSelectService,
  wsUrl = 'ws://127.0.0.1:8080/ws',
  breachByService = {}
}) {
  const honeypots = [
    {
      id: ServiceType.SSH,
      name: 'Honeypot SSH (:2222)',
      color: 'bg-[#A7F3D0]'
    },
    {
      id: ServiceType.FTP,
      name: 'Honeypot FTP (:2121)',
      color: 'bg-[#BAE6FD]'
    },
    {
      id: ServiceType.HTTP,
      name: 'Honeypot HTTP (:8081)',
      color: 'bg-[#FEF08A]'
    }
  ];

  return (
    <section className="bg-white border-2 border-black p-3.5 shadow-[4px_4px_0px_0px_#000] flex flex-col gap-3 select-none">
      {/* Línea superior del título */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#FEF08A] border-2 border-black flex items-center justify-center text-black font-black shadow-[2px_2px_0px_0px_#000]">
            <span className="material-symbols-outlined text-[20px] text-black">terminal</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-black text-base text-black uppercase tracking-tight">
              Centro de Mando: Telemetría &amp; Live Terminal
            </h1>
            <span className="bg-[#A7F3D0] text-black font-black text-[10px] px-2 py-0.5 border border-black uppercase">
              SOC-LIVE
            </span>
          </div>
        </div>

        {/* Badge del Enlace WebSocket en Texto Negro */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#FAF7F2] border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
            <span className="w-2.5 h-2.5 rounded-full bg-black animate-pulse"></span>
            <span className="font-black text-[10px] uppercase text-black">ENLACE WS:</span>
            <span className="font-mono font-bold text-xs text-black truncate max-w-sm" id="active-ws-node">
              {wsUrl}
            </span>
          </div>
        </div>
      </div>

      {/* Pestañas de Honeypot y Badges de Aislamiento */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t-2 border-black">
        <div className="flex items-center gap-2">
          {honeypots.map((hp) => {
            const isActive = activeService === hp.id;
            const isBreached = !!breachByService[hp.id];
            const badge = isBreached ? 'BREACH' : 'IDLE';

            return (
              <button
                key={hp.id}
                onClick={() => onSelectService && onSelectService(hp.id)}
                className={`flex items-center gap-2 px-3 py-1 font-mono font-black text-xs uppercase border-2 border-black transition-all cursor-pointer ${
                  isActive
                    ? `${hp.color} shadow-[3px_3px_0px_0px_#000] translate-x-[-1px]`
                    : 'bg-white hover:bg-[#FBCFE8] shadow-[2px_2px_0px_0px_#000]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full border border-black ${isBreached ? 'bg-red-600 animate-pulse' : 'bg-black'}`}></span>
                <span className="text-black">{hp.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 border border-black font-black ${
                  isBreached ? 'bg-[#FECACA] text-black' : 'bg-white text-black'
                }`}>
                  {badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Badges de Seguridad en Texto Negro */}
        <div className="flex items-center gap-3 text-black font-mono font-bold text-xs">
          <span className="flex items-center gap-1 bg-[#DDD6FE] px-2 py-0.5 border border-black">
            <span className="material-symbols-outlined text-[16px] text-black">shield</span>
            SANDBOX CGROUP: v2-ISOLATED
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 bg-[#FED7AA] px-2 py-0.5 border border-black">
            <span className="material-symbols-outlined text-[16px] text-black">fingerprint</span>
            SELINUX: ENFORCING_HONEY
          </span>
        </div>
      </div>
    </section>
  );
}
