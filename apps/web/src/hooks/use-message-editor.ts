'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export function useMessageEditor(resultId: string, initialMessage: string) {
  const [draft, setDraft] = useState(initialMessage);
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (editedMessage: string) =>
      apiClient.patch<{ id: string }>(`/crm/results/${resultId}/message`, { editedMessage }),
    onSuccess: () => {
      setIsSaved(true);
      void queryClient.invalidateQueries({ queryKey: ['run-results'] });
    },
  });

  return {
    draft,
    setDraft,
    isSaved,
    isSaving: mutation.isPending,
    saveError: mutation.error,
    save: () => mutation.mutate(draft),
  };
}
