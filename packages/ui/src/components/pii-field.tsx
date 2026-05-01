'use client';

import { EyeOff, Lock } from 'lucide-react';

import { cn } from '../lib/utils';

interface PiiFieldProps {
  label: string;
  value: string | null | undefined;
  className?: string;
}

export function PiiField({ label, value, className }: PiiFieldProps) {
  const isMasked = !value || value.includes('*') || value.includes('X') || value.includes('MASKED');

  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2">
        {isMasked ? (
          <>
            <Lock className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
            <span className="text-sm text-muted-foreground font-mono">
              {value ?? '••••••••'}
            </span>
          </>
        ) : (
          <span className="text-sm font-medium text-foreground">{value}</span>
        )}
      </div>
    </div>
  );
}

interface PiiGridProps {
  fields: Array<{ label: string; value: string | null | undefined }>;
  className?: string;
}

export function PiiGrid({ fields, className }: PiiGridProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3', className)}>
      {fields.map((f) => (
        <PiiField key={f.label} label={f.label} value={f.value} />
      ))}
    </div>
  );
}
