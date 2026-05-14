'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CrmSession } from '@banking-crm/types';

import { apiClient } from '@/lib/api-client';

interface SessionListResponse {
  sessions: (Pick<CrmSession, 'id' | 'title' | 'status' | 'createdAt' | 'updatedAt'> & {
    _count: { messages: number };
  })[];
  total: number;
  page: number;
  limit: number;
}

export function useSessionList() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['crm-sessions'],
    queryFn: () => apiClient.get<SessionListResponse>('/crm-session'),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (title?: string) =>
      apiClient.post<{ sessionId: string; title: string | null }>('/crm-session', { title }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm-sessions'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.delete<{ success: boolean }>(`/crm-session/${sessionId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm-sessions'] });
    },
  });

  return {
    sessions: query.data?.sessions ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    createSession: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    archiveSession: archiveMutation.mutate,
    refreshSessions: () => queryClient.invalidateQueries({ queryKey: ['crm-sessions'] }),
  };
}
