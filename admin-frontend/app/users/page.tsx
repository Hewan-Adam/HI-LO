'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchUsers } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/Badge';
import type { AdminUserSummary } from '../../lib/types';

export default function UsersPage() {
  const router = useRouter();
  const [telegramId, setTelegramId] = useState('');
  const [username, setUsername] = useState('');
  const [results, setResults] = useState<AdminUserSummary[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch() {
    setLoading(true);
    try {
      const rows = await searchUsers({ telegramId: telegramId || undefined, username: username || undefined, limit: 50 });
      setResults(rows);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="font-body text-2xl font-semibold text-parchment">Users</h1>
        <p className="font-body text-sm text-sage">Search by Telegram ID or username</p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-white/5 bg-felt-light p-4">
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-sage">Telegram ID</span>
          <input
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="e.g. 123456789"
            className="rounded-md border border-white/10 bg-felt px-2 py-1.5 font-mono text-sm text-parchment placeholder:text-sage/60 focus:border-brass focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-sage">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="e.g. ada"
            className="rounded-md border border-white/10 bg-felt px-2 py-1.5 font-body text-sm text-parchment placeholder:text-sage/60 focus:border-brass focus:outline-none"
          />
        </label>
        <button onClick={runSearch} className="rounded-md bg-brass/10 px-3 py-1.5 font-body text-sm font-semibold text-brass hover:bg-brass/20">
          Search
        </button>
      </div>

      <DataTable<AdminUserSummary>
        rows={results ?? []}
        loading={loading}
        emptyMessage={results === null ? 'Enter a Telegram ID or username to search' : 'No users match that search'}
        keyFn={(u) => u.id}
        onRowClick={(u) => router.push(`/users/${u.id}`)}
        columns={[
          { header: 'Telegram ID', render: (u) => u.telegramId },
          { header: 'Username', render: (u) => u.username ?? '—' },
          { header: 'Role', render: (u) => <Badge tone={u.role === 'PLAYER' ? 'neutral' : 'brass'}>{u.role}</Badge> },
          { header: 'Status', render: (u) => (u.isBanned ? <Badge tone="danger">Banned</Badge> : <Badge tone="success">Active</Badge>) },
          { header: 'Joined', render: (u) => formatDateTime(u.createdAt) },
        ]}
      />
    </div>
  );
}
