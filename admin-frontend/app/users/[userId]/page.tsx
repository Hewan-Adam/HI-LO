'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserDetail, banUser, unbanUser, ApiError } from '../../../lib/api';
import { formatCurrency, formatDateTime } from '../../../lib/format';
import { Panel, StatRow } from '../../../components/Panel';
import { Badge } from '../../../components/Badge';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import type { AdminUserDetail } from '../../../lib/types';

export default function UserDetailPage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    getUserDetail(params.userId).then(setUser).catch(() => setUser(null));
  }

  useEffect(reload, [params.userId]);

  async function handleBan(reason?: string) {
    setBusy(true);
    setError(null);
    try {
      await banUser(params.userId, reason);
      setDialogOpen(false);
      reload();
    } catch (err) {
      // The backend enforces a privilege hierarchy server-side (an ADMIN
      // cannot ban a peer ADMIN or a SUPER_ADMIN) — surface that plainly
      // rather than a generic failure message, since it's an expected,
      // meaningful rejection, not a bug.
      setError(err instanceof ApiError ? err.message : 'Could not ban this user.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnban() {
    setBusy(true);
    setError(null);
    try {
      await unbanUser(params.userId);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not unban this user.');
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return <div className="p-6 font-body text-sm text-sage">Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <button onClick={() => router.push('/users')} className="w-fit font-body text-sm text-sage hover:text-parchment">
        ← Back to users
      </button>

      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-body text-2xl font-semibold text-parchment">{user.username ?? user.telegramId}</h1>
          <p className="font-mono text-sm text-sage">{user.telegramId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={user.role === 'PLAYER' ? 'neutral' : 'brass'}>{user.role}</Badge>
          {user.isBanned ? <Badge tone="danger">Banned</Badge> : <Badge tone="success">Active</Badge>}
        </div>
      </header>

      {error && <Panel className="border-brick/40 text-sm text-brick-light">{error}</Panel>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel>
          <p className="mb-2 font-body text-xs uppercase tracking-wide text-sage">Wallet</p>
          <StatRow label="Balance" value={formatCurrency(user.walletBalance)} />
          <StatRow label="Bonus balance" value={formatCurrency(user.walletBonusBalance)} />
        </Panel>
        <Panel>
          <p className="mb-2 font-body text-xs uppercase tracking-wide text-sage">Activity</p>
          <StatRow label="Games played" value={user.totalGamesPlayed} />
          <StatRow label="Total wagered" value={formatCurrency(user.totalWagered)} />
          <StatRow label="Joined" value={formatDateTime(user.createdAt)} />
        </Panel>
      </div>

      {user.isBanned ? (
        <div>
          {user.bannedReason && <p className="mb-2 font-body text-sm text-sage">Reason: {user.bannedReason}</p>}
          <button
            onClick={handleUnban}
            disabled={busy}
            className="rounded-md bg-emerald-500/10 px-4 py-2 font-body text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Unban user'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setDialogOpen(true)}
          className="w-fit rounded-md bg-brick/10 px-4 py-2 font-body text-sm font-semibold text-brick-light hover:bg-brick/20"
        >
          Ban user
        </button>
      )}

      {dialogOpen && (
        <ConfirmDialog
          title={`Ban ${user.username ?? user.telegramId}?`}
          description="They will be immediately unable to log in or play. This is logged to the audit trail."
          confirmLabel="Ban user"
          requireReason
          busy={busy}
          onConfirm={handleBan}
          onCancel={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
