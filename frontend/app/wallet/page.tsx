'use client';

import { useEffect, useState } from 'react';
import { getWallet, getWalletHistory } from '../../lib/api';
import { formatCurrency, formatRelativeDate } from '../../lib/format';
import { Panel } from '../../components/Panel';
import { EmptyState } from '../../components/EmptyState';
import type { TransactionEntry, WalletSummary } from '../../lib/types';

const TYPE_LABELS: Record<TransactionEntry['type'], string> = {
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  BET: 'Bet placed',
  CASHOUT: 'Cashed out',
  REFUND: 'Refund',
  BONUS_CREDIT: 'Bonus credit',
  PROMOTION_CREDIT: 'Promotion',
  REFERRAL_REWARD: 'Referral reward',
};

const CREDIT_TYPES = new Set<TransactionEntry['type']>(['DEPOSIT', 'CASHOUT', 'REFUND', 'BONUS_CREDIT', 'PROMOTION_CREDIT', 'REFERRAL_REWARD']);

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [history, setHistory] = useState<TransactionEntry[] | null>(null);

  useEffect(() => {
    getWallet().then(setWallet).catch(() => {});
    getWalletHistory(30).then(setHistory).catch(() => setHistory([]));
  }, []);

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
      <header>
        <p className="font-body text-xs uppercase tracking-wide text-sage">Wallet</p>
        <h1 className="font-display text-3xl font-semibold text-parchment">Your balance</h1>
      </header>

      <Panel className="text-center">
        <p className="font-body text-xs uppercase tracking-wide text-sage">Available</p>
        <p className="mt-1 font-display text-5xl font-semibold text-brass">{wallet ? formatCurrency(wallet.balance, wallet.currency) : '—'}</p>
        {wallet && wallet.bonusBalance > 0 && (
          <p className="mt-2 font-mono text-sm text-sage">+ {formatCurrency(wallet.bonusBalance, wallet.currency)} bonus balance</p>
        )}
      </Panel>

      <div>
        <p className="mb-2 font-body text-xs uppercase tracking-wide text-sage">Recent activity</p>
        {history === null && <Panel className="animate-pulse text-center text-sage">Loading…</Panel>}
        {history?.length === 0 && <EmptyState title="No activity yet" description="Deposits, bets, and cashouts will show up here." />}
        {history && history.length > 0 && (
          <Panel className="divide-y divide-white/5 p-0">
            {history.map((tx) => {
              const isCredit = CREDIT_TYPES.has(tx.type);
              return (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-body text-sm text-parchment">{TYPE_LABELS[tx.type]}</p>
                    <p className="font-body text-xs text-sage">{formatRelativeDate(tx.createdAt)}</p>
                  </div>
                  <p className={`font-mono text-sm font-semibold ${isCredit ? 'text-brass' : 'text-sage'}`}>
                    {isCredit ? '+' : '−'}
                    {formatCurrency(tx.amount)}
                  </p>
                </div>
              );
            })}
          </Panel>
        )}
      </div>
    </div>
  );
}
