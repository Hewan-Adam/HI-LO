const TONES = {
  neutral: 'bg-white/5 text-sage border-white/10',
  brass: 'bg-brass/10 text-brass border-brass/30',
  danger: 'bg-brick/10 text-brick-light border-brick/30',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
} as const;

interface BadgeProps {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs ${TONES[tone]}`}>{children}</span>
  );
}
