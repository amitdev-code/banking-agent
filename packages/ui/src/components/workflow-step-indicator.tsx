'use client';

import { AlertCircle, CheckCircle2, Circle, Loader2 } from 'lucide-react';

import type { StepStatus, WorkflowStepName, WorkflowStepProgress } from '@banking-crm/types';
import { WORKFLOW_STEP_LABELS } from '@banking-crm/types';

import { cn } from '../lib/utils';

interface WorkflowStepIndicatorProps {
  step: WorkflowStepName;
  status: StepStatus;
  detail?: string;
  progress?: WorkflowStepProgress;
  isLast?: boolean;
}

const STATUS_ICONS: Record<StepStatus, React.ReactNode> = {
  pending: <Circle className="h-5 w-5 text-muted-foreground/40" />,
  running: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
  done: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
};

const STATUS_LABEL_STYLES: Record<StepStatus, string> = {
  pending: 'text-muted-foreground/60',
  running: 'text-blue-600 font-medium',
  done: 'text-foreground',
  error: 'text-red-600',
};

export function WorkflowStepIndicator({
  step,
  status,
  detail,
  progress,
  isLast = false,
}: WorkflowStepIndicatorProps) {
  const pct = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : null;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background border">
          {STATUS_ICONS[status]}
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-px flex-1 mt-1',
              status === 'done' ? 'bg-emerald-200' : 'bg-border',
            )}
            style={{ minHeight: '20px' }}
          />
        )}
      </div>
      <div className="pb-5 pt-0.5 flex-1 min-w-0">
        <p className={cn('text-sm', STATUS_LABEL_STYLES[status])}>
          {WORKFLOW_STEP_LABELS[step]}
        </p>
        {detail && status !== 'pending' && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{detail}</p>
        )}
        {pct !== null && status === 'running' && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{pct}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
