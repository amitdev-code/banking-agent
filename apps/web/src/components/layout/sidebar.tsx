'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, History, LayoutDashboard, LogOut, Settings2 } from 'lucide-react';

import { useMe } from '@/hooks/use-me';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/history',   icon: History,          label: 'History' },
  { href: '/settings',  icon: Settings2,         label: 'Scoring Config' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useMe();

  async function handleLogout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore — session may already be gone
    }
    localStorage.clear();
    // Hard navigation: ensures the browser has processed the Set-Cookie clearing
    // header before the next request goes out, so middleware won't see a stale cookie.
    window.location.href = '/login';
  }

  return (
    <aside className="w-14 flex-shrink-0 border-r flex flex-col items-center py-4 gap-2 bg-background">
      {/* Logo */}
      <div
        className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0"
        title={user?.tenantName ?? 'Banking CRM'}
      >
        <Building2 className="h-4 w-4 text-primary-foreground" />
      </div>

      {/* Tenant name tooltip badge */}
      {user?.tenantName && (
        <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight px-1 max-w-[52px] truncate">
          {user.tenantName}
        </span>
      )}

      {/* Nav links */}
      <nav className="flex flex-col gap-1 mt-2 flex-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
              pathname.startsWith(href)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
          </Link>
        ))}
      </nav>

      {/* User initials avatar + logout */}
      <div className="flex flex-col items-center gap-2">
        {user && (
          <div
            className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground"
            title={`${user.name} · ${user.email}`}
          >
            {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        )}

        <button
          onClick={() => { void handleLogout(); }}
          title="Logout"
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
