import React from 'react';

export default function ServiceList({ services, onToggleService, onRestartService }) {
  return (
    <div className="bg-surface-container-lowest border border-hairline rounded-xl overflow-hidden shadow-sm">
      <table className="w-full text-left font-mono-sm text-[11px]">
        <thead className="bg-surface-container-high border-b border-hairline text-outline font-label-caps text-[9px] uppercase tracking-wider">
          <tr>
            <th className="py-2.5 px-4">Servicio / Trap</th>
            <th className="py-2.5 px-3">Puerto Fake</th>
            <th className="py-2.5 px-3">Protocolo</th>
            <th className="py-2.5 px-3">Sandbox Isolation</th>
            <th className="py-2.5 px-3">Estado</th>
            <th className="py-2.5 px-3">Sesiones Activas</th>
            <th className="py-2.5 px-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline/50">
          {services.map((srv) => (
            <tr key={srv.id} className="hover:bg-surface-container/40 transition-colors">
              <td className="py-2.5 px-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[16px]">
                  {srv.icon || 'dns'}
                </span>
                <span className="font-semibold text-on-surface">{srv.name}</span>
              </td>
              <td className="py-2.5 px-3 text-primary font-bold">{srv.port}</td>
              <td className="py-2.5 px-3 text-on-surface-variant uppercase">{srv.protocol}</td>
              <td className="py-2.5 px-3">
                <span className="text-[9px] font-label-caps bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 text-outline">
                  {srv.sandbox}
                </span>
              </td>
              <td className="py-2.5 px-3">
                <span
                  className={`inline-flex items-center gap-1 text-[9px] font-label-caps px-2 py-0.5 rounded border uppercase font-bold ${
                    srv.status === 'ACTIVO'
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : srv.status === 'BREACH'
                      ? 'bg-error-container/30 text-error border-error/30 animate-pulse'
                      : 'bg-surface-container text-outline border-hairline'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      srv.status === 'ACTIVO'
                        ? 'bg-primary'
                        : srv.status === 'BREACH'
                        ? 'bg-error'
                        : 'bg-outline'
                    }`}
                  ></span>
                  {srv.status}
                </span>
              </td>
              <td className="py-2.5 px-3 text-secondary font-bold">{srv.activeSessions}</td>
              <td className="py-2.5 px-4 text-right space-x-2">
                <button
                  onClick={() => onToggleService(srv.id)}
                  className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface text-[10px] transition-colors"
                >
                  {srv.status === 'INACTIVO' ? 'Iniciar' : 'Detener'}
                </button>
                <button
                  onClick={() => onRestartService(srv.id)}
                  className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-bright text-secondary text-[10px] transition-colors"
                >
                  Reiniciar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
