'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import type { ScoredCustomer } from '@banking-crm/types';

interface ScoreDistributionChartProps {
  customers: ScoredCustomer[];
}

const BANDS = ['0-10', '10-20', '20-30', '30-40', '40-50', '50-60', '60-70', '70-80', '80-90', '90-100'];

function bandColor(label: string): string {
  const lower = parseInt(label.split('-')[0] ?? '0', 10);
  if (lower >= 80) return '#10b981';
  if (lower >= 70) return '#34d399';
  if (lower >= 50) return '#fbbf24';
  return '#f87171';
}

export function ScoreDistributionChart({ customers }: ScoreDistributionChartProps) {
  const data = BANDS.map((band) => {
    const [low, high] = band.split('-').map(Number) as [number, number];
    return {
      band,
      count: customers.filter((c) => c.totalScore >= low && c.totalScore < high).length,
    };
  });

  return (
    <div className="px-4 py-3 border-b">
      <p className="text-xs font-medium text-muted-foreground mb-2">Score Distribution</p>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <XAxis dataKey="band" tick={{ fontSize: 9 }} interval={1} />
          <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 11, padding: '4px 8px' }}
            formatter={(val: number) => [val, 'customers']}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.band} fill={bandColor(entry.band)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
