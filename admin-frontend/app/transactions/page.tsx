'use client';

import { useState } from 'react';
import { searchTransactions } from '../../lib/api';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/Badge';
import type { AdminTransaction, TransactionStatus, TransactionType } from '../../lib/types';

const TYPES: TransactionType[] = ['DEPOSIT', 'WITHDRAWAL', 'BET', 'CASHOUT', 'REFUND', 'BONUS_CREDIT', 'PROMOTION_CREDIT', 'REFERRAL_REWARD'];
const STATUSES: TransactionStatus[] = ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'];

const STATUS_TONE: Record<TransactionStatus, 'success' | 'danger' | 'neutral'> = {
  COMPLETED: 'success',
  FAILED: 'danger',
  REVERSED: 'danger',
  PENDING: 'neutral',
};

export default function TransactionsPage() {
  const [userId, setUserId] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<AdminTransaction[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch() {
    setLoading(true);
    try {
      const result = await searchTransactions({ userId: userId || undefined, type: type || undefined, status: status || undefined, limit: 100 });
      setRows(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="font-body text-2xl font-semibold text-parchment">Transactions</h1>
        <p className="font-body text-sm text-sage">Cross-user oversight — every wallet movement, across every player</p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-white/5 bg-felt-light p-4">
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-sage">User ID</span>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="optional"
            className="w-48 rounded-md border border-white/10 bg-felt px-2 py-1.5 font-mono text-sm text-parchment placeholder:text-sage/60 focus:border-brass focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-sage">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-md border border-white/10 bg-felt px-2 py-1.5 font-body text-sm text-parchment focus:border-brass focus:outline-none"
          >
            <option value="">Any</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-sage">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-white/10 bg-felt px-2 py-1.5 font-body text-sm text-parchment focus:border-brass focus:outline-none"
          >
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button onClick={runSearch} className="rounded-md bg-brass/10 px-3 py-1.5 font-body text-sm font-semibold text-brass hover:bg-brass/20">
          Search
        </button>
      </div>

      <DataTable<AdminTransaction>
        rows={rows ?? []}
        loading={loading}
        emptyMessage={rows === null ? 'Set filters and search' : 'No transactions match'}
        keyFn={(t) => t.id}
        columns={[
          { header: 'Date', render: (t) => formatDateTime(t.createdAt) },
          { header: 'User', render: (t) => t.userId.slice(0, 8) + '…' },
          { header: 'Type', render: (t) => t.type },
          { header: 'Status', render: (t) => <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge> },
          { header: 'Amount', render: (t) => formatCurrency(t.amount) },
          { header: 'Balance after', render: (t) => formatCurrency(t.balanceAfter) },
        ]}
      />
    </div>
  );
}
