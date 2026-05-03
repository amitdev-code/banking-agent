'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import type { ScoredCustomer, ReadinessLabel } from '@banking-crm/types';
import { ScoreBadge } from '@banking-crm/ui';
import { formatCurrency } from '@/lib/formatters';
import { MessageCard } from '@/components/messages/message-card';

export type CompactCustomer = ScoredCustomer & {
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
};

interface CompactCustomerRowProps {
  customer: CompactCustomer;
}

function ScoreRing({ score }: { score: number }) {
  const pct = Math.min(100, Math.round((score / 110) * 100));
  const r = 16;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;

  const color =
    score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  const textColor =
    score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/30"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute text-[10px] font-bold ${textColor}`}>
        {Math.round(score)}
      </span>
    </div>
  );
}

function ProductPill({ label }: { label: string }) {
  const short = label
    .replace('_LOAN', '')
    .replace('CREDIT_', '')
    .replace('PERSONAL', 'PL')
    .replace('HOME', 'HL')
    .replace('CARD', 'CC');
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
      {short}
    </span>
  );
}

const BREAKDOWN_KEYS: Array<{ key: keyof ScoredCustomer['breakdown']; label: string; max: number }> = [
  { key: 'salary', label: 'Salary', max: 30 },
  { key: 'balance', label: 'Balance', max: 25 },
  { key: 'spending', label: 'Spending', max: 20 },
  { key: 'age', label: 'Age', max: 15 },
  { key: 'activity', label: 'Activity', max: 10 },
];

function MiniScoreBreakdown({ breakdown }: { breakdown: ScoredCustomer['breakdown'] }) {
  return (
    <div className="space-y-1.5">
      {BREAKDOWN_KEYS.map(({ key, label, max }) => {
        const val = breakdown[key] ?? 0;
        const pct = Math.min(100, Math.round((val / max) * 100));
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-14 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground w-6 text-right">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

export function CompactCustomerRow({ customer }: CompactCustomerRowProps) {
  const [expanded, setExpanded] = useState(false);

  const products = customer.recommendedProducts ?? [];
  const visibleProducts = products.slice(0, 2);
  const extraProducts = products.length - visibleProducts.length;

  const hasMessage = customer.resultId && customer.messageEn;

  return (
    <div className="border-b last:border-0">
      {/* Collapsed row */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <ScoreRing score={customer.totalScore} />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">{customer.fullName}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {customer.city} · {customer.age}y · {formatCurrency(customer.avgMonthlyBalance)}/mo
          </p>
        </div>

        {/* Products */}
        {visibleProducts.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {visibleProducts.map((p) => (
              <ProductPill key={p.product} label={p.product} />
            ))}
            {extraProducts > 0 && (
              <span className="text-[10px] text-muted-foreground">+{extraProducts}</span>
            )}
          </div>
        )}

        {/* Persona badge */}
        {customer.persona && (
          <span className="hidden md:inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300 shrink-0">
            {customer.persona}
          </span>
        )}

        {/* Readiness badge */}
        <ScoreBadge label={customer.readinessLabel as ReadinessLabel} className="shrink-0 text-[10px]" />

        {/* AI adjustment indicator */}
        {customer.llmAdjustment != null && customer.llmAdjustment !== 0 && (
          <span
            className={`text-[10px] font-semibold shrink-0 ${
              (customer.llmAdjustment ?? 0) > 0 ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {(customer.llmAdjustment ?? 0) > 0 ? '+' : ''}
            {customer.llmAdjustment}
          </span>
        )}

        {/* Chevron */}
        <span className="text-muted-foreground shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 py-3 bg-muted/30 border-t space-y-3">
          {/* Score breakdown */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Score Breakdown
            </p>
            <MiniScoreBreakdown breakdown={customer.breakdown} />
          </div>

          {/* AI explanation */}
          {customer.scoreExplanation && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                AI Insight
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {customer.scoreExplanation}
              </p>
              {customer.llmAdjustReason && (
                <p className="text-[10px] text-muted-foreground mt-0.5 italic">
                  Adjustment: {customer.llmAdjustReason}
                </p>
              )}
            </div>
          )}

          {/* WhatsApp message */}
          {hasMessage && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Outreach Message
              </p>
              <MessageCard
                resultId={customer.resultId}
                phone={customer.phone}
                messageEn={customer.messageEn}
                messageHi={customer.messageHi}
                isEdited={customer.isMessageEdited}
                editedMessage={customer.editedMessage}
              />
            </div>
          )}

          {/* Disqualified reason */}
          {!customer.qualifies && customer.disqualifiedReason && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-3 py-2">
              <p className="text-[10px] font-semibold text-red-700 dark:text-red-400 mb-0.5">
                Disqualified
              </p>
              <p className="text-xs text-red-600 dark:text-red-300">{customer.disqualifiedReason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
