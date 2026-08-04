'use client';

import { useState } from 'react';
import { getAuditLog, ApiError } from '../../lib/api';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { formatDateTime } from '../../lib/format';
import { DataTable } from '../../components/DataTable';
import { RoleGate } from '../../components/RoleGate';
import type { AuditLogEntry } from '../../lib/types';

export default function AuditLogPage() {
  const { isSuperAdmin } = useAdminAuth();
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [rows, setRows] = useState<AuditLogEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const result = await getAuditLog({ action: action || undefined, entityType: entityType || undefined, limit: 100 });
      setRows(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the audit log.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="font-body text-2xl font-semibold text-parchment">Audit Log</h1>
        <p className="font-body text-sm text-sage">Every ban/unban and game-settings change, with the actor and a metadata snapshot</p>
      </header>

      <RoleGate isSuperAdmin={isSuperAdmin} fallbackMessage="The audit log is itself a sensitive security surface — viewing it requires Super Admin.">
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-white/5 bg-felt-light p-4">
          <label className="flex flex-col gap-1">
            <span className="font-body text-xs text-sage">Action</span>
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. user.ban"
              className="w-56 rounded-md border border-white/10 bg-felt px-2 py-1.5 font-mono text-sm text-parchment placeholder:text-sage/60 focus:border-brass focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-body text-xs text-sage">Entity type</span>
            <input
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="e.g. User"
              className="w-40 rounded-md border border-white/10 bg-felt px-2 py-1.5 font-mono text-sm text-parchment placeholder:text-sage/60 focus:border-brass focus:outline-none"
            />
          </label>
          <button onClick={runSearch} className="rounded-md bg-brass/10 px-3 py-1.5 font-body text-sm font-semibold text-brass hover:bg-brass/20">
            Search
          </button>
        </div>

        {error && <p className="font-body text-sm text-brick-light">{error}</p>}

        <DataTable<AuditLogEntry>
          rows={rows ?? []}
          loading={loading}
          emptyMessage={rows === null ? 'Search to view audit entries' : 'No matching entries'}
          keyFn={(r) => r.id}
          columns={[
            { header: 'Date', render: (r) => formatDateTime(r.createdAt) },
            { header: 'Actor', render: (r) => (r.userId ? r.userId.slice(0, 8) + '…' : 'system') },
            { header: 'Action', render: (r) => r.action },
            { header: 'Entity', render: (r) => `${r.entityType}${r.entityId ? ' · ' + r.entityId.slice(0, 8) + '…' : ''}` },
            { header: 'Metadata', render: (r) => (r.metadata ? JSON.stringify(r.metadata) : '—'), className: 'max-w-xs truncate' },
          ]}
        />
      </RoleGate>
    </div>
  );
}
