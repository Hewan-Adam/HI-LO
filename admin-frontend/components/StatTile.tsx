interface StatTileProps {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  hint?: string;
}

export function StatTile({ label, value, accent = false, hint }: StatTileProps) {
  return (
    <div className="rounded-lg border border-white/5 bg-felt-light px-4 py-3">
      <p className="font-body text-xs uppercase tracking-wide text-sage">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${accent ? 'text-brass' : 'text-parchment'}`}>{value}</p>
      {hint && <p className="mt-0.5 font-body text-xs text-sage">{hint}</p>}
    </div>
  );
}
