import React, { useState } from 'react';

export default function SettingsModal({ isOpen, onClose, wsUrl }) {
  const [currentWsUrl, setCurrentWsUrl] = useState(wsUrl || 'ws://127.0.0.1:8080/ws');
  const [sshPort, setSshPort] = useState('2222');
  const [ftpPort, setFtpPort] = useState('2121');
  const [httpPort, setHttpPort] = useState('8081');
  const [cgroupMode, setCgroupMode] = useState('v2-isolated');
  const [autoAlerts, setAutoAlerts] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4">
      <div className="relative w-full max-w-lg bg-[#0f131c] border-2 border-[#1e2330] p-6 shadow-2xl flex flex-col gap-5">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#1e2330] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </div>
            <div>
              <h2 className="font-mono-md text-[16px] text-on-surface font-bold">
                Configuración del Daemon &amp; Sandboxes
              </h2>
              <p className="font-mono-sm text-[10px] text-outline">
                Parámetros de red, sockets WebSocket y jaula CGroup v2
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 rounded transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {savedNotice && (
          <div className="bg-primary/15 border border-primary/40 text-primary font-mono-sm text-[11px] p-2.5 flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>¡Configuración de Daemon actualizada nominalmente!</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* WebSocket Node */}
          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-[9px] text-outline uppercase tracking-wider font-bold">
              URL del Nodo WebSocket (Stream de Telemetría)
            </label>
            <input
              type="text"
              value={currentWsUrl}
              onChange={(e) => setCurrentWsUrl(e.target.value)}
              className="bg-[#0a0e17] border border-[#1e2330] text-secondary font-mono-sm text-[11px] px-3 py-2 outline-none focus:border-secondary"
            />
          </div>

          {/* Port Bindings */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-[9px] text-outline uppercase tracking-wider">
                Puerto SSH
              </label>
              <input
                type="text"
                value={sshPort}
                onChange={(e) => setSshPort(e.target.value)}
                className="bg-[#0a0e17] border border-[#1e2330] text-on-surface font-mono-sm text-[11px] px-2.5 py-1.5 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-[9px] text-outline uppercase tracking-wider">
                Puerto FTP
              </label>
              <input
                type="text"
                value={ftpPort}
                onChange={(e) => setFtpPort(e.target.value)}
                className="bg-[#0a0e17] border border-[#1e2330] text-on-surface font-mono-sm text-[11px] px-2.5 py-1.5 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-[9px] text-outline uppercase tracking-wider">
                Puerto HTTP
              </label>
              <input
                type="text"
                value={httpPort}
                onChange={(e) => setHttpPort(e.target.value)}
                className="bg-[#0a0e17] border border-[#1e2330] text-on-surface font-mono-sm text-[11px] px-2.5 py-1.5 outline-none"
              />
            </div>
          </div>

          {/* Sandbox Isolations */}
          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-[9px] text-outline uppercase tracking-wider">
              Modo Aislamiento Sandbox CGroup
            </label>
            <select
              value={cgroupMode}
              onChange={(e) => setCgroupMode(e.target.value)}
              className="bg-[#0a0e17] border border-[#1e2330] text-on-surface font-mono-sm text-[11px] px-3 py-2 outline-none"
            >
              <option value="v2-isolated">cgroup-v2 / Strict Read-Only OverlayFS</option>
              <option value="chroot">chroot jail (Legacy)</option>
            </select>
          </div>

          {/* Alert Toggles */}
          <div className="flex items-center justify-between border-t border-b border-[#1e2330] py-3">
            <div className="flex flex-col">
              <span className="font-mono-sm text-[11px] text-on-surface font-semibold">
                Alertas Auditivas y Popups de Brechas
              </span>
              <span className="font-mono-sm text-[9px] text-outline">
                Notificar inmediatamente en caso de ejecuciones críticas o breaching
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoAlerts}
              onChange={(e) => setAutoAlerts(e.target.checked)}
              className="accent-[#10b981] w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-surface-container-high hover:bg-surface-bright text-on-surface font-mono-sm text-[11px] px-4 py-2 border border-outline-variant/30"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#10b981] hover:brightness-110 text-[#003824] font-bold font-mono-sm text-[11px] px-4 py-2 shadow"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
