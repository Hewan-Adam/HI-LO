interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-felt-light px-6 py-12 text-center">
      <p className="font-display text-lg text-parchment">{title}</p>
      <p className="max-w-xs font-body text-sm text-sage">{description}</p>
      {action}
    </div>
  );
}
