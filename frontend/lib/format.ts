export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatMultiplier(multiplier: number): string {
  return `${multiplier.toFixed(2)}×`;
}

export function formatCardCode(code: string): { rank: string; suit: '♠' | '♥' | '♦' | '♣'; color: 'red' | 'black' } {
  const suitChar = code.slice(-1);
  const rank = code.slice(0, -1);
  const suitMap: Record<string, { symbol: '♠' | '♥' | '♦' | '♣'; color: 'red' | 'black' }> = {
    S: { symbol: '♠', color: 'black' },
    C: { symbol: '♣', color: 'black' },
    H: { symbol: '♥', color: 'red' },
    D: { symbol: '♦', color: 'red' },
  };
  const suit = suitMap[suitChar] ?? { symbol: '♠', color: 'black' };
  return { rank, suit: suit.symbol, color: suit.color };
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
