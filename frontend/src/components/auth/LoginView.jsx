import React, { useState } from 'react';
import { apiFetch } from '../../services/api';

export default function LoginView({ onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Saneamiento de entrada local antes de enviar
    const cleanPass = password.trim().replace(/['"\\;]/g, '');
    if (!cleanPass) {
      setError('Por favor ingrese la contraseña de administración.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ password: cleanPass }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        // Fallback en caso de respuesta no JSON
      }

      if (!response.ok || !data.token) {
        throw new Error(data.error || 'Contraseña incorrecta');
      }

      // Guardar token en localStorage
      localStorage.setItem('aegis_token', data.token);
      onLoginSuccess(data.token);
    } catch (err) {
      if (err.name === 'TypeError' || (err.message && err.message.toLowerCase().includes('fetch'))) {
        setError('No se pudo conectar con el servidor backend (puerto 8080). Asegúrese de que aegistrap_backend esté iniciado.');
      } else {
        setError(err.message || 'Error de conexión con el servidor backend');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] text-black flex items-center justify-center p-4 relative font-sans select-none overflow-hidden">
      {/* Elementos decorativos Neobrutalistas de fondo */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-[#FEF08A] border-3 border-black shadow-[4px_4px_0px_0px_#000] rotate-6 pointer-events-none"></div>
      <div className="absolute bottom-12 right-12 w-40 h-40 bg-[#BAE6FD] border-3 border-black shadow-[6px_6px_0px_0px_#000] -rotate-12 pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-[#FBCFE8] border-3 border-black shadow-[4px_4px_0px_0px_#000] rotate-45 pointer-events-none"></div>

      {/* Tarjeta Neobrutalista de Login */}
      <div className="relative w-full max-w-md bg-white border-3 border-black p-8 shadow-[10px_10px_0px_0px_#000] z-10 flex flex-col gap-6">
        
        {/* Cabecera / Banner */}
        <div className="bg-[#FEF08A] border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex items-center gap-3">
          <div className="w-12 h-12 bg-[#A7F3D0] border-2 border-black flex items-center justify-center text-black font-black text-2xl shadow-[2px_2px_0px_0px_#000]">
            <span className="material-symbols-outlined text-[28px]">shield_lock</span>
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight uppercase text-black">
              AEGISTRAP <span className="bg-[#A7F3D0] px-1 border border-black">SOC</span>
            </h1>
            <p className="text-xs font-bold text-black uppercase tracking-wider">
              PANEL DE CONTROL HONEYPOT v2.0
            </p>
          </div>
        </div>

        {/* Alerta de Error */}
        {error && (
          <div className="bg-[#FECACA] border-2 border-black text-black font-bold text-xs p-3 shadow-[3px_3px_0px_0px_#000] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de Login de Solo Contraseña */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5 text-black">
              <span className="material-symbols-outlined text-[18px]">key</span>
              CONTRASEÑA DE ADMINISTRADOR
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese la contraseña"
              className="bg-[#FAF7F2] border-2 border-black focus:bg-white text-black font-mono font-bold text-sm px-4 py-3 outline-none shadow-[3px_3px_0px_0px_#000] focus:shadow-[5px_5px_0px_0px_#000] transition-all"
              required
            />
            <span className="text-[10px] font-bold text-gray-600">
              * El campo limpia e invalida automáticamente caracteres de inyección.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#A7F3D0] hover:bg-[#6EE7B7] text-black font-black text-sm py-3.5 px-4 border-2 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000] transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                <span>AUTENTICANDO...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">login</span>
                <span>Entrar</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
