import type { ReadinessLabel } from '@banking-crm/types';

import { cn } from '../lib/utils';

const LABEL_STYLES: Record<ReadinessLabel, string> = {
  Primed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Engaged: 'bg-blue-100 text-blue-800 border-blue-200',
  Dormant: 'bg-amber-100 text-amber-800 border-amber-200',
  'At-Risk': 'bg-red-100 text-red-800 border-red-200',
};

const LABEL_DOTS: Record<ReadinessLabel, string> = {
  Primed: 'bg-emerald-500',
  Engaged: 'bg-blue-500',
  Dormant: 'bg-amber-500',
  'At-Risk': 'bg-red-500',
};

interface ScoreBadgeProps {
  label: ReadinessLabel;
  className?: string;
}

export function ScoreBadge({ label, className }: ScoreBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        LABEL_STYLES[label],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', LABEL_DOTS[label])} />
      {label}
    </span>
  );
}
