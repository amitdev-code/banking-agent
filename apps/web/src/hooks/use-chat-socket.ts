'use client';

import { useEffect, useRef, useState } from 'react';

import type {
  MessageCompleteEvent,
  SessionAwaitingApprovalEvent,
  SessionErrorEvent,
  ToolDoneEvent,
  ToolStartEvent,
} from '@banking-crm/types';

import { getChatSocket } from '@/lib/socket-client';

export type LiveToolCall = {
  tool: string;
  status: 'running' | 'done' | 'error';
  detail?: string;
  durationMs?: number;
  timestamp: number;
};

export interface ChatSocketHandlers {
  onMessageComplete: (event: MessageCompleteEvent) => void;
}

export function useChatSocket(sessionId: string | null, handlers: ChatSocketHandlers) {
  const [liveTools, setLiveTools] = useState<LiveToolCall[]>([]);
  const [pendingApproval, setPendingApproval] = useState<SessionAwaitingApprovalEvent | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!sessionId) return;

    setLiveTools([]);
    setPendingApproval(null);
    setSocketError(null);

    const socket = getChatSocket();

    const subscribe = () => {
      socket.emit('subscribe', { sessionId });
    };

    const onToolStart = (event: ToolStartEvent) => {
      setLiveTools((prev) => [
        ...prev.filter((t) => t.tool !== event.tool || t.status === 'done'),
        { tool: event.tool, status: 'running', timestamp: event.timestamp },
      ]);
    };

    const onToolDone = (event: ToolDoneEvent) => {
      setLiveTools((prev) =>
        prev.map((t) =>
          t.tool === event.tool && t.status === 'running'
            ? {
                ...t,
                status: 'done' as const,
                detail: event.resultSummary,
                durationMs: event.durationMs,
              }
            : t,
        ),
      );
    };

    const onToolError = (event: { tool: string; error: string; timestamp: number }) => {
      setLiveTools((prev) =>
        prev.map((t) =>
          t.tool === event.tool && t.status === 'running'
            ? { ...t, status: 'error' as const, detail: event.error }
            : t,
        ),
      );
    };

    const onMessageComplete = (event: MessageCompleteEvent) => {
      setLiveTools([]);
      handlersRef.current.onMessageComplete(event);
    };

    const onAwaitingApproval = (event: SessionAwaitingApprovalEvent) => {
      setLiveTools([]);
      setPendingApproval(event);
    };

    const onSessionError = (event: SessionErrorEvent) => {
      setLiveTools([]);
      setSocketError(event.error);
    };

    socket.on('connect', subscribe);
    socket.on('tool:start', onToolStart);
    socket.on('tool:done', onToolDone);
    socket.on('tool:error', onToolError);
    socket.on('message:complete', onMessageComplete);
    socket.on('session:awaiting-approval', onAwaitingApproval);
    socket.on('session:error', onSessionError);

    // Connect and subscribe (if already connected, 'connect' won't re-fire so emit directly)
    if (socket.connected) {
      subscribe();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', subscribe);
      socket.off('tool:start', onToolStart);
      socket.off('tool:done', onToolDone);
      socket.off('tool:error', onToolError);
      socket.off('message:complete', onMessageComplete);
      socket.off('session:awaiting-approval', onAwaitingApproval);
      socket.off('session:error', onSessionError);
    };
  }, [sessionId]);

  return { liveTools, pendingApproval, setPendingApproval, socketError };
}
