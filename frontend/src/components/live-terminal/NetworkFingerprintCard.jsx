import React, { useState } from 'react';

export default function NetworkFingerprintCard({
  mac = '00:00:00:00:00:00',
  sessionId = ''
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
    <section className="p-4 rounded-xl bg-surface-container-low border border-hairline shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container text-[20px]">fingerprint</span>
          <div className="flex flex-col">
            <h2 className="font-headline-sm text-[16px] leading-[20px] font-semibold text-on-surface">
              Identidad de Red del Atacante
            </h2>
            <span className="font-caption text-caption text-outline">
              Telemetría de Enlace Físico / L2-L4
            </span>
          </div>
        </div>
        <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary-container border border-primary/20 font-semibold shrink-0">
          VERIFICADO
        </span>
      </div>

      {/* MAC Address Display Box */}
      <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-surface-container border border-hairline">
        <div className="flex flex-col min-w-0">
          <span className="font-label-caps text-[10px] text-outline uppercase font-medium tracking-wider">
            Dirección MAC Clonada/Detectada
          </span>
          <span className="font-label-code text-[15px] font-bold text-on-surface tracking-wider truncate">
            {mac}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-surface-bright text-outline hover:text-on-surface transition-colors border border-transparent hover:border-outline-variant shrink-0"
          title={copied ? '¡Copiado!' : 'Copiar MAC'}
        >
          <span className="material-symbols-outlined text-[18px]">
            {copied ? 'check' : 'content_copy'}
          </span>
        </button>
      </div>

      {/* Session ID (funcionalidad: no está en code.html pero es telemetría) */}
      <div className="flex items-center justify-between gap-2 text-caption font-caption">
        <span className="font-label-caps text-[10px] text-outline uppercase tracking-wider shrink-0">
          ID de Sesión
        </span>
        <span
          className="font-label-code text-[11px] text-secondary truncate"
          title={sessionId || 'Esperando una sesión SSH'}
        >
          {sessionId || 'Esperando conexión'}
        </span>
      </div>
    </section>
  );
}
