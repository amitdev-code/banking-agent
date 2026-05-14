'use client';

import { CheckCircle, Loader2, XCircle, Wrench } from 'lucide-react';

import type { LiveToolCall } from '@/hooks/use-chat-socket';

const TOOL_LABELS: Record<string, string> = {
  fetch_customers: 'Fetching customers',
  fetch_transactions: 'Loading transactions',
  analyze_customers: 'Analyzing & scoring',
  explain_scores: 'Generating explanations',
  recommend_products: 'Matching products',
  generate_messages: 'Generating messages',
};

interface ToolExecutionCardProps {
  tools: LiveToolCall[];
}

export function ToolExecutionCard({ tools }: ToolExecutionCardProps) {
  if (tools.length === 0) return null;

  return (
    <div className="flex justify-start mb-2">
      <div className="max-w-[85%] rounded-xl border bg-muted/40 px-4 py-3 space-y-2">
        {tools.map((t, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            {t.status === 'running' && (
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
            )}
            {t.status === 'done' && <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />}
            {t.status === 'error' && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
            <div className="min-w-0">
              <span className="font-medium text-foreground">{TOOL_LABELS[t.tool] ?? t.tool}</span>
              {t.detail && (
                <span className="text-muted-foreground ml-2 text-xs truncate">— {t.detail}</span>
              )}
              {t.durationMs !== undefined && t.status === 'done' && (
                <span className="text-muted-foreground ml-1 text-xs">
                  ({(t.durationMs / 1000).toFixed(1)}s)
                </span>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-1.5 pt-0.5 text-xs text-muted-foreground">
          <Wrench className="h-3 w-3" />
          <span>Agent working</span>
        </div>
      </div>
    </div>
  );
}
