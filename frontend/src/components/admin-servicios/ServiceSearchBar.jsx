import React from 'react';

// Barra de búsqueda de honeypots: controlada por el padre (AdminServiciosView).
// filters = { name, type, port, status } — status 'alerta' = intrusión activa.
const inputCls = 'bg-surface-container border border-hairline-strong focus:border-primary font-label-code text-xs px-2.5 py-1.5 rounded-lg text-on-surface outline-none transition-colors';
const labelCls = 'font-label-caps text-[10px] text-outline uppercase';

export default function ServiceSearchBar({ filters, onFilterChange }) {
  const set = (key) => (e) => onFilterChange({ ...filters, [key]: e.target.value });

  return (
    <div className="bg-surface-container-low border border-hairline rounded-xl px-4 py-2.5 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
      <div className="md:col-span-2 flex flex-col gap-1">
        <label className={labelCls}>Nombre</label>
        <input
          type="text"
          value={filters.name}
          onChange={set('name')}
          placeholder="Buscar por nombre..."
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelCls}>Tipo de servicio</label>
        <select value={filters.type} onChange={set('type')} className={inputCls}>
          <option value="">Todos</option>
          <option value="ssh">SSH</option>
          <option value="ftp">FTP</option>
          <option value="http">HTTP</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelCls}>Puerto</label>
        <input
          type="text"
          inputMode="numeric"
          value={filters.port}
          onChange={set('port')}
          placeholder="Ej: 8082"
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelCls}>Estado</label>
        <select value={filters.status} onChange={set('status')} className={inputCls}>
          <option value="">Todos</option>
          <option value="running">Activo</option>
          <option value="stopped">Detenido</option>
          <option value="alerta">Alerta</option>
        </select>
      </div>
    </div>
  );
}
