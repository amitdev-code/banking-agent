import Link from 'next/link';
import { Building2, History, LayoutDashboard, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-14 flex-shrink-0 border-r flex flex-col items-center py-4 gap-4">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Building2 className="h-4 w-4 text-primary-foreground" />
        </div>

        <nav className="flex flex-col gap-2 mt-4 flex-1">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Dashboard"
          >
            <LayoutDashboard className="h-4 w-4" />
          </Link>
          <Link
            href="/history"
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="History"
          >
            <History className="h-4 w-4" />
          </Link>
        </nav>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </aside>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
