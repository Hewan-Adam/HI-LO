'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/users', label: 'Users' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/game-settings', label: 'Game Settings' },
  { href: '/audit-log', label: 'Audit Log' },
] as const;

interface SidebarProps {
  username?: string;
  role?: string;
  onLogout: () => void;
}

export function Sidebar({ username, role, onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-white/5 bg-felt-light">
      <div className="border-b border-white/5 px-5 py-5">
        <p className="font-body text-sm font-semibold text-parchment">Hi-Lo Admin</p>
        <p className="font-body text-xs text-sage">Kef-Zk operations</p>
      </div>

      <nav className="flex-1 px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 block rounded-md px-3 py-2 font-body text-sm transition-colors ${
                active ? 'bg-brass/10 text-brass' : 'text-sage hover:bg-white/5 hover:text-parchment'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 px-4 py-4">
        <p className="truncate font-body text-sm text-parchment">{username ?? 'Admin'}</p>
        <p className="font-mono text-xs text-sage">{role}</p>
        <button onClick={onLogout} className="mt-2 font-body text-xs text-brick-light hover:underline">
          Sign out
        </button>
      </div>
    </aside>
  );
}
