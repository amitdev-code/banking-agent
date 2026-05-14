'use client';

import { MessageSquare, Check, X } from 'lucide-react';

import type { SessionAwaitingApprovalEvent } from '@banking-crm/types';

interface ApprovalBannerProps {
  event: SessionAwaitingApprovalEvent;
  onApprove: () => void;
  onDismiss: () => void;
  isApproving: boolean;
}

export function ApprovalBanner({ event, onApprove, onDismiss, isApproving }: ApprovalBannerProps) {
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Ready to generate WhatsApp messages
          </p>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Generate personalized messages in English and Hindi for{' '}
          <strong>{event.qualifiedCount}</strong> qualified customers?
        </p>
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            disabled={isApproving}
            className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            {isApproving ? 'Generating...' : 'Yes, generate'}
          </button>
          <button
            onClick={onDismiss}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
