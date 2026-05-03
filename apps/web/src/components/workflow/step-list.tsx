'use client';

import { WorkflowStepIndicator } from '@banking-crm/ui';
import type { WorkflowStepName } from '@banking-crm/types';
import { WORKFLOW_STEP_ORDER } from '@banking-crm/types';

import type { StepMap } from '@/hooks/use-workflow-steps';

interface StepListProps {
  steps: StepMap;
}

export function StepList({ steps }: StepListProps) {
  return (
    <div className="px-2 py-1">
      {WORKFLOW_STEP_ORDER.map((step, idx) => {
        const state = steps.get(step as WorkflowStepName);
        return (
          <WorkflowStepIndicator
            key={step}
            step={step as WorkflowStepName}
            status={state?.status ?? 'pending'}
            detail={state?.detail}
            progress={state?.progress}
            isLast={idx === WORKFLOW_STEP_ORDER.length - 1}
          />
        );
      })}
    </div>
  );
}
