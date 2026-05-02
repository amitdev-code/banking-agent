'use client';

import { Pause, Play, Workflow } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import type { WorkflowCompleteEvent } from '@banking-crm/types';

import type { StepMap } from '@/hooks/use-workflow-steps';
import { StepList } from '../workflow/step-list';

interface WorkflowPanelProps {
  runId: string | null;
  steps: StepMap;
  isComplete: boolean;
  error: string | null;
  summary: WorkflowCompleteEvent | null;
  onPause: () => void;
  onResume: () => void;
  isPaused: boolean;
}

export function WorkflowPanel({
  runId,
  steps,
  isComplete,
  error,
  summary,
  onPause,
  onResume,
  isPaused,
}: WorkflowPanelProps) {
  const isRunning = runId && !isComplete && !error;
  const anyRunning = [...steps.values()].some((s) => s.status === 'running');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold">Workflow Progress</h2>
          {runId && (
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{runId.slice(0, 16)}…</p>
          )}
        </div>

        {isRunning && (
          <button
            onClick={isPaused ? onResume : onPause}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            {isPaused ? (
              <><Play className="h-3.5 w-3.5" /> Resume</>
            ) : (
              <><Pause className="h-3.5 w-3.5" /> Pause</>
            )}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <AnimatePresence mode="wait">
          {!runId ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-3 text-center px-8 py-16"
            >
              <Workflow className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Run an analysis to see the AI workflow in action
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="steps"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <StepList steps={steps} />
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-sm text-destructive font-medium">Analysis failed</p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
          </div>
        )}

        {isComplete && summary && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 space-y-2"
          >
            <p className="text-sm font-semibold text-emerald-800">Analysis Complete</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-700">{summary.highValueCount}</p>
                <p className="text-xs text-emerald-600">High-Value</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-700">{summary.customerCount}</p>
                <p className="text-xs text-emerald-600">Total Scored</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-700">
                  {Math.round(summary.avgScore)}
                </p>
                <p className="text-xs text-emerald-600">Avg Score</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
