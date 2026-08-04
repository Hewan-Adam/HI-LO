'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/lobby', label: 'Play', icon: '▲' },
  { href: '/wallet', label: 'Wallet', icon: '◆' },
  { href: '/leaderboard', label: 'Ranks', icon: '★' },
  { href: '/history', label: 'History', icon: '≡' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/5 bg-felt/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-2 py-2">
        {TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-body transition-colors ${
                active ? 'text-brass' : 'text-sage/70 hover:text-sage'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
