'use client';

import { BarChart3, TrendingUp, Users } from 'lucide-react';

import type { ScoreCardResultData } from '@banking-crm/types';

interface ScoreCardProps {
  data: ScoreCardResultData;
}

const LABEL_COLORS: Record<string, string> = {
  Primed: 'bg-emerald-500',
  Engaged: 'bg-blue-500',
  Dormant: 'bg-amber-500',
  'At-Risk': 'bg-red-400',
};

export function ScoreCard({ data }: ScoreCardProps) {
  const maxCount = Math.max(...data.distribution.map((d) => d.count), 1);

  return (
    <div className="mt-2 rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Scoring complete</span>
      </div>

      <div className="grid grid-cols-3 divide-x px-0 py-0">
        <div className="px-4 py-3 text-center">
          <p className="text-xl font-bold tabular-nums">{data.totalScored}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Scored</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-xl font-bold tabular-nums text-emerald-600">{data.qualifiedCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Qualified</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-xl font-bold tabular-nums">{data.avgScore}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Avg score</p>
        </div>
      </div>

      <div className="px-4 pb-3 space-y-2">
        {data.distribution.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-28 shrink-0">{d.label}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${LABEL_COLORS[d.label.split(' ')[0]!] ?? 'bg-primary'}`}
                style={{ width: `${(d.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono font-medium w-6 text-right">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
