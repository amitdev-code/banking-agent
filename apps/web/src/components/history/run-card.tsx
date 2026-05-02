'use client';

import Link from 'next/link';
import { CheckCircle, XCircle, Clock, Pause } from 'lucide-react';

interface RunCardProps {
  id: string;
  mode: string;
  status: string;
  customerCount: number | null;
  highValueCount: number | null;
  avgScore: number | null;
  createdAt: string;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  FAILED: <XCircle className="h-4 w-4 text-destructive" />,
  RUNNING: <Clock className="h-4 w-4 text-blue-500 animate-spin" />,
  PAUSED: <Pause className="h-4 w-4 text-amber-500" />,
};

export function RunCard({
  id,
  mode,
  status,
  customerCount,
  highValueCount,
  avgScore,
  createdAt,
}: RunCardProps) {
  const date = new Date(createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {STATUS_ICON[status] ?? <Clock className="h-4 w-4" />}
            <span className="text-sm font-semibold capitalize">{mode.toLowerCase()} mode</span>
            <span className="text-xs text-muted-foreground font-mono">{id.slice(0, 12)}…</span>
          </div>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>

        {status === 'COMPLETED' && (
          <Link
            href={`/history/${id}`}
            className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors flex-shrink-0"
          >
            View Results
          </Link>
        )}
      </div>

      {status === 'COMPLETED' && (
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-base font-bold">{customerCount ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Scored</p>
          </div>
          <div>
            <p className="text-base font-bold">{highValueCount ?? '—'}</p>
            <p className="text-xs text-muted-foreground">High-Value</p>
          </div>
          <div>
            <p className="text-base font-bold">{avgScore != null ? Math.round(avgScore) : '—'}</p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </div>
        </div>
      )}
    </div>
  );
}
