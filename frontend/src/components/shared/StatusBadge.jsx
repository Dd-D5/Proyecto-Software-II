import React from 'react';

export default function StatusBadge({ status, label, className = '' }) {
  const normalized = (status || label || '').toUpperCase();

  let colorClasses = 'bg-surface-container-highest text-secondary border-[#1e2330]';
  if (normalized.includes('BREACH') || normalized.includes('ERROR') || normalized.includes('CRITICAL')) {
    colorClasses = 'bg-error-container/30 text-error border-error/30';
  } else if (normalized.includes('IDLE')) {
    colorClasses = 'bg-surface-container-highest text-outline border-[#1e2330]';
  } else if (normalized.includes('PROBE')) {
    colorClasses = 'bg-tertiary-container/30 text-tertiary border-tertiary/30';
  } else if (normalized.includes('LIVE') || normalized.includes('ACTIVE') || normalized.includes('VERIFICAD')) {
    colorClasses = 'bg-primary/10 text-primary border-primary/20';
  }

  return (
    <span
      className={`font-label-caps text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${colorClasses} ${className}`}
    >
      {label || status}
    </span>
  );
}
