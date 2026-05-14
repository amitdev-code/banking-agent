'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import type { CrmMessage, CrmSession, MessageCompleteEvent } from '@banking-crm/types';

import { apiClient } from '@/lib/api-client';

interface SessionDetail extends CrmSession {
  messages: CrmMessage[];
}

let _optimisticId = 0;
function optimisticId() {
  return `optimistic-${++_optimisticId}`;
}

export function useSessionMessages(sessionId: string | null) {
  const queryClient = useQueryClient();
  const [liveMessages, setLiveMessages] = useState<CrmMessage[]>([]);
  // Track optimistic message content so we can deduplicate once the real one arrives
  const pendingContents = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ['crm-session', sessionId],
    queryFn: () => apiClient.get<SessionDetail>(`/crm-session/${sessionId}`),
    enabled: !!sessionId,
    staleTime: Infinity,
  });

  // Reset when session changes
  useEffect(() => {
    setLiveMessages([]);
    pendingContents.current.clear();
  }, [sessionId]);

  const appendMessage = useCallback((msg: CrmMessage) => {
    setLiveMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const onMessageComplete = useCallback(
    (event: MessageCompleteEvent) => {
      const newMsg: CrmMessage = {
        id: event.messageId,
        sessionId: event.sessionId,
        role: 'ASSISTANT',
        content: event.content,
        toolCalls:
          event.toolCalls.length > 0
            ? event.toolCalls.map((t) => ({
                toolName: t.toolName,
                input: t.input,
                resultSummary: t.resultSummary,
                durationMs: t.durationMs,
              }))
            : null,
        resultType: event.resultType as CrmMessage['resultType'],
        resultData: event.resultData,
        createdAt: new Date().toISOString(),
      };
      appendMessage(newMsg);
      void queryClient.invalidateQueries({ queryKey: ['crm-sessions'] });
    },
    [appendMessage, queryClient],
  );

  const sendMessageMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiClient.post<{ messageId: string; sessionId: string }>(`/crm-session/${id}/message`, {
        content,
      }),
    onMutate: ({ content }) => {
      // Show user message immediately — replace with real ID in onSuccess
      const tempId = optimisticId();
      pendingContents.current.add(content);
      const optimistic: CrmMessage = {
        id: tempId,
        sessionId: sessionId ?? '',
        role: 'USER',
        content,
        toolCalls: null,
        resultType: null,
        resultData: null,
        createdAt: new Date().toISOString(),
      };
      setLiveMessages((prev) => [...prev, optimistic]);
      return { tempId, content };
    },
    onSuccess: (data, _variables, context) => {
      // Replace the optimistic entry with the real DB id
      const { tempId } = context as { tempId: string; content: string };
      pendingContents.current.delete(_variables.content);
      setLiveMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: data.messageId } : m)),
      );
    },
    onError: (_err, _variables, context) => {
      const { tempId } = context as { tempId: string };
      setLiveMessages((prev) => prev.filter((m) => m.id !== tempId));
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ status: string }>(`/crm-session/${id}/approve`, {}),
  });

  const persistedMessages = query.data?.messages ?? [];
  // Merge: persisted messages first, then any live messages not yet persisted
  const allMessages = [
    ...persistedMessages,
    ...liveMessages.filter(
      (lm) => !lm.id.startsWith('optimistic-') && !persistedMessages.some((pm) => pm.id === lm.id),
    ),
    // Always show optimistic (unsaved) messages
    ...liveMessages.filter((lm) => lm.id.startsWith('optimistic-')),
  ];

  return {
    session: query.data,
    messages: allMessages,
    isLoading: query.isLoading,
    sendMessage: (content: string) => {
      if (!sessionId) return;
      sendMessageMutation.mutate({ id: sessionId, content });
    },
    isSending: sendMessageMutation.isPending,
    approveMessages: () => {
      if (!sessionId) return;
      approveMutation.mutate(sessionId);
    },
    isApproving: approveMutation.isPending,
    onMessageComplete,
  };
}
