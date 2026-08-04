import type { ReactNode } from 'react';

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/5 bg-felt-light p-4 ${className}`}>{children}</div>;
}

export function StatRow({ label, value, valueClassName = '' }: { label: string; value: ReactNode; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2.5 last:border-0">
      <span className="font-body text-sm text-sage">{label}</span>
      <span className={`font-mono text-sm font-semibold text-parchment ${valueClassName}`}>{value}</span>
    </div>
  );
}
