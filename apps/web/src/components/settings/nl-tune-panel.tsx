'use client';

import { useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import type { ScoringRulesConfig } from '@banking-crm/types';

import { apiClient } from '@/lib/api-client';

interface NlTunePanelProps {
  onProposed: (config: ScoringRulesConfig, changeLog: string[]) => void;
}

export function NlTunePanel({ onProposed }: NlTunePanelProps) {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTune() {
    if (!instruction.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.post<{ proposed: ScoringRulesConfig; changeLog: string[] }>(
        '/admin/scoring-config/tune',
        { instruction },
      );
      onProposed(result.proposed, result.changeLog);
      setInstruction('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to tune config');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">NL Config Tuning</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Describe changes in plain English — AI will update the config for you.
      </p>
      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder='e.g. "Be more lenient for NRI customers and reduce the personal loan penalty to 5"'
        rows={3}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        onClick={handleTune}
        disabled={isLoading || !instruction.trim()}
        className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {isLoading ? 'Thinking...' : 'Apply Changes'}
      </button>
    </div>
  );
}

interface AiSuggestPanelProps {
  onProposed: (config: ScoringRulesConfig, explanation: string[]) => void;
}

export function AiSuggestPanel({ onProposed }: AiSuggestPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSuggest() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.post<{ proposed: ScoringRulesConfig; explanation: string[] }>(
        '/admin/scoring-config/suggest',
      );
      onProposed(result.proposed, result.explanation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate suggestion');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">AI Auto-Tune</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Analyze your actual customer distribution and suggest optimal scoring brackets calibrated to your portfolio.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        onClick={handleSuggest}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-md border border-primary/50 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {isLoading ? 'Analyzing portfolio...' : 'Analyze My Portfolio'}
      </button>
    </div>
  );
}
