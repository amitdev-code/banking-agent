'use client';

import { Minus, Plus } from 'lucide-react';
import type { ScoreBracket, AgeBracket, MonthBracket } from '@banking-crm/types';

interface ScoreBracketEditorProps {
  label: string;
  maxScore: number;
  brackets: ScoreBracket[];
  onMaxScoreChange: (v: number) => void;
  onBracketsChange: (b: ScoreBracket[]) => void;
  prefix?: string;
}

export function ScoreBracketEditor({
  label, maxScore, brackets, onMaxScoreChange, onBracketsChange, prefix = '≥',
}: ScoreBracketEditorProps) {
  const sorted = [...brackets].sort((a, b) => b.min - a.min);

  function update(idx: number, field: 'min' | 'score', value: number) {
    const next = sorted.map((b, i) => i === idx ? { ...b, [field]: value } : b);
    onBracketsChange(next);
  }

  function add() {
    onBracketsChange([...sorted, { min: 0, score: 0 }]);
  }

  function remove(idx: number) {
    onBracketsChange(sorted.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{label}</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Max pts:</span>
          <input
            type="number"
            value={maxScore}
            onChange={(e) => onMaxScoreChange(Number(e.target.value))}
            className="w-14 rounded border border-input bg-background px-2 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        {sorted.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-4">{prefix}</span>
            <input
              type="number"
              value={b.min}
              onChange={(e) => update(i, 'min', Number(e.target.value))}
              className="w-28 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <input
              type="number"
              value={b.score}
              onChange={(e) => update(i, 'score', Number(e.target.value))}
              className="w-16 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">pts</span>
            <button onClick={() => remove(i)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> Add bracket
      </button>
    </div>
  );
}

interface AgeBracketEditorProps {
  brackets: AgeBracket[];
  maxScore: number;
  onMaxScoreChange: (v: number) => void;
  onBracketsChange: (b: AgeBracket[]) => void;
}

export function AgeBracketEditor({ brackets, maxScore, onMaxScoreChange, onBracketsChange }: AgeBracketEditorProps) {
  function update(idx: number, field: keyof AgeBracket, value: number) {
    onBracketsChange(brackets.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  }

  function add() {
    onBracketsChange([...brackets, { min: 18, max: 25, score: 0 }]);
  }

  function remove(idx: number) {
    onBracketsChange(brackets.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Age</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Max pts:</span>
          <input
            type="number"
            value={maxScore}
            onChange={(e) => onMaxScoreChange(Number(e.target.value))}
            className="w-14 rounded border border-input bg-background px-2 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        {brackets.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="number"
              value={b.min}
              onChange={(e) => update(i, 'min', Number(e.target.value))}
              className="w-16 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <input
              type="number"
              value={b.max}
              onChange={(e) => update(i, 'max', Number(e.target.value))}
              className="w-16 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <input
              type="number"
              value={b.score}
              onChange={(e) => update(i, 'score', Number(e.target.value))}
              className="w-16 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">pts</span>
            <button onClick={() => remove(i)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={add} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <Plus className="h-3.5 w-3.5" /> Add bracket
      </button>
    </div>
  );
}

interface MonthBracketEditorProps {
  label: string;
  maxScore: number;
  brackets: MonthBracket[];
  onMaxScoreChange: (v: number) => void;
  onBracketsChange: (b: MonthBracket[]) => void;
}

export function MonthBracketEditor({ label, maxScore, brackets, onMaxScoreChange, onBracketsChange }: MonthBracketEditorProps) {
  const sorted = [...brackets].sort((a, b) => b.minMonths - a.minMonths);

  function update(idx: number, field: 'minMonths' | 'score', value: number) {
    onBracketsChange(sorted.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  }

  function add() {
    onBracketsChange([...sorted, { minMonths: 1, score: 0 }]);
  }

  function remove(idx: number) {
    onBracketsChange(sorted.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{label}</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Max pts:</span>
          <input
            type="number"
            value={maxScore}
            onChange={(e) => onMaxScoreChange(Number(e.target.value))}
            className="w-14 rounded border border-input bg-background px-2 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        {sorted.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-4">≥</span>
            <input
              type="number"
              value={b.minMonths}
              onChange={(e) => update(i, 'minMonths', Number(e.target.value))}
              className="w-16 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">months →</span>
            <input
              type="number"
              value={b.score}
              onChange={(e) => update(i, 'score', Number(e.target.value))}
              className="w-16 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">pts</span>
            <button onClick={() => remove(i)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={add} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <Plus className="h-3.5 w-3.5" /> Add bracket
      </button>
    </div>
  );
}
