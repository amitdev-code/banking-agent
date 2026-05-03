'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import type { ScoringRulesConfig } from '@banking-crm/types';

interface ConfigDiffViewProps {
  proposed: ScoringRulesConfig;
  changeLog: string[];
  onAccept: (config: ScoringRulesConfig) => void;
  onDismiss: () => void;
}

export function ConfigDiffView({ proposed, changeLog, onAccept, onDismiss }: ConfigDiffViewProps) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Proposed Changes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review AI-suggested changes before applying
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onAccept(proposed)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Accept
          </button>
          <button
            onClick={onDismiss}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Dismiss
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {changeLog.map((entry, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span className="text-foreground">{entry}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
