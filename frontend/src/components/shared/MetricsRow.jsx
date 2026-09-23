import React from 'react';

export default function MetricsRow({
  attackerIp = '0.0.0.0',
  attackerGeo = 'Red Local / LAN (Prueba Interna)',
  totalKeystrokes = 0,
  systemStats = { cpu_percent: 14.2, ram_used_mb: 148.6, ram_total_mb: 2048, total_attacks: 0 }
}) {
  const ramTotal = systemStats.ram_total_mb || 2048;
  const ramUsed = systemStats.ram_used_mb || 140;
  const ramPercent = ((ramUsed / ramTotal) * 100).toFixed(1);
  const cpuPercent = systemStats.cpu_percent || 12.5;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 select-none">
      {/* 1. Total Ataques */}
      <div className="bg-[#BAE6FD] border-2 border-black p-3.5 flex flex-col justify-between shadow-[4px_4px_0px_0px_#000]">
        <div className="flex items-center justify-between text-black">
          <span className="font-black text-[10px] uppercase tracking-wider">TOTAL ATAQUES</span>
          <span className="material-symbols-outlined text-[18px]">analytics</span>
        </div>
        <div className="flex items-baseline gap-2 my-1">
          <span className="font-black text-2xl text-black">{systemStats.total_attacks || 0}</span>
          <span className="font-mono font-bold text-xs bg-white px-1.5 py-0.5 border border-black">LIVE</span>
        </div>
        <div className="text-[10px] font-bold text-black uppercase">
          CAPTURA EN TIEMPO REAL
        </div>
      </div>

      {/* 2. Pulsaciones */}
      <div className="bg-[#FEF08A] border-2 border-black p-3.5 flex flex-col justify-between shadow-[4px_4px_0px_0px_#000]">
        <div className="flex items-center justify-between text-black">
          <span className="font-black text-[10px] uppercase tracking-wider">PULSACIONES (TTY)</span>
          <span className="material-symbols-outlined text-[18px]">keyboard</span>
        </div>
        <div className="flex items-baseline gap-2 my-1">
          <span className="font-black text-2xl text-black">
            {typeof totalKeystrokes === 'number' ? totalKeystrokes.toLocaleString('en-US') : totalKeystrokes}
          </span>
          <span className="font-mono font-bold text-xs bg-white px-1.5 py-0.5 border border-black">KEYS</span>
        </div>
        <div className="text-[10px] font-bold text-black uppercase">
          EVENTOS DE TECLADO
        </div>
      </div>

      {/* 3. Consumo CPU Dinámico Real */}
      <div className="bg-[#A7F3D0] border-2 border-black p-3.5 flex flex-col justify-between shadow-[4px_4px_0px_0px_#000]">
        <div className="flex items-center justify-between text-black">
          <span className="font-black text-[10px] uppercase tracking-wider">CONSUMO CPU</span>
          <span className="material-symbols-outlined text-[18px]">memory</span>
        </div>
        <div className="flex items-baseline gap-2 my-1">
          <span className="font-black text-2xl text-black">{cpuPercent}%</span>
          <span className="font-mono text-xs font-bold text-black">/ 100%</span>
        </div>
        <div className="w-full bg-white border border-black h-2 overflow-hidden">
          <div
            className="bg-black h-full transition-all duration-500"
            style={{ width: `${Math.min(cpuPercent, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* 4. Memoria RAM Dinámica */}
      <div className="bg-[#DDD6FE] border-2 border-black p-3.5 flex flex-col justify-between shadow-[4px_4px_0px_0px_#000]">
        <div className="flex items-center justify-between text-black">
          <span className="font-black text-[10px] uppercase tracking-wider">MEMORIA RAM</span>
          <span className="material-symbols-outlined text-[18px]">storage</span>
        </div>
        <div className="flex items-baseline gap-2 my-1">
          <span className="font-black text-2xl text-black">{ramUsed} MB</span>
          <span className="font-mono text-[10px] font-bold text-black">/ {ramTotal} MB</span>
        </div>
        <div className="w-full bg-white border border-black h-2 overflow-hidden">
          <div
            className="bg-black h-full transition-all duration-500"
            style={{ width: `${Math.min(Number(ramPercent), 100)}%` }}
          ></div>
        </div>
      </div>

      {/* 5. IP Atacante & Geolocalización Precisa */}
      <div className="bg-[#FECACA] border-2 border-black p-3.5 flex flex-col justify-between shadow-[4px_4px_0px_0px_#000]">
        <div className="flex items-center justify-between text-black">
          <span className="font-black text-[10px] uppercase tracking-wider">IP ATACANTE & GEO</span>
          <span className="material-symbols-outlined text-[18px]">public</span>
        </div>
        <div className="my-0.5">
          <div className="font-mono text-xs font-black text-black bg-white px-2 py-0.5 border border-black text-center truncate">
            {attackerIp}
          </div>
        </div>
        <div className="text-[9px] font-black text-black uppercase truncate bg-white px-1.5 border border-black" title={attackerGeo}>
          📍 {attackerGeo}
        </div>
      </div>
    </section>
  );
}
