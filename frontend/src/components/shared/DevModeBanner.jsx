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
        setStatusMsg('✅ Todos los baneos de IP/DNS han sido removidos exitosamente.');
      }
    } catch (err) {
      setStatusMsg('❌ Error removiendo baneos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateSSH = async () => {
    setStatusMsg('🚀 Transmitiendo ataque SSH en vivo (Bash Bomb :(){ :|:& };: & sudo rm -rf /)...');
    try {
      await apiFetch('/api/dev/simulate-attack', {
        method: 'POST',
        body: JSON.stringify({ type: 'ssh' })
      });
      setStatusMsg('🔥 Ataque Bash Bomb transmitido en tiempo real al Live Terminal! IP 198.51.100.42 baneada.');
    } catch (err) {
      setStatusMsg('Error en prueba SSH.');
    }
  };

  const handleSimulateFTP = async () => {
    setStatusMsg('🚀 Transmitiendo ataque FTP en vivo (Credential Spray & Malware Upload)...');
    try {
      await apiFetch('/api/dev/simulate-attack', {
        method: 'POST',
        body: JSON.stringify({ type: 'ftp' })
      });
      setStatusMsg('🔥 Ataque FTP transmitido en tiempo real. IP 203.0.113.88 baneada.');
    } catch (err) {
      setStatusMsg('Error en prueba FTP.');
    }
  };

  const handleSimulateHTTP = async () => {
    setStatusMsg('🚀 Transmitiendo ataque HTTP en vivo (3 Logins fallidos + SQLi)...');
    try {
      await apiFetch('/api/dev/simulate-attack', {
        method: 'POST',
        body: JSON.stringify({ type: 'http' })
      });
      setStatusMsg('🔥 3 Logins HTTP transmitidos en tiempo real. IP 192.0.2.105 baneada automáticamente.');
    } catch (err) {
      setStatusMsg('Error en prueba HTTP.');
    }
  };

  return (
    <div className="bg-[#FEF08A] border-3 border-black p-4 shadow-[6px_6px_0px_0px_#000] flex flex-col gap-3 my-2 animate-bounce-short">
      <div className="flex items-center justify-between border-b-2 border-black pb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[24px] text-black">terminal</span>
          <h2 className="font-black text-sm text-black uppercase tracking-wider">
            🔓 MODO DESARROLLADOR DESBLOQUEADO (CÓDIGO KONAMI W,W,S,S,A,D,A,D,B,A)
          </h2>
        </div>
        <button
          onClick={onClose}
          className="bg-white hover:bg-[#FECACA] text-black font-black text-xs px-2.5 py-1 border border-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
        >
          OCULTAR DEV MODE
        </button>
      </div>

      {statusMsg && (
        <div className="bg-white border-2 border-black text-black font-bold text-xs p-2.5 shadow-[2px_2px_0px_0px_#000]">
          {statusMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <button
          onClick={handleUnbanAll}
          disabled={loading}
          className="bg-[#A7F3D0] hover:bg-[#6EE7B7] text-black font-black text-xs py-2.5 px-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] cursor-pointer active:translate-x-[1px]"
        >
          🔓 DESBANEAR TODAS LAS IPs / DNS
        </button>

        <button
          onClick={handleSimulateSSH}
          className="bg-[#BAE6FD] hover:bg-[#7DD3FC] text-black font-black text-xs py-2.5 px-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] cursor-pointer active:translate-x-[1px]"
        >
          💥 ATAQUE SSH (BASH BOMB &amp; SUDO)
        </button>

        <button
          onClick={handleSimulateFTP}
          className="bg-[#DDD6FE] hover:bg-[#C4B5FD] text-black font-black text-xs py-2.5 px-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] cursor-pointer active:translate-x-[1px]"
        >
          💥 ATAQUE FTP (SPRAY &amp; UPLOAD)
        </button>

        <button
          onClick={handleSimulateHTTP}
          className="bg-[#FECACA] hover:bg-[#FCA5A5] text-black font-black text-xs py-2.5 px-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] cursor-pointer active:translate-x-[1px]"
        >
          💥 ATAQUE HTTP (3 ESCANEOS A BANEO)
        </button>
      </div>
    </div>
  );
}
