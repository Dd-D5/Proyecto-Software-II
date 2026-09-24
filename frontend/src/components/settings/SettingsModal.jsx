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
      <div className="relative w-full max-w-lg bg-surface-container-low border border-hairline rounded-xl p-6 shadow-2xl flex flex-col gap-5">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </div>
            <div>
              <h2 className="font-title-md text-title-md text-on-surface font-semibold">
                Configuración del Daemon & Sandboxes
              </h2>
              <p className="font-caption text-caption text-outline">
                Parámetros de red, sockets WebSocket y jaula CGroup v2
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 rounded transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {savedNotice && (
          <div className="bg-primary/10 border border-primary/30 text-primary-container font-label-code text-[11px] p-2.5 rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>¡Configuración de Daemon actualizada nominalmente!</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* WebSocket Node */}
          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-[10px] text-outline uppercase tracking-wider">
              URL del Nodo WebSocket (Stream de Telemetría)
            </label>
            <input
              type="text"
              value={currentWsUrl}
              onChange={(e) => setCurrentWsUrl(e.target.value)}
              className="bg-surface-container border border-hairline-strong focus:border-primary text-secondary font-label-code text-[11px] px-3 py-2 rounded-lg outline-none transition-colors"
            />
          </div>

          {/* Port Bindings */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-[10px] text-outline uppercase tracking-wider">
                Puerto SSH
              </label>
              <input
                type="text"
                value={sshPort}
                onChange={(e) => setSshPort(e.target.value)}
                className="bg-surface-container border border-hairline-strong focus:border-primary text-on-surface font-label-code text-[11px] px-2.5 py-1.5 rounded-lg outline-none transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-[10px] text-outline uppercase tracking-wider">
                Puerto FTP
              </label>
              <input
                type="text"
                value={ftpPort}
                onChange={(e) => setFtpPort(e.target.value)}
                className="bg-surface-container border border-hairline-strong focus:border-primary text-on-surface font-label-code text-[11px] px-2.5 py-1.5 rounded-lg outline-none transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-[10px] text-outline uppercase tracking-wider">
                Puerto HTTP
              </label>
              <input
                type="text"
                value={httpPort}
                onChange={(e) => setHttpPort(e.target.value)}
                className="bg-surface-container border border-hairline-strong focus:border-primary text-on-surface font-label-code text-[11px] px-2.5 py-1.5 rounded-lg outline-none transition-colors"
              />
            </div>
          </div>

          {/* Sandbox Isolations */}
          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-[10px] text-outline uppercase tracking-wider">
              Modo Aislamiento Sandbox CGroup
            </label>
            <select
              value={cgroupMode}
              onChange={(e) => setCgroupMode(e.target.value)}
              className="bg-surface-container border border-hairline-strong focus:border-primary text-on-surface font-label-code text-[11px] px-3 py-2 rounded-lg outline-none transition-colors"
            >
              <option value="v2-isolated">cgroup-v2 / Strict Read-Only OverlayFS</option>
              <option value="chroot">chroot jail (Legacy)</option>
              <option value="docker-container">Docker Isolated Container Sandbox</option>
            </select>
          </div>

          {/* Alert Toggles */}
          <div className="flex items-center justify-between border-t border-b border-hairline py-3">
            <div className="flex flex-col">
              <span className="font-label-code text-[11px] text-on-surface font-semibold">
                Alertas Auditivas y Popups de Brechas
              </span>
              <span className="font-caption text-[10px] text-outline">
                Notificar inmediatamente en caso de ejecuciones críticas o breaching
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoAlerts}
              onChange={(e) => setAutoAlerts(e.target.checked)}
              className="accent-primary-container w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-surface-container hover:bg-surface-bright text-on-surface font-label-caps text-[10px] uppercase px-4 py-2 rounded-lg border border-hairline-strong transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-caps text-[10px] uppercase font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
