import type { AgeBracket, MonthBracket, ScoreBracket } from '@banking-crm/types';

export function resolveFromBrackets(value: number, brackets: ScoreBracket[]): number {
  const sorted = [...brackets].sort((a, b) => b.min - a.min);
  for (const bracket of sorted) {
    if (value >= bracket.min) return bracket.score;
  }
  return 0;
}

export function resolveFromAgeBrackets(age: number, brackets: AgeBracket[]): number {
  for (const bracket of brackets) {
    if (age >= bracket.min && age <= bracket.max) return bracket.score;
  }
  return 2;
}

export function resolveFromMonthBrackets(months: number, brackets: MonthBracket[]): number {
  const sorted = [...brackets].sort((a, b) => b.minMonths - a.minMonths);
  for (const bracket of sorted) {
    if (months >= bracket.minMonths) return bracket.score;
  }
  return 0;
}
