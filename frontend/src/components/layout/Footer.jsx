import React from 'react';

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-16 h-10 bg-[#0a0e17]/95 backdrop-blur-md border-t border-[#1e2330] z-40 flex items-center justify-between px-6 shadow-md w-[calc(100%-4rem)] select-none">
      {/* Metrics of Kernel Go */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <span className="font-label-caps text-label-caps text-outline uppercase">GO WORKERS:</span>
          <span className="font-mono-sm text-mono-sm text-primary font-bold">32 ACTIVE</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-label-caps text-label-caps text-outline uppercase">RAW PACKETS/S:</span>
          <span className="font-mono-sm text-mono-sm text-secondary font-bold">14,820</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-label-caps text-label-caps text-outline uppercase">WS ENGINE:</span>
          <span className="font-mono-sm text-mono-sm text-on-surface">FULL-DUPLEX 0MS POLLING</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-label-caps text-label-caps text-outline uppercase">TCP DROPS:</span>
          <span className="font-mono-sm text-mono-sm text-primary font-bold">0 (ZERO)</span>
        </div>
      </div>

      {/* Right: SOC Kernel Signature */}
      <div className="flex items-center gap-2">
        <span className="font-label-caps text-[10px] text-outline tracking-wider uppercase">
          AEGISTRAP INTELLIGENCE 2025 SOC KERNEL v4.2.1-SEC
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
      </div>
    </footer>
  );
}
