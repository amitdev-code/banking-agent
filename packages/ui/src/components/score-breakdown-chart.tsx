'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import type { ScoreBreakdown } from '@banking-crm/types';

const MAX_VALUES: Record<keyof ScoreBreakdown, number> = {
  salary: 25,
  balance: 25,
  spending: 20,
  salaryCredited: 15,
  products: 10,
  age: 10,
  activity: 5,
};

const LABELS: Record<keyof ScoreBreakdown, string> = {
  salary: 'Salary',
  balance: 'Balance',
  spending: 'Spending',
  salaryCredited: 'Consistency',
  products: 'Headroom',
  age: 'Age',
  activity: 'Activity',
};

interface ScoreBreakdownChartProps {
  breakdown: ScoreBreakdown;
  className?: string;
}

export function ScoreBreakdownChart({ breakdown, className }: ScoreBreakdownChartProps) {
  const data = (Object.keys(breakdown) as Array<keyof ScoreBreakdown>).map((key) => ({
    subject: LABELS[key],
    score: breakdown[key],
    max: MAX_VALUES[key],
    pct: Math.round((breakdown[key] / MAX_VALUES[key]) * 100),
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 11, fill: '#6b7280' }}
          />
          <Radar
            name="Score"
            dataKey="pct"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip
            formatter={(value: number, name: string, props: { payload?: { subject: string; score: number; max: number } }) => [
              `${props.payload?.score ?? 0}/${props.payload?.max ?? 0} (${value}%)`,
              props.payload?.subject ?? name,
            ]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
