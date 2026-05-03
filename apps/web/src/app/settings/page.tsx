'use client';

import { useEffect, useState } from 'react';
import { Save, Settings2 } from 'lucide-react';
import { defaultScoringConfig, type ScoringRulesConfig } from '@banking-crm/types';

import { AgeBracketEditor, MonthBracketEditor, ScoreBracketEditor } from '@/components/settings/bracket-editor';
import { ConfigDiffView } from '@/components/settings/config-diff-view';
import { AiSuggestPanel, NlTunePanel } from '@/components/settings/nl-tune-panel';
import { apiClient } from '@/lib/api-client';

export default function SettingsPage() {
  const [config, setConfig] = useState<ScoringRulesConfig>(defaultScoringConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [proposed, setProposed] = useState<{ config: ScoringRulesConfig; log: string[] } | null>(null);

  useEffect(() => {
    apiClient.get<ScoringRulesConfig>('/admin/scoring-config').then(setConfig).catch(() => null);
  }, []);

  function update(patch: Partial<ScoringRulesConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
    setProposed(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveMsg(null);
    try {
      await apiClient.put('/admin/scoring-config', { rules: config });
      setSaveMsg('Config saved successfully');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch {
      setSaveMsg('Save failed — please try again');
    } finally {
      setIsSaving(false);
    }
  }

  function handleProposed(next: ScoringRulesConfig, log: string[]) {
    setProposed({ config: next, log });
  }

  function acceptProposed(next: ScoringRulesConfig) {
    setConfig(next);
    setProposed(null);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings2 className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Scoring Configuration</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tune loan readiness scoring rules for your customer base
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saveMsg && (
              <span className={`text-xs ${saveMsg.includes('failed') ? 'text-destructive' : 'text-green-600'}`}>
                {saveMsg}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Config'}
            </button>
          </div>
        </div>

        {/* AI Tools */}
        <div className="grid grid-cols-2 gap-4">
          <NlTunePanel onProposed={handleProposed} />
          <AiSuggestPanel onProposed={handleProposed} />
        </div>

        {/* Diff View */}
        {proposed && (
          <ConfigDiffView
            proposed={proposed.config}
            changeLog={proposed.log}
            onAccept={acceptProposed}
            onDismiss={() => setProposed(null)}
          />
        )}

        <div className="border-t" />

        {/* Qualify Threshold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Qualify Threshold</h2>
            <span className="text-xs text-muted-foreground">
              Customers must score ≥ this to qualify
            </span>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={40}
              max={100}
              value={config.qualifyThreshold}
              onChange={(e) => update({ qualifyThreshold: Number(e.target.value) })}
              className="flex-1 accent-primary"
            />
            <span className="w-12 rounded border border-input bg-background px-2 py-1 text-sm text-center font-mono">
              {config.qualifyThreshold}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-1">
            {(['primed', 'engaged', 'dormant'] as const).map((label) => (
              <div key={label} className="space-y-1">
                <p className="text-xs text-muted-foreground capitalize">{label} label ≥</p>
                <input
                  type="number"
                  value={config.readinessLabels[label]}
                  onChange={(e) =>
                    update({ readinessLabels: { ...config.readinessLabels, [label]: Number(e.target.value) } })
                  }
                  className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t" />

        {/* Scoring Rules Grid */}
        <div className="grid grid-cols-2 gap-8">
          <ScoreBracketEditor
            label="Salary (monthly avg)"
            maxScore={config.salary.maxScore}
            brackets={config.salary.brackets}
            prefix="≥ ₹"
            onMaxScoreChange={(v) => update({ salary: { ...config.salary, maxScore: v } })}
            onBracketsChange={(b) => update({ salary: { ...config.salary, brackets: b } })}
          />

          <ScoreBracketEditor
            label="Average Balance"
            maxScore={config.balance.maxScore}
            brackets={config.balance.brackets}
            prefix="≥ ₹"
            onMaxScoreChange={(v) => update({ balance: { ...config.balance, maxScore: v } })}
            onBracketsChange={(b) => update({ balance: { ...config.balance, brackets: b } })}
          />

          <MonthBracketEditor
            label="Salary Credited Consistency"
            maxScore={config.salaryCredited.maxScore}
            brackets={config.salaryCredited.brackets}
            onMaxScoreChange={(v) => update({ salaryCredited: { ...config.salaryCredited, maxScore: v } })}
            onBracketsChange={(b) => update({ salaryCredited: { ...config.salaryCredited, brackets: b } })}
          />

          <AgeBracketEditor
            maxScore={config.age.maxScore}
            brackets={config.age.brackets}
            onMaxScoreChange={(v) => update({ age: { ...config.age, maxScore: v } })}
            onBracketsChange={(b) => update({ age: { ...config.age, brackets: b } })}
          />

          <ScoreBracketEditor
            label="Transaction Activity (30 days)"
            maxScore={config.activity.maxScore}
            brackets={config.activity.brackets}
            prefix="≥"
            onMaxScoreChange={(v) => update({ activity: { ...config.activity, maxScore: v } })}
            onBracketsChange={(b) => update({ activity: { ...config.activity, brackets: b } })}
          />

          {/* Loan Penalties */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Loan Penalties</h3>
            <div className="space-y-2">
              {(['personal', 'home', 'other', 'cap'] as const).map((key) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 capitalize">{key} loan</span>
                  <input
                    type="number"
                    value={config.loanPenalty[key]}
                    onChange={(e) =>
                      update({ loanPenalty: { ...config.loanPenalty, [key]: Number(e.target.value) } })
                    }
                    className="w-20 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">pts deducted</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t" />

        {/* LLM Hybrid Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">LLM Hybrid Scoring</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.llmHybrid.enabled}
                onChange={(e) =>
                  update({ llmHybrid: { ...config.llmHybrid, enabled: e.target.checked } })
                }
                className="rounded border-input accent-primary"
              />
              <span className="text-xs text-muted-foreground">Enabled</span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            For customers with scores in the borderline range, an LLM reviews qualitative signals
            (freelance income, salary jumps, EMI burden) and adjusts scores up or down.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {(['borderlineMin', 'borderlineMax', 'maxAdjustment'] as const).map((key) => (
              <div key={key} className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {key === 'borderlineMin' ? 'Borderline min' : key === 'borderlineMax' ? 'Borderline max' : 'Max adjustment'}
                </p>
                <input
                  type="number"
                  value={config.llmHybrid[key]}
                  disabled={!config.llmHybrid.enabled}
                  onChange={(e) =>
                    update({ llmHybrid: { ...config.llmHybrid, [key]: Number(e.target.value) } })
                  }
                  className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
