'use client';

import { useState } from 'react';

import type { ScoredCustomer, WorkflowCompleteEvent } from '@banking-crm/types';
import { AnalyticsBar } from './analytics-bar';
import { ScoreDistributionChart } from './score-distribution-chart';
import { CustomerCard } from '../customers/customer-card';
import { CustomerFilters, type SortKey, type ReadinessFilter } from '../customers/customer-filters';
import { SkeletonCard } from '../customers/skeleton-card';

type EnrichedCustomer = ScoredCustomer & {
  fullName: string;
  phone: string;
  city: string;
  age: number;
  avgMonthlyBalance: number;
  messageEn?: string;
  messageHi?: string;
  resultId?: string;
  isMessageEdited?: boolean;
  editedMessage?: string | null;
};

interface ResultsPanelProps {
  customers: EnrichedCustomer[];
  isLoading: boolean;
  summary: WorkflowCompleteEvent | null;
}

function sortCustomers(customers: EnrichedCustomer[], sort: SortKey): EnrichedCustomer[] {
  return [...customers].sort((a, b) => {
    if (sort === 'score') return b.totalScore - a.totalScore;
    if (sort === 'age') return a.age - b.age;
    if (sort === 'salary') return b.avgMonthlyBalance - a.avgMonthlyBalance;
    return 0;
  });
}

export function ResultsPanel({ customers, isLoading, summary }: ResultsPanelProps) {
  const [sort, setSort] = useState<SortKey>('score');
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter>('all');
  const [qualifiesOnly, setQualifiesOnly] = useState(false);

  const filtered = customers.filter((c) => {
    if (qualifiesOnly && !c.qualifies) return false;
    if (readinessFilter !== 'all' && c.readinessLabel !== readinessFilter) return false;
    return true;
  });

  const sorted = sortCustomers(filtered, sort);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b flex-shrink-0">
        <h2 className="text-sm font-semibold">Results</h2>
        {summary && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary.customerCount} scored · {summary.highValueCount} high-value
          </p>
        )}
      </div>

      <AnalyticsBar customers={customers} isLoading={isLoading} />

      {customers.length > 0 && <ScoreDistributionChart customers={customers} />}

      <CustomerFilters
        sort={sort}
        onSortChange={setSort}
        readinessFilter={readinessFilter}
        onReadinessChange={setReadinessFilter}
        qualifiesOnly={qualifiesOnly}
        onQualifiesChange={setQualifiesOnly}
      />

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {isLoading && !customers.length
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : sorted.map((c) => <CustomerCard key={c.customerId} customer={c} />)}

        {!isLoading && !sorted.length && customers.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">
            No customers match the current filters.
          </p>
        )}

        {!isLoading && !customers.length && (
          <p className="text-center text-sm text-muted-foreground py-10">
            Run an analysis to see results here.
          </p>
        )}
      </div>
    </div>
  );
}
