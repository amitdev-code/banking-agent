'use client';

import type { ReadinessLabel } from '@banking-crm/types';

export type SortKey = 'score' | 'age' | 'salary';
export type ReadinessFilter = ReadinessLabel | 'all';

interface CustomerFiltersProps {
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  readinessFilter: ReadinessFilter;
  onReadinessChange: (filter: ReadinessFilter) => void;
  qualifiesOnly: boolean;
  onQualifiesChange: (val: boolean) => void;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'salary', label: 'Salary' },
  { value: 'age', label: 'Age' },
];

const READINESS_OPTIONS: { value: ReadinessFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Primed', label: 'Primed' },
  { value: 'Engaged', label: 'Engaged' },
  { value: 'Dormant', label: 'Dormant' },
  { value: 'At-Risk', label: 'At-Risk' },
];

export function CustomerFilters({
  sort,
  onSortChange,
  readinessFilter,
  onReadinessChange,
  qualifiesOnly,
  onQualifiesChange,
}: CustomerFiltersProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b flex-wrap">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Sort:</span>
        <div className="flex rounded-md border overflow-hidden">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                sort === opt.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Readiness:</span>
        <select
          value={readinessFilter}
          onChange={(e) => onReadinessChange(e.target.value as ReadinessFilter)}
          className="text-xs border rounded px-2 py-1 bg-background"
        >
          {READINESS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={qualifiesOnly}
          onChange={(e) => onQualifiesChange(e.target.checked)}
          className="h-3.5 w-3.5 rounded"
        />
        <span className="text-xs text-muted-foreground">Qualifies only</span>
      </label>
    </div>
  );
}
