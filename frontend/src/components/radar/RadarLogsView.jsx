import React, { useState } from 'react';

const INITIAL_RADAR_BREACHES = [
  { id: 1, service: 'SSH', ip: '185.220.101.44', mac: '00:1A:2B:3C:4D:5E', location: 'Moscú, RU', action: 'Login Fallido / Password Spray', time: '21:42:05', status: 'CRITICAL' },
  { id: 2, service: 'HTTP', ip: '192.168.1.105', mac: '00:1A:2B:3C:4D:5E', location: 'Localhost / Intranet', action: 'POST /login (SQLi Attempt)', time: '21:40:12', status: 'BREACH' },
  { id: 3, service: 'FTP', ip: '185.220.101.44', mac: '00:1A:2B:3C:4D:5E', location: 'Moscú, RU', action: 'Intento RETR auth_keys.env', time: '21:38:50', status: 'BLOCKED' },
  { id: 4, service: 'SSH', ip: '103.152.220.12', mac: '52:54:00:12:34:56', location: 'Ho Chi Minh, VN', action: 'Ejecución sudo su -', time: '21:35:10', status: 'CRITICAL' },
  { id: 5, service: 'HTTP', ip: '45.154.255.88', mac: '00:1A:2B:99:88:77', location: 'Frankfurt, DE', action: 'Vulnerability Scan /.env', time: '21:30:00', status: 'ALERT' }
];

export default function RadarLogsView({ breachEvents = [] }) {
  const [filter, setFilter] = useState('ALL');

  const combinedLogs = [...breachEvents, ...INITIAL_RADAR_BREACHES];

  const filteredLogs = combinedLogs.filter((logItem) => {
    if (filter === 'ALL') return true;
    return logItem.service === filter;
  });

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto select-none p-1">
      {/* Top Banner */}
      <section className="bg-surface-container-low border border-[#1e2330] rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-secondary border border-outline-variant/30">
            <span className="material-symbols-outlined text-[20px]">radar</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-[17px] text-on-surface font-bold">
                Radar de Telemetría &amp; Registro Global de Brechas
              </h1>
              <span className="font-label-caps text-[9px] bg-error/15 text-error border border-error/30 px-2 py-0.5 rounded font-bold uppercase">
                ACTIVE BREACH MONITOR
              </span>
            </div>
            <p className="font-mono-sm text-[11px] text-outline">
              Supervisión de vectores de ataque en tiempo real a través de los honeypots SSH, FTP y HTTP.
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-surface-container-lowest p-1 rounded-lg border border-[#1e2330]">
          {['ALL', 'SSH', 'FTP', 'HTTP'].map((svc) => (
            <button
              key={svc}
              onClick={() => setFilter(svc)}
              className={`px-2.5 py-1 font-mono-sm text-[11px] rounded transition-all ${
                filter === svc
                  ? 'bg-secondary-container/30 text-secondary border border-secondary/30 font-bold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              {svc}
            </button>
          ))}
        </div>
      </section>

      {/* Main Grid: Radar Sweep Visualizer + Log Table */}
      <div className="grid grid-cols-12 gap-3 min-h-[500px]">
        {/* Radar Sweep Visualizer Card */}
        <div className="col-span-4 bg-surface-container-lowest border border-[#1e2330] rounded-xl p-4 flex flex-col items-center justify-between shadow-sm relative overflow-hidden">
          <div className="w-full flex items-center justify-between border-b border-[#1e2330] pb-2 z-10">
            <span className="font-title-md text-[12px] text-on-surface font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              Escáner Espacial Deception Radar
            </span>
            <span className="font-mono-sm text-[10px] text-primary">360° SNOOP</span>
          </div>

          {/* Radar Circles Visualizer */}
          <div className="relative w-56 h-56 my-6 flex items-center justify-center">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border border-secondary/20 animate-ping opacity-20"></div>
            <div className="absolute inset-0 rounded-full border border-secondary/30"></div>
            <div className="absolute inset-8 rounded-full border border-secondary/20"></div>
            <div className="absolute inset-16 rounded-full border border-secondary/15"></div>
            <div className="absolute w-2 h-2 rounded-full bg-primary"></div>
            
            {/* Radar Crosshairs */}
            <div className="absolute w-full h-[1px] bg-secondary/20"></div>
            <div className="absolute h-full w-[1px] bg-secondary/20"></div>

            {/* Attack Targets Pins */}
            <div className="absolute top-10 right-12 flex items-center gap-1 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-error"></span>
              <span className="font-mono-sm text-[8px] text-error">RU: 185.220.101.44</span>
            </div>
            <div className="absolute bottom-12 left-10 flex items-center gap-1 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span>
              <span className="font-mono-sm text-[8px] text-tertiary">VN: 103.152.220.12</span>
            </div>
          </div>

          <div className="w-full bg-surface-container p-2.5 rounded-lg border border-[#1e2330] font-mono-sm text-[10px] text-outline flex items-center justify-between z-10">
            <span>Sensores Activos: <strong className="text-primary">3/3 Trampas</strong></span>
            <span>Brechas Registradas: <strong className="text-error">{combinedLogs.length}</strong></span>
          </div>
        </div>

        {/* Breach Log Table */}
        <div className="col-span-8 bg-surface-container-lowest border border-[#1e2330] rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="bg-surface-container-high px-4 py-2.5 border-b border-[#1e2330] flex items-center justify-between">
            <span className="font-title-md text-[13px] text-on-surface font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-error">list_alt</span>
              Historial Telemétrico de Brechas
            </span>
            <span className="font-mono-sm text-[10px] text-outline">
              Filtrado por: <strong className="text-secondary">{filter}</strong>
            </span>
          </div>

          <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-2">
            {filteredLogs.map((item, idx) => (
              <div
                key={idx}
                className="bg-surface-container-low border border-[#1e2330] rounded-lg p-3 flex items-center justify-between hover:border-secondary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded font-mono-sm text-[10px] font-bold ${
                    item.service === 'SSH' ? 'bg-error/20 text-error border border-error/30' :
                    item.service === 'FTP' ? 'bg-secondary/20 text-secondary border border-secondary/30' :
                    'bg-tertiary/20 text-tertiary border border-tertiary/30'
                  }`}>
                    {item.service}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-mono-sm text-[12px] text-on-surface font-semibold">
                      {item.action || item.payload}
                    </span>
                    <span className="font-mono-sm text-[10px] text-outline">
                      Origen: <strong className="text-primary">{item.ip}</strong> ({item.mac}) · {item.location || 'GeoIP Resolved'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono-sm text-[10px] text-outline">{item.time || 'En vivo'}</span>
                  <span className="font-label-caps text-[9px] bg-error-container/30 text-error px-1.5 py-0.5 rounded font-bold uppercase border border-error/30">
                    {item.status || 'BREACH'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
