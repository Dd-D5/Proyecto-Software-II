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
    <div className="min-h-screen w-full bg-background text-on-surface flex items-center justify-center p-4 select-none font-sans">
      <div className="relative w-full max-w-md bg-surface-container-low border border-hairline rounded-xl shadow-lg p-8 z-10 flex flex-col gap-6">
        {/* Cabecera */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary-container">
            <span className="material-symbols-outlined text-[28px]">shield_lock</span>
          </div>
          <div>
            <h1 className="font-headline-sm text-headline-sm font-semibold tracking-tight text-on-surface">
              AegisTrap <span className="text-primary-container">SOC</span>
            </h1>
            <p className="font-label-caps text-label-caps text-outline uppercase">
              Panel de Control Honeypot v2.0
            </p>
          </div>
        </div>

        {/* Alerta de Error */}
        {error && (
          <div className="bg-error-container/10 border border-error-container/30 text-error font-medium text-xs p-3 rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de Login de Solo Contraseña */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-label-caps text-outline uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">key</span>
              Contraseña de Administrador
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese la contraseña"
              className="bg-surface-container border border-hairline-strong focus:border-primary text-on-surface font-label-code text-sm px-4 py-3 rounded-lg outline-none transition-colors"
              required
            />
            <span className="font-caption text-caption text-outline">
              * El campo limpia e invalida automáticamente caracteres de inyección.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-fixed-dim text-on-primary font-semibold text-sm py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                <span className="font-label-caps text-label-caps uppercase">Autenticando...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">login</span>
                <span className="font-label-caps text-label-caps uppercase">Entrar</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
