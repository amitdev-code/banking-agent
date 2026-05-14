'use client';

import { useState } from 'react';
import { MessageSquare, Copy, Check } from 'lucide-react';

import type { MessageCardResultData } from '@banking-crm/types';

interface MessageResultCardProps {
  data: MessageCardResultData;
}

export function MessageResultCard({ data }: MessageResultCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyMessage(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="mt-2 rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">
          {data.messages.length} WhatsApp messages generated
        </span>
      </div>

      <div className="divide-y max-h-80 overflow-y-auto">
        {data.messages.map((m) => (
          <div key={m.customerId} className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium">{m.fullName}</p>
                <p className="text-xs text-muted-foreground">{m.phone}</p>
              </div>
              <button
                onClick={() => setExpandedId(expandedId === m.customerId ? null : m.customerId)}
                className="text-xs text-primary hover:underline"
              >
                {expandedId === m.customerId ? 'Hide' : 'Preview'}
              </button>
            </div>

            {expandedId === m.customerId && (
              <div className="space-y-2 mt-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">English</span>
                    <button
                      onClick={() => void copyMessage(m.messageEn, `${m.customerId}-en`)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {copiedId === `${m.customerId}-en` ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {m.messageEn}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Hindi</span>
                    <button
                      onClick={() => void copyMessage(m.messageHi, `${m.customerId}-hi`)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {copiedId === `${m.customerId}-hi` ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {m.messageHi}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
