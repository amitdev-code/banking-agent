'use client';

import { RunCard } from './run-card';

interface Run {
  id: string;
  mode: string;
  status: string;
  customerCount: number | null;
  highValueCount: number | null;
  avgScore: number | null;
  createdAt: string;
}

interface RunTimelineProps {
  runs: Run[];
  isLoading: boolean;
}

export function RunTimeline({ runs, isLoading }: RunTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground text-sm">
        No analysis runs yet. Go to the dashboard to run your first analysis.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <RunCard key={run.id} {...run} />
      ))}
    </div>
  );
}
