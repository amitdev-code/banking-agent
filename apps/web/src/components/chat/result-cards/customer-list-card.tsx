'use client';

import { Users, MapPin, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import type { CustomerListResultData } from '@banking-crm/types';

import { formatCurrency } from '@/lib/formatters';

interface CustomerListCardProps {
  data: CustomerListResultData;
}

export function CustomerListCard({ data }: CustomerListCardProps) {
  return (
    <div className="mt-2 rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{data.totalCount} customers found</span>
        {data.appliedFilters && Object.keys(data.appliedFilters).length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">Filtered</span>
        )}
      </div>

      {data.customers.length > 0 && (
        <div className="divide-y max-h-64 overflow-y-auto">
          {data.customers.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20"
            >
              <div className="min-w-0">
                <Link
                  href={`/customer/${c.id}`}
                  className="text-sm font-medium hover:underline truncate block"
                >
                  {c.fullName}
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {c.city}
                  </span>
                  <span className="text-xs text-muted-foreground">Age {c.age}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono font-medium">
                  {formatCurrency(c.avgMonthlyBalance)}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{c.segment}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.totalCount > data.customers.length && (
        <div className="px-4 py-2 text-center border-t">
          <p className="text-xs text-muted-foreground">
            Showing {data.customers.length} of {data.totalCount} customers
          </p>
        </div>
      )}
    </div>
  );
}
