'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import type { CrmRunRequest } from '@banking-crm/types';

import { apiClient } from '@/lib/api-client';

export function useCrmRun() {
  const [runId, setRunId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (request: CrmRunRequest) =>
      apiClient.post<{ runId: string }>('/crm/run', request),
    onSuccess: (data) => setRunId(data.runId),
  });

  return {
    runId,
    startRun: mutation.mutate,
    isStarting: mutation.isPending,
    startError: mutation.error,
    reset: () => setRunId(null),
  };
}
