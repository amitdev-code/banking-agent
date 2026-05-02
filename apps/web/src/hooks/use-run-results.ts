'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export function useRunResults(runId: string | null, isComplete: boolean) {
  return useQuery({
    queryKey: ['run-results', runId],
    queryFn: () => apiClient.get<{ scoredResults: unknown[] }>(`/crm/history/${runId ?? ''}`),
    enabled: !!runId && isComplete,
    staleTime: 0,
  });
}
