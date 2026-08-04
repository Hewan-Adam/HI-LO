interface RoleGateProps {
  isSuperAdmin: boolean;
  children: React.ReactNode;
  fallbackMessage?: string;
}

/**
 * The backend already enforces this server-side (RolesGuard) — this
 * component is purely UX: telling an ADMIN *why* a control is disabled
 * ("requires Super Admin") is better than either hiding it silently (looks
 * like a bug) or letting them click it and see an opaque 403 (see
 * AdminGameSettingsController in the backend, phase 5, for the actual
 * enforcement).
 */
export function RoleGate({ isSuperAdmin, children, fallbackMessage = 'This action requires Super Admin.' }: RoleGateProps) {
  if (isSuperAdmin) return <>{children}</>;
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 font-body text-sm text-sage">
      {fallbackMessage}
    </div>
  );
}
