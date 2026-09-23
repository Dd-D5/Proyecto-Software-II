import React, { useState } from 'react';

export default function NetworkFingerprintCard({
  mac = '00:00:00:00:00:00',
  sessionId = '',
  attackerGeo = 'Red Local / LAN (Prueba Interna)'
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(mac);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="bg-white border-2 border-black p-3.5 shadow-[4px_4px_0px_0px_#000] flex flex-col gap-2 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-black text-[18px]">memory_alt</span>
          <h2 className="font-black text-xs text-black uppercase tracking-wider">
            Huella L2/L3 · MAC & Geolocalización
          </h2>
        </div>
        <span className="bg-[#A7F3D0] text-black border border-black px-2 py-0.5 text-[9px] font-black uppercase">
          ARP OK
        </span>
      </div>

      {/* Tarjeta de Contenido MAC & Geo */}
      <div className="bg-[#FAF7F2] border-2 border-black p-2.5 flex flex-col gap-2 shadow-[2px_2px_0px_0px_#000]">
        <div className="flex items-center justify-between">
          <span className="font-black text-[9px] text-black uppercase tracking-wider">
            DIRECCIÓN MAC ETHERNET
          </span>
          <span className="font-mono text-[10px] text-black font-black bg-[#FEF08A] px-1.5 py-0.5 border border-black">
            VERIFICADA
          </span>
        </div>

        <div className="flex items-center justify-between my-0.5">
          <div className="font-mono text-sm font-black text-black bg-white px-2 py-1 border border-black shadow-[2px_2px_0px_0px_#000]">
            {mac}
          </div>
          <button
            onClick={handleCopy}
            className="bg-[#BAE6FD] hover:bg-[#7DD3FC] text-black font-bold p-1.5 border border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] cursor-pointer"
            title={copied ? '¡Copiado!' : 'Copiar MAC'}
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? 'check' : 'content_copy'}
            </span>
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-black pt-1.5">
          <span className="font-black text-[9px] text-black uppercase">
            UBICACIÓN GEO:
          </span>
          <span className="font-mono text-[10px] font-bold text-black max-w-[65%] truncate bg-[#FEF08A] px-1.5 border border-black" title={attackerGeo}>
            📍 {attackerGeo}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-black pt-1.5">
          <span className="font-black text-[9px] text-black uppercase">
            ID DE SESIÓN:
          </span>
          <span className="font-mono text-[10px] font-bold text-black max-w-[65%] truncate bg-white px-1.5 border border-black">
            {sessionId || 'Esperando conexión'}
          </span>
        </div>
      </div>
    </section>
  );
}
