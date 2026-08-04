'use client';

import { useEffect, useState } from 'react';
import { getGameSettings, setAceMode, setEqualRule, setMultiplierTable, setTargetRtp, ApiError } from '../../lib/api';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Panel } from '../../components/Panel';
import { RoleGate } from '../../components/RoleGate';
import type { AceMode, EqualRule, GameSettings, MultiplierTableEntry } from '../../lib/types';

export default function GameSettingsPage() {
  const { isSuperAdmin } = useAdminAuth();
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [table, setTable] = useState<MultiplierTableEntry[]>([]);
  const [rtpInput, setRtpInput] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  function reload() {
    getGameSettings().then((s) => {
      setSettings(s);
      setTable(s.multiplierTable);
      setRtpInput(s.targetRtpPercent != null ? String(s.targetRtpPercent) : '');
    });
  }

  useEffect(reload, []);

  async function run(key: string, action: () => Promise<unknown>) {
    setSaving(key);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'success', text: 'Saved.' });
      reload();
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof ApiError ? err.message : 'Save failed.' });
    } finally {
      setSaving(null);
    }
  }

  if (!settings) return <div className="p-6 font-body text-sm text-sage">Loading…</div>;

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="font-body text-2xl font-semibold text-parchment">Game Settings</h1>
        <p className="font-body text-sm text-sage">
          These control house edge and player payout directly — changes are Super Admin only and written to the audit log.
        </p>
      </header>

      {message && (
        <Panel className={message.tone === 'success' ? 'border-emerald-500/40 text-emerald-400' : 'border-brick/40 text-brick-light'}>
          {message.text}
        </Panel>
      )}

      <Panel>
        <p className="mb-3 font-body text-xs uppercase tracking-wide text-sage">Ace mode</p>
        <RoleGate isSuperAdmin={isSuperAdmin}>
          <div className="flex gap-2">
            {(['HIGH', 'LOW'] as AceMode[]).map((mode) => (
              <button
                key={mode}
                disabled={saving === 'ace'}
                onClick={() => run('ace', () => setAceMode(mode))}
                className={`rounded-md border px-3 py-1.5 font-body text-sm ${
                  settings.aceMode === mode ? 'border-brass bg-brass/10 text-brass' : 'border-white/10 text-sage hover:border-white/20'
                }`}
              >
                {mode === 'HIGH' ? 'High (14)' : 'Low (1)'}
              </button>
            ))}
          </div>
        </RoleGate>
        {!isSuperAdmin && <p className="mt-2 font-mono text-sm text-parchment">Current: {settings.aceMode}</p>}
      </Panel>

      <Panel>
        <p className="mb-3 font-body text-xs uppercase tracking-wide text-sage">Equal-card rule</p>
        <RoleGate isSuperAdmin={isSuperAdmin}>
          <div className="flex gap-2">
            {(['PUSH', 'LOSS', 'REDRAW'] as EqualRule[]).map((rule) => (
              <button
                key={rule}
                disabled={saving === 'equal'}
                onClick={() => run('equal', () => setEqualRule(rule))}
                className={`rounded-md border px-3 py-1.5 font-body text-sm ${
                  settings.equalRule === rule ? 'border-brass bg-brass/10 text-brass' : 'border-white/10 text-sage hover:border-white/20'
                }`}
              >
                {rule}
              </button>
            ))}
          </div>
        </RoleGate>
        {!isSuperAdmin && <p className="mt-2 font-mono text-sm text-parchment">Current: {settings.equalRule}</p>}
      </Panel>

      <Panel>
        <p className="mb-3 font-body text-xs uppercase tracking-wide text-sage">Multiplier table</p>
        <RoleGate isSuperAdmin={isSuperAdmin} fallbackMessage="Editing the multiplier table requires Super Admin.">
          <div className="flex flex-col gap-2">
            {table.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-16 font-mono text-xs text-sage">streak {entry.streak}</span>
                <input
                  type="number"
                  step="0.01"
                  value={entry.multiplier}
                  onChange={(e) => {
                    const next = [...table];
                    next[i] = { ...next[i], multiplier: Number(e.target.value) };
                    setTable(next);
                  }}
                  className="w-28 rounded-md border border-white/10 bg-felt px-2 py-1 font-mono text-sm text-parchment focus:border-brass focus:outline-none"
                />
                <button
                  onClick={() => setTable(table.filter((_, idx) => idx !== i))}
                  className="font-body text-xs text-brick-light hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="mt-1 flex gap-2">
              <button
                onClick={() => setTable([...table, { streak: (table[table.length - 1]?.streak ?? 0) + 1, multiplier: (table[table.length - 1]?.multiplier ?? 1) + 0.5 }])}
                className="rounded-md border border-white/10 px-3 py-1.5 font-body text-xs text-sage hover:border-white/20"
              >
                + Add streak
              </button>
              <button
                disabled={saving === 'table'}
                onClick={() => run('table', () => setMultiplierTable(table))}
                className="rounded-md bg-brass/10 px-3 py-1.5 font-body text-xs font-semibold text-brass hover:bg-brass/20"
              >
                Save table
              </button>
            </div>
            <p className="mt-1 font-body text-xs text-sage">Must be strictly increasing by streak — the backend rejects anything else.</p>
          </div>
        </RoleGate>
      </Panel>

      <Panel>
        <p className="mb-3 font-body text-xs uppercase tracking-wide text-sage">Target RTP (informational)</p>
        <RoleGate isSuperAdmin={isSuperAdmin}>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              value={rtpInput}
              onChange={(e) => setRtpInput(e.target.value)}
              className="w-28 rounded-md border border-white/10 bg-felt px-2 py-1.5 font-mono text-sm text-parchment focus:border-brass focus:outline-none"
            />
            <span className="font-body text-sm text-sage">%</span>
            <button
              disabled={saving === 'rtp'}
              onClick={() => run('rtp', () => setTargetRtp(Number(rtpInput)))}
              className="rounded-md bg-brass/10 px-3 py-1.5 font-body text-sm font-semibold text-brass hover:bg-brass/20"
            >
              Save
            </button>
          </div>
          <p className="mt-2 font-body text-xs text-sage">
            Not enforced automatically — the multiplier table above is what actually determines real RTP. This is what you intend it to
            approximate; compare against the Dashboard&apos;s &quot;RTP (actual)&quot; figure.
          </p>
        </RoleGate>
      </Panel>
    </div>
  );
}
