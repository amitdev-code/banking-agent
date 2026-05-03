'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, ChevronDown, ChevronUp, BrainCircuit, TrendingUp, TrendingDown } from 'lucide-react';
import { ScoreBadge } from '@banking-crm/ui';

import type { CustomerPersona, ScoredCustomer } from '@banking-crm/types';
import { MessageCard } from '../messages/message-card';
import { formatCurrency } from '@/lib/formatters';

const PERSONA_COLORS: Record<CustomerPersona, string> = {
  Saver:           'bg-blue-50 text-blue-700 border-blue-200',
  Spender:         'bg-orange-50 text-orange-700 border-orange-200',
  Investor:        'bg-purple-50 text-purple-700 border-purple-200',
  IrregularIncome: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Balanced:        'bg-green-50 text-green-700 border-green-200',
};

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
  const [showExplanation, setShowExplanation] = useState(false);

  const scorePercent = Math.min(100, Math.round((customer.totalScore / 110) * 100));
  const hasAiAdjustment = customer.llmAdjustment !== undefined && customer.llmAdjustment !== 0;

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
        <div className="flex items-center gap-2 shrink-0">
          {customer.persona && (
            <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium ${PERSONA_COLORS[customer.persona]}`}>
              {customer.persona}
            </span>
          )}
          <ScoreBadge label={customer.readinessLabel} />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Score</span>
          <div className="flex items-center gap-1.5">
            {hasAiAdjustment && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${(customer.llmAdjustment ?? 0) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {(customer.llmAdjustment ?? 0) > 0
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />}
                {(customer.llmAdjustment ?? 0) > 0 ? '+' : ''}{customer.llmAdjustment} AI
              </span>
            )}
            <span className="font-mono font-semibold">{customer.totalScore}</span>
          </div>
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

      {/* AI Score Explanation */}
      {customer.scoreExplanation && (
        <div>
          <button
            onClick={() => setShowExplanation((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            {showExplanation ? 'Hide AI insight' : 'View AI insight'}
            {showExplanation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showExplanation && (
            <p className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
              {customer.scoreExplanation}
            </p>
          )}
        </div>
      )}

      {/* WhatsApp Message */}
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
