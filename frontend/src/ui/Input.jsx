import React, { useId } from 'react';

// Única fuente de verdad de las clases de campo (antes duplicadas con drift en 6 archivos).
// El className que llega en props sobreescribe inputCls (inputs grandes tipo login).
export const inputCls =
  'bg-surface-container border border-hairline-strong focus:border-primary font-label-code text-xs p-2.5 rounded-lg text-on-surface outline-none transition-colors';
export const labelCls = 'font-label-caps text-[10px] text-outline uppercase';

// Input con label asociado (htmlFor/id automáticos). Renderiza label + campo.
// wrapCls permite posicionar el wrapper (ej. col-span en grids).
export default function Input({ label, className = inputCls, wrapCls = 'flex flex-col gap-1.5', ...props }) {
  const id = useId();
  return (
    <div className={wrapCls}>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <input id={id} className={className} {...props} />
    </div>
  );
}
