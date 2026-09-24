import React, { useState } from 'react';
import { apiFetch } from '../../services/api';

export default function DevModeBanner({ onClose }) {
  const [statusMsg, setStatusMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUnbanAll = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/bans');
      if (res.ok) {
        const bans = await res.json();
        for (const b of bans) {
          await apiFetch(`/api/bans?target=${encodeURIComponent(b.target)}`, {
            method: 'DELETE'
          });
        }
        setStatusMsg('Todos los baneos de IP/DNS han sido removidos exitosamente.');
      }
    } catch (err) {
      setStatusMsg('Error removiendo baneos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateSSH = async () => {
    setStatusMsg('Transmitiendo ataque SSH en vivo (Bash Bomb :(){ :|:& };: & sudo rm -rf /)...');
    try {
      await apiFetch('/api/dev/simulate-attack', {
        method: 'POST',
        body: JSON.stringify({ type: 'ssh' })
      });
      setStatusMsg('Ataque Bash Bomb transmitido en tiempo real al Live Terminal! IP 198.51.100.42 baneada.');
    } catch (err) {
      setStatusMsg('Error en prueba SSH.');
    }
  };

  const handleSimulateFTP = async () => {
    setStatusMsg('Transmitiendo ataque FTP en vivo (Credential Spray & Malware Upload)...');
    try {
      await apiFetch('/api/dev/simulate-attack', {
        method: 'POST',
        body: JSON.stringify({ type: 'ftp' })
      });
      setStatusMsg('Ataque FTP transmitido en tiempo real. IP 203.0.113.88 baneada.');
    } catch (err) {
      setStatusMsg('Error en prueba FTP.');
    }
  };

  const handleSimulateHTTP = async () => {
    setStatusMsg('Transmitiendo ataque HTTP en vivo (3 Logins fallidos + SQLi)...');
    try {
      await apiFetch('/api/dev/simulate-attack', {
        method: 'POST',
        body: JSON.stringify({ type: 'http' })
      });
      setStatusMsg('3 Logins HTTP transmitidos en tiempo real. IP 192.0.2.105 baneada automáticamente.');
    } catch (err) {
      setStatusMsg('Error en prueba HTTP.');
    }
  };

  return (
    <div className="bg-tertiary/10 border border-tertiary/30 rounded-xl p-4 flex flex-col gap-3 my-2 select-none">
      <div className="flex items-center justify-between border-b border-tertiary/20 pb-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-tertiary">terminal</span>
          <h2 className="font-label-caps text-label-caps text-tertiary uppercase tracking-wider">
            Modo Desarrollador Desbloqueado (Código Konami)
          </h2>
        </div>
        <button
          onClick={onClose}
          className="bg-surface-container hover:bg-error-container/20 text-outline hover:text-error font-label-caps text-[9px] uppercase font-semibold px-2.5 py-1 rounded border border-hairline-strong transition-colors cursor-pointer shrink-0"
        >
          Ocultar Dev Mode
        </button>
      </div>

      {statusMsg && (
        <div className="bg-surface-container border border-hairline text-on-surface font-label-code text-xs p-2.5 rounded-lg">
          {statusMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <button
          onClick={handleUnbanAll}
          disabled={loading}
          className="bg-primary/10 hover:bg-primary/20 text-primary-container border border-primary/30 font-label-caps text-[9px] uppercase font-semibold py-2.5 px-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          Desbanear todas las IPs / DNS
        </button>

        <button
          onClick={handleSimulateSSH}
          className="bg-surface-container hover:bg-surface-bright text-on-surface border border-hairline-strong font-label-caps text-[9px] uppercase font-semibold py-2.5 px-3 rounded-lg transition-colors cursor-pointer"
        >
          Ataque SSH (Bash Bomb & sudo)
        </button>

        <button
          onClick={handleSimulateFTP}
          className="bg-surface-container hover:bg-surface-bright text-on-surface border border-hairline-strong font-label-caps text-[9px] uppercase font-semibold py-2.5 px-3 rounded-lg transition-colors cursor-pointer"
        >
          Ataque FTP (Spray & Upload)
        </button>

        <button
          onClick={handleSimulateHTTP}
          className="bg-error-container/10 hover:bg-error-container/20 text-error border border-error-container/30 font-label-caps text-[9px] uppercase font-semibold py-2.5 px-3 rounded-lg transition-colors cursor-pointer"
        >
          Ataque HTTP (3 Escaneos a Baneo)
        </button>
      </div>
    </div>
  );
}
