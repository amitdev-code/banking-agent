'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface CategoryEntry {
  category: string;
  type: string;
  total: number;
  count: number;
}

interface SpendingCategoryChartProps {
  spendingCategories: CategoryEntry[];
}

const CATEGORY_COLORS: Record<string, string> = {
  GROCERY:       '#10b981',
  SHOPPING:      '#6366f1',
  DINING:        '#f59e0b',
  ENTERTAINMENT: '#ec4899',
  TRAVEL:        '#3b82f6',
  FUEL:          '#f97316',
  UTILITIES:     '#8b5cf6',
  MEDICAL:       '#14b8a6',
  EMI:           '#ef4444',
  OTHER:         '#94a3b8',
};

const CATEGORY_ICONS: Record<string, string> = {
  GROCERY: '🛒', SHOPPING: '🛍️', DINING: '🍽️', ENTERTAINMENT: '🎬',
  TRAVEL: '✈️', FUEL: '⛽', UTILITIES: '💡', MEDICAL: '🏥', EMI: '🏦', OTHER: '📦',
};

function formatINR(amount: number): string {
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
}

export function SpendingCategoryChart({ spendingCategories }: SpendingCategoryChartProps) {
  // Only show DEBIT, exclude SALARY
  const debits = spendingCategories.filter(
    (c) => c.type === 'DEBIT' && c.category !== 'SALARY',
  );
  const credits = spendingCategories.filter((c) => c.type === 'CREDIT');

  const totalDebit = debits.reduce((s, c) => s + c.total, 0);
  const totalCredit = credits.reduce((s, c) => s + c.total, 0);

  // Top 6 categories for the donut, rest as OTHER
  const sorted = [...debits].sort((a, b) => b.total - a.total);
  const top = sorted.slice(0, 6);
  const rest = sorted.slice(6);
  const otherTotal = rest.reduce((s, c) => s + c.total, 0);

  const chartData = [
    ...top.map((c) => ({ name: c.category, value: c.total, count: c.count })),
    ...(otherTotal > 0 ? [{ name: 'OTHER', value: otherTotal, count: 0 }] : []),
  ];

  if (debits.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        No spending data available for this customer.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 px-3 py-2.5">
          <p className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Total Spending (12m)</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-300 mt-0.5">{formatINR(totalDebit)}</p>
          <p className="text-[10px] text-muted-foreground">{debits.reduce((s, c) => s + c.count, 0)} transactions</p>
        </div>
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 px-3 py-2.5">
          <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Total Credits (12m)</p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{formatINR(totalCredit)}</p>
          <p className="text-[10px] text-muted-foreground">{credits.reduce((s, c) => s + c.count, 0)} transactions</p>
        </div>
      </div>

      {/* Donut + legend side by side */}
      <div className="flex items-center gap-4">
        {/* Donut chart */}
        <div className="shrink-0 w-36 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={58}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={CATEGORY_COLORS[entry.name] ?? CATEGORY_COLORS['OTHER']!}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [formatINR(value), name]}
                contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 6 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category legend list */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {chartData.map((entry) => {
            const pct = totalDebit > 0 ? Math.round((entry.value / totalDebit) * 100) : 0;
            return (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="text-sm shrink-0">
                  {CATEGORY_ICONS[entry.name] ?? '📦'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[11px] font-medium truncate capitalize">
                      {entry.name.charAt(0) + entry.name.slice(1).toLowerCase()}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatINR(entry.value)}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: CATEGORY_COLORS[entry.name] ?? CATEGORY_COLORS['OTHER'],
                      }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 w-7 text-right">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Savings rate */}
      {totalCredit > 0 && (
        <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Savings rate (12m)</span>
          <span className={`font-semibold ${totalCredit > totalDebit ? 'text-emerald-600' : 'text-red-500'}`}>
            {totalCredit > 0
              ? `${Math.round(((totalCredit - totalDebit) / totalCredit) * 100)}%`
              : '—'}
          </span>
        </div>
      )}
    </div>
  );
}
