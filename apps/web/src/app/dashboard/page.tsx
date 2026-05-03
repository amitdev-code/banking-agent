'use client';

import { useState } from 'react';

import { QueryPanel } from '@/components/dashboard/query-panel';
import { WorkflowPanel } from '@/components/dashboard/workflow-panel';
import { ResultsPanel, type EnrichedCustomer } from '@/components/dashboard/results-panel';
import { useWorkflowSteps } from '@/hooks/use-workflow-steps';
import { useRunResults } from '@/hooks/use-run-results';
import { apiClient } from '@/lib/api-client';

export default function DashboardPage() {
  const [runId, setRunId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const { steps, isComplete, error, summary } = useWorkflowSteps(runId);
  const { data: runData, isLoading: isLoadingResults } = useRunResults(runId, isComplete);
  const customers = (runData?.scoredResults ?? []) as EnrichedCustomer[];

  function handleRunStarted(id: string) {
    setRunId(id);
    setIsPaused(false);
  }

  async function handlePause() {
    if (!runId) return;
    await apiClient.post(`/crm/run/${runId}/pause`, {});
    setIsPaused(true);
  }

  async function handleResume() {
    if (!runId) return;
    await apiClient.post(`/crm/run/${runId}/resume`, {});
    setIsPaused(false);
  }

  return (
    <div className="flex h-full">
      {/* Left panel — 320px */}
      <div className="w-80 flex-shrink-0 border-r flex flex-col overflow-hidden">
        <QueryPanel onRunStarted={handleRunStarted} />
      </div>

      {/* Middle panel — flex */}
      <div className="flex-1 border-r flex flex-col overflow-hidden">
        <WorkflowPanel
          runId={runId}
          steps={steps}
          isComplete={isComplete}
          error={error}
          summary={summary}
          isPaused={isPaused}
          onPause={() => { void handlePause(); }}
          onResume={() => { void handleResume(); }}
        />
      </div>

      {/* Right panel — 420px */}
      <div className="w-[420px] flex-shrink-0 flex flex-col overflow-hidden">
        <ResultsPanel
          customers={customers}
          isLoading={isLoadingResults}
          summary={summary}
        />
      </div>
    </div>
  );
}
