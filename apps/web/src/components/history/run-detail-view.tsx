'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

import type { ScoredCustomer, ReadinessLabel } from '@banking-crm/types';
import { ScoreDistributionChart } from '@/components/dashboard/score-distribution-chart';
import { CompactCustomerRow, type CompactCustomer } from './compact-customer-row';

type SortKey = 'score' | 'age' | 'salary';
type ReadinessFilter = ReadinessLabel | 'all';

export interface RunReplayData {
  id: string;
  mode: string;
  status: string;
  createdAt: string;
  customerCount: number | null;
  highValueCount: number | null;
  avgScore: number | null;
  scoredResults: Array<
    ScoredCustomer & {
      fullName: string;
      phone: string;
      city: string;
      age: number;
      avgMonthlyBalance: number;
      messageEn: string;
      messageHi: string;
      resultId: string;
      isMessageEdited: boolean;
      editedMessage: string | null;
    }
  >;
}

interface RunDetailViewProps {
  run: RunReplayData;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'salary', label: 'Salary' },
  { value: 'age', label: 'Age' },
];

const READINESS_OPTIONS: { value: ReadinessFilter; label: string }[] = [
  { value: 'all', label: 'All Readiness' },
  { value: 'Primed', label: 'Primed' },
  { value: 'Engaged', label: 'Engaged' },
  { value: 'Dormant', label: 'Dormant' },
  { value: 'At-Risk', label: 'At-Risk' },
];

function sortCustomers(customers: CompactCustomer[], sort: SortKey): CompactCustomer[] {
  return [...customers].sort((a, b) => {
    if (sort === 'score') return b.totalScore - a.totalScore;
    if (sort === 'age') return a.age - b.age;
    if (sort === 'salary') return b.avgMonthlyBalance - a.avgMonthlyBalance;
    return 0;
  });
}

export function RunDetailView({ run }: RunDetailViewProps) {
  const [sort, setSort] = useState<SortKey>('score');
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter>('all');
  const [qualifiesOnly, setQualifiesOnly] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = run.scoredResults as CompactCustomer[];
    if (qualifiesOnly) list = list.filter((c) => c.qualifies);
    if (readinessFilter !== 'all') list = list.filter((c) => c.readinessLabel === readinessFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.phone.includes(q),
      );
    }
    return sortCustomers(list, sort);
  }, [run.scoredResults, sort, readinessFilter, qualifiesOnly, search]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Score distribution chart */}
      {run.scoredResults.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold">Score Distribution</p>
            <p className="text-xs text-muted-foreground">{run.scoredResults.length} customers analysed</p>
          </div>
          <ScoreDistributionChart customers={run.scoredResults} />
        </div>
      )}

      {/* Customer list card */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b bg-muted/20">
          {/* Search */}
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, city, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Sort buttons */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground mr-0.5">Sort:</span>
            <div className="flex rounded-md border overflow-hidden">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    sort === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Readiness select */}
          <select
            value={readinessFilter}
            onChange={(e) => setReadinessFilter(e.target.value as ReadinessFilter)}
            className="text-[11px] border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {READINESS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Qualifies toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={qualifiesOnly}
              onChange={(e) => setQualifiesOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded"
            />
            <span className="text-[11px] text-muted-foreground">Qualified only</span>
          </label>

          {/* Count badge */}
          <span className="ml-auto inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            {filtered.length} customers
          </span>
        </div>

        {/* Customer rows */}
        <div>
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No customers match the current filters.
            </p>
          ) : (
            filtered.map((customer) => (
              <CompactCustomerRow key={customer.customerId} customer={customer} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
