'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { ScoreBadge } from '@banking-crm/ui';

import type { ScoredCustomer } from '@banking-crm/types';
import { MessageCard } from '../messages/message-card';
import { formatCurrency } from '@/lib/formatters';

interface CustomerCardProps {
  customer: ScoredCustomer & {
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
}

export function CustomerCard({ customer }: CustomerCardProps) {
  const [showMessage, setShowMessage] = useState(false);

  const scorePercent = Math.min(100, Math.round((customer.totalScore / 110) * 100));

  return (
    <div className="rounded-lg border bg-card text-card-foreground p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/customer/${customer.customerId}`}
            className="text-sm font-semibold hover:underline truncate block"
          >
            {customer.fullName}
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">
            {customer.city} · Age {customer.age} · {formatCurrency(customer.avgMonthlyBalance)}/mo
          </p>
        </div>
        <ScoreBadge label={customer.readinessLabel} />
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Score</span>
          <span className="font-mono font-semibold">{customer.totalScore}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${scorePercent}%` }}
          />
        </div>
      </div>

      {customer.recommendedProducts && customer.recommendedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {customer.recommendedProducts.map((p) => (
            <span
              key={p.product}
              className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
            >
              {p.product.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {(customer.messageEn || customer.messageHi) && (
        <div>
          <button
            onClick={() => setShowMessage((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {showMessage ? 'Hide message' : 'View WhatsApp message'}
            {showMessage ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showMessage && customer.resultId && (
            <div className="mt-2">
              <MessageCard
                resultId={customer.resultId}
                phone={customer.phone}
                messageEn={customer.messageEn ?? ''}
                messageHi={customer.messageHi ?? ''}
                isEdited={customer.isMessageEdited ?? false}
                editedMessage={customer.editedMessage ?? null}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
