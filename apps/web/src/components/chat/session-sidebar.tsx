'use client';

import { formatDistanceToNow, isValid } from 'date-fns';

function safeDistance(dateStr: string) {
  const d = new Date(dateStr);
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : 'just now';
}
import { MessageSquarePlus, MessageSquare, Loader2, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';

interface SessionItem {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

interface SessionSidebarProps {
  sessions: SessionItem[];
  activeSessionId: string | null;
  isLoading: boolean;
  isCreating: boolean;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onArchiveSession: (id: string) => void;
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  isLoading,
  isCreating,
  onSelectSession,
  onNewSession,
  onArchiveSession,
}: SessionSidebarProps) {
  return (
    <div className="flex flex-col h-full border-r bg-muted/20">
      {/* Header */}
      <div className="px-3 py-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">CRM Agent</h2>
          <p className="text-xs text-muted-foreground mt-0.5">AI-powered analysis</p>
        </div>
        <button
          onClick={onNewSession}
          disabled={isCreating}
          title="New session"
          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No sessions yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start a new session above</p>
          </div>
        ) : (
          <ul className="space-y-0.5 px-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <div className="group relative">
                  <button
                    onClick={() => onSelectSession(s.id)}
                    className={cn(
                      'w-full text-left rounded-lg px-3 py-2.5 transition-colors pr-10',
                      activeSessionId === s.id
                        ? 'bg-background border shadow-sm'
                        : 'hover:bg-muted/60',
                    )}
                  >
                    <p className="text-sm font-medium text-foreground truncate pr-2">
                      {s.title ?? 'New session'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s._count.messages} messages · {safeDistance(s.updatedAt)}
                    </p>
                  </button>

                  {/* Archive button — sibling (not nested inside button) */}
                  <button
                    onClick={() => onArchiveSession(s.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 transition-all"
                    title="Archive session"
                    aria-label={`Archive session ${s.title ?? s.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
