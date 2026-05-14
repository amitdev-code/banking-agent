'use client';

import { useEffect, useRef } from 'react';
import { BotIcon, MessageSquare } from 'lucide-react';

import type { CrmMessage } from '@banking-crm/types';

import type { LiveToolCall } from '@/hooks/use-chat-socket';
import type { SessionAwaitingApprovalEvent } from '@banking-crm/types';

import { UserMessage } from './user-message';
import { AssistantMessage } from './assistant-message';
import { ToolExecutionCard } from './tool-execution-card';
import { ApprovalBanner } from './approval-banner';
import { ChatInput } from './chat-input';

interface ChatWindowProps {
  sessionId: string;
  messages: CrmMessage[];
  liveTools: LiveToolCall[];
  pendingApproval: SessionAwaitingApprovalEvent | null;
  isSending: boolean;
  isApproving: boolean;
  onSend: (content: string) => void;
  onApprove: () => void;
  onDismissApproval: () => void;
}

export function ChatWindow({
  sessionId,
  messages,
  liveTools,
  pendingApproval,
  isSending,
  isApproving,
  onSend,
  onApprove,
  onDismissApproval,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, liveTools.length, pendingApproval]);

  const isWorking = liveTools.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !isWorking && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BotIcon className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">CRM Agent</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
              Ask me to fetch customers, score them, recommend products, or generate WhatsApp
              messages.
            </p>
            <div className="mt-6 space-y-2 text-left w-full max-w-sm">
              {[
                'Fetch 100 customers with salary above 1 lakh',
                'Find premium segment customers in Mumbai',
                'Score these customers and recommend products',
                'Generate WhatsApp messages for qualified customers',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => onSend(example)}
                  className="w-full text-left rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === 'USER' ? (
            <UserMessage key={msg.id} content={msg.content} createdAt={msg.createdAt} />
          ) : (
            <AssistantMessage key={msg.id} message={msg} />
          ),
        )}

        {/* Live tool execution */}
        {isWorking && <ToolExecutionCard tools={liveTools} />}

        {/* Approval banner */}
        {pendingApproval && (
          <ApprovalBanner
            event={pendingApproval}
            onApprove={onApprove}
            onDismiss={onDismissApproval}
            isApproving={isApproving}
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={onSend}
        isSending={isSending || isWorking}
        disabled={!!pendingApproval}
        placeholder={
          pendingApproval
            ? 'Waiting for your approval above…'
            : isWorking
              ? 'Agent is working…'
              : 'Ask me about your customers…'
        }
      />
    </div>
  );
}
