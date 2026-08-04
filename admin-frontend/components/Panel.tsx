export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-white/5 bg-felt-light p-4 ${className}`}>{children}</div>;
}

export function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2 last:border-0">
      <span className="font-body text-sm text-sage">{label}</span>
      <span className="font-mono text-sm font-semibold text-parchment">{value}</span>
    </div>
  );
}
