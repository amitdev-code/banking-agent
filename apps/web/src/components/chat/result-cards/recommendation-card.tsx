'use client';

import { Package } from 'lucide-react';

import type { RecommendationCardResultData } from '@banking-crm/types';

const PRODUCT_LABELS: Record<string, string> = {
  PERSONAL_LOAN: 'Personal Loan',
  HOME_LOAN: 'Home Loan',
  CREDIT_CARD: 'Credit Card',
};

interface RecommendationCardProps {
  data: RecommendationCardResultData;
}

export function RecommendationCard({ data }: RecommendationCardProps) {
  return (
    <div className="mt-2 rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <Package className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">
          Products matched to {data.totalCustomers} customers
        </span>
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-3">
        {data.productBreakdown.map((p) => (
          <div
            key={p.product}
            className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2"
          >
            <span className="text-sm font-medium">{PRODUCT_LABELS[p.product] ?? p.product}</span>
            <span className="text-xs font-mono bg-primary/10 text-primary rounded px-1.5 py-0.5">
              {p.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
