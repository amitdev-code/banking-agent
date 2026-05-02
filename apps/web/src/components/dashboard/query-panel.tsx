'use client';

import { useState } from 'react';
import { Play, Sparkles, Terminal } from 'lucide-react';
import type { AgentMode } from '@banking-crm/types';

import { useCrmRun } from '@/hooks/use-crm-run';
import { cn } from '@/lib/utils';

interface QueryPanelProps {
  onRunStarted: (runId: string) => void;
}

export function QueryPanel({ onRunStarted }: QueryPanelProps) {
  const [mode, setMode] = useState<AgentMode>('agent');
  const [query, setQuery] = useState('');
  const { startRun, isStarting, startError } = useCrmRun();

  function handleRun(): void {
    startRun(
      { mode, naturalLanguageQuery: mode === 'custom' ? query : undefined },
      { onSuccess: (data) => onRunStarted(data.runId) },
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b">
        <h2 className="text-sm font-semibold text-foreground">CRM Analysis</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Find high-value customers for loan conversion
        </p>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Mode Toggle */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Mode</p>
          <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-muted p-1">
            <button
              onClick={() => setMode('agent')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all',
                mode === 'agent'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Agent
            </button>
            <button
              onClick={() => setMode('custom')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all',
                mode === 'custom'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Terminal className="h-3.5 w-3.5" />
              Custom
            </button>
          </div>
        </div>

        {/* Custom Mode Query Input */}
        {mode === 'custom' && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Natural Language Query</p>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Find high salary customers in Mumbai who haven't taken a home loan"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px]"
            />
          </div>
        )}

        {mode === 'agent' && (
          <div className="rounded-md bg-muted/50 px-3 py-3 space-y-1">
            <p className="text-xs font-medium text-foreground">Agent Mode</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Automatically finds high-value customers likely to convert for personal loans
              using optimized scoring rules.
            </p>
          </div>
        )}

        {startError && (
          <p className="text-xs text-destructive">
            {startError instanceof Error ? startError.message : 'Failed to start analysis'}
          </p>
        )}
      </div>

      <div className="p-4 border-t">
        <button
          onClick={handleRun}
          disabled={isStarting || (mode === 'custom' && !query.trim())}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="h-4 w-4" />
          {isStarting ? 'Starting...' : 'Run Analysis'}
        </button>
      </div>
    </div>
  );
}
