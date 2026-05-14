'use client';

import { formatDistanceToNow, isValid } from 'date-fns';

interface UserMessageProps {
  content: string;
  createdAt: string;
}

export function UserMessage({ content, createdAt }: UserMessageProps) {
  return (
    <div className="flex justify-end mb-3">
      <div className="max-w-[80%]">
        <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm leading-relaxed">
          {content}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 text-right">
          {(() => {
            const d = new Date(createdAt);
            return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : 'just now';
          })()}
        </p>
      </div>
    </div>
  );
}
