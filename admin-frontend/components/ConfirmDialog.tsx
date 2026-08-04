'use client';

import { useState } from 'react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  requireReason?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConfirmDialog({ title, description, confirmLabel, requireReason, onConfirm, onCancel, busy }: ConfirmDialogProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-felt-light p-5 shadow-felt">
        <p className="font-body text-base font-semibold text-parchment">{title}</p>
        <p className="mt-1 font-body text-sm text-sage">{description}</p>

        {requireReason && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (visible in the audit log)"
            className="mt-3 w-full rounded-md border border-white/10 bg-felt px-3 py-2 font-body text-sm text-parchment placeholder:text-sage/60 focus:border-brass focus:outline-none"
            rows={3}
          />
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-md px-3 py-1.5 font-body text-sm text-sage hover:text-parchment disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason || undefined)}
            disabled={busy}
            className="rounded-md bg-brick px-3 py-1.5 font-body text-sm font-semibold text-parchment hover:bg-brick-light disabled:opacity-50"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
