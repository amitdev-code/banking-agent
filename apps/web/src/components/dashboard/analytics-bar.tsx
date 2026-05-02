'use client';

import type { ScoredCustomer } from '@banking-crm/types';

interface AnalyticsBarProps {
  customers: ScoredCustomer[];
  isLoading: boolean;
}

export function AnalyticsBar({ customers, isLoading }: AnalyticsBarProps) {
  const totalScored = customers.length;
  const highValue = customers.filter((c) => c.qualifies && c.readinessLabel === 'Primed').length;
  const avgScore =
    totalScored > 0
      ? Math.round(customers.reduce((sum, c) => sum + c.totalScore, 0) / totalScored)
      : 0;

  const stats = [
    { label: 'Total Scored', value: totalScored },
    { label: 'High-Value (Primed)', value: highValue },
    { label: 'Avg Score', value: totalScored > 0 ? avgScore : '—' },
    {
      label: 'Conversion Rate',
      value:
        totalScored > 0
          ? `${Math.round((customers.filter((c) => c.qualifies).length / totalScored) * 100)}%`
          : '—',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b bg-muted/30 flex-shrink-0">
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <p className={`text-xl font-bold tabular-nums ${isLoading ? 'opacity-40' : ''}`}>
            {isLoading ? '…' : stat.value}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
