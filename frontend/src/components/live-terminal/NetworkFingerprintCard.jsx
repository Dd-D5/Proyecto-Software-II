import React, { useState } from 'react';

export default function NetworkFingerprintCard({ mac = '00:1A:2B:3C:4D:5E' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(mac);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="bg-surface-container-low border border-[#1e2330] rounded-xl p-2.5 shadow-sm flex flex-col gap-1.5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[16px]">memory_alt</span>
          <h2 className="font-title-md text-[13px] text-on-surface font-semibold">
            Huella de Red L2/L3 · NIC &amp; MAC Atacante
          </h2>
        </div>
        <span className="font-label-caps text-[9px] bg-secondary-container/20 text-secondary border border-secondary/30 px-2 py-0.5 rounded uppercase font-bold">
          ARP SNOOP OK
        </span>
      </div>

      {/* MAC Address Content Card */}
      <div className="bg-surface-container-lowest border border-[#1e2330] p-2 rounded-xl flex flex-col gap-1 shadow-inner">
        <div className="flex items-center justify-between">
          <span className="font-label-caps text-[9px] text-outline uppercase tracking-wider">
            DIRECCIÓN FÍSICA ETHERNET (MAC)
          </span>
          <span className="font-mono-sm text-[11px] text-primary font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            VERIFICADA (NO SPOOF)
          </span>
        </div>

        <div className="flex items-center justify-between my-0.5">
          <div className="font-mono-lg text-[15px] text-primary font-bold tracking-widest bg-surface-container px-2 py-0.5 rounded-lg border border-primary/20">
            {mac}
          </div>
          <button
            onClick={handleCopy}
            className="bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-on-surface p-1 rounded-lg transition-colors flex items-center border border-outline-variant/30"
            title={copied ? '¡Copiado!' : 'Copiar MAC al portapapeles'}
          >
            <span className="material-symbols-outlined text-[15px]">
              {copied ? 'check' : 'content_copy'}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
