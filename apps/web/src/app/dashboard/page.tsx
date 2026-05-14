'use client';

import { useCallback, useMemo, useState } from 'react';

import { SessionSidebar } from '@/components/chat/session-sidebar';
import { ChatWindow } from '@/components/chat/chat-window';
import { FetchedCustomersSidebar } from '@/components/chat/fetched-customers-sidebar';
import { useSessionList } from '@/hooks/use-session-list';
import { useSessionMessages } from '@/hooks/use-session-messages';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { useSessionCustomers } from '@/hooks/use-session-customers';
import type {
  MessageCompleteEvent,
  RecommendationCardResultData,
  ScoreCardResultData,
} from '@banking-crm/types';

export default function DashboardPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const {
    sessions,
    isLoading: sessionsLoading,
    isCreating,
    createSession,
    archiveSession,
    refreshSessions,
  } = useSessionList();

  const { messages, isSending, isApproving, sendMessage, approveMessages, onMessageComplete } =
    useSessionMessages(activeSessionId);
  const {
    customers,
    totalCount,
    isLoading: customersLoading,
    refresh: refreshCustomers,
  } = useSessionCustomers(activeSessionId);

  const onMessageCompleteCallback = useCallback(
    (event: MessageCompleteEvent) => {
      onMessageComplete(event);
      void refreshSessions();
      void refreshCustomers();
    },
    [onMessageComplete, refreshSessions, refreshCustomers],
  );

  const { liveTools, pendingApproval, setPendingApproval } = useChatSocket(activeSessionId, {
    onMessageComplete: onMessageCompleteCallback,
  });

  const latestScoreData = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg?.role === 'ASSISTANT' && msg.resultType === 'score_card' && msg.resultData) {
        return msg.resultData as ScoreCardResultData;
      }
    }
    return null;
  }, [messages]);

  const latestRecommendationData = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg?.role === 'ASSISTANT' && msg.resultType === 'recommendation_card' && msg.resultData) {
        return msg.resultData as RecommendationCardResultData;
      }
    }
    return null;
  }, [messages]);

  async function handleNewSession() {
    const result = await createSession(undefined);
    setActiveSessionId(result.sessionId);
  }

  function handleSend(content: string) {
    if (!activeSessionId) {
      // Auto-create a session on first message
      void (async () => {
        const result = await createSession(undefined);
        setActiveSessionId(result.sessionId);
        // Small delay to ensure session state is set before sending
        setTimeout(() => sendMessage(content), 100);
      })();
      return;
    }
    sendMessage(content);
  }

  function handleApprove() {
    approveMessages();
    setPendingApproval(null);
  }

  function handleArchive(id: string) {
    archiveSession(id);
    if (activeSessionId === id) setActiveSessionId(null);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Session Sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col overflow-hidden">
        <SessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          isLoading={sessionsLoading}
          isCreating={isCreating}
          onSelectSession={setActiveSessionId}
          onNewSession={() => void handleNewSession()}
          onArchiveSession={handleArchive}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeSessionId ? (
          <ChatWindow
            sessionId={activeSessionId}
            messages={messages}
            liveTools={liveTools}
            pendingApproval={pendingApproval}
            isSending={isSending}
            isApproving={isApproving}
            onSend={handleSend}
            onApprove={handleApprove}
            onDismissApproval={() => setPendingApproval(null)}
          />
        ) : (
          <NoSessionState onNewSession={() => void handleNewSession()} isCreating={isCreating} />
        )}
      </div>

      {/* Fetched Data Sidebar */}
      <FetchedCustomersSidebar
        customers={customers}
        totalCount={totalCount}
        isLoading={!!activeSessionId && customersLoading}
        latestScoreData={latestScoreData}
        latestRecommendationData={latestRecommendationData}
        onTriggerWhatsapp={(customerId, fullName) =>
          handleSend(
            `Generate WhatsApp message only for customer ${fullName} (${customerId}). Do not generate for other customers.`,
          )
        }
      />
    </div>
  );
}

function NoSessionState({
  onNewSession,
  isCreating,
}: {
  onNewSession: () => void;
  isCreating: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-foreground">Banking CRM Agent</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
        Select a session from the sidebar or start a new one. The agent will dynamically fetch
        customers, score them, and recommend products based on your natural language requests.
      </p>
      <button
        onClick={onNewSession}
        disabled={isCreating}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {isCreating ? 'Creating…' : '+ New Session'}
      </button>

      <div className="mt-10 grid grid-cols-2 gap-3 max-w-lg text-left">
        {[
          {
            title: 'Smart Filtering',
            desc: 'Ask in plain English — "fetch customers with salary above 1 lakh in Mumbai"',
          },
          {
            title: 'Session Memory',
            desc: 'The agent remembers what was fetched — ask follow-up questions without re-querying',
          },
          {
            title: 'Dynamic Tools',
            desc: 'LLM decides which tools to call — scoring, recommendations, or messages as needed',
          },
          {
            title: 'Approval Gate',
            desc: 'WhatsApp messages pause for your review before generating',
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border bg-card/50 p-4">
            <p className="text-sm font-semibold text-foreground">{f.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
