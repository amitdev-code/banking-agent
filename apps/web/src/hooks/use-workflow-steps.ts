'use client';

import { useEffect, useState } from 'react';

import type { StepStatus, WorkflowCompleteEvent, WorkflowErrorEvent, WorkflowStepEvent, WorkflowStepName } from '@banking-crm/types';
import { WORKFLOW_STEP_ORDER } from '@banking-crm/types';

import { getSocket } from '@/lib/socket-client';

export interface WorkflowStepState {
  status: StepStatus;
  detail?: string;
}

export type StepMap = Map<WorkflowStepName, WorkflowStepState>;

interface UseWorkflowStepsResult {
  steps: StepMap;
  isComplete: boolean;
  error: string | null;
  summary: WorkflowCompleteEvent | null;
  reset: () => void;
}

function buildInitialSteps(): StepMap {
  return new Map(WORKFLOW_STEP_ORDER.map((s) => [s, { status: 'pending' as StepStatus }]));
}

export function useWorkflowSteps(runId: string | null): UseWorkflowStepsResult {
  const [steps, setSteps] = useState<StepMap>(buildInitialSteps);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WorkflowCompleteEvent | null>(null);

  function reset(): void {
    setSteps(buildInitialSteps());
    setIsComplete(false);
    setError(null);
    setSummary(null);
  }

  useEffect(() => {
    if (!runId) return;

    reset();
    const socket = getSocket();
    socket.connect();
    socket.emit('subscribe', { runId });

    socket.on('step:update', (event: WorkflowStepEvent) => {
      setSteps((prev) => {
        const next = new Map(prev);
        next.set(event.step, { status: event.status, detail: event.detail });
        return next;
      });
    });

    socket.on('run:complete', (event: WorkflowCompleteEvent) => {
      setIsComplete(true);
      setSummary(event);
    });

    socket.on('run:error', (event: WorkflowErrorEvent) => {
      setError(event.error);
    });

    return () => {
      socket.off('step:update');
      socket.off('run:complete');
      socket.off('run:error');
    };
  }, [runId]);

  return { steps, isComplete, error, summary, reset };
}
