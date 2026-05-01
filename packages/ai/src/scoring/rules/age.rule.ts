import type { Customer } from '@banking-crm/types';

export const AGE_MAX = 10;

export function ageScore(customer: Customer): number {
  const { age } = customer;

  if (age >= 28 && age <= 40) return 10;
  if (age >= 41 && age <= 55) return 8;
  if (age >= 22 && age <= 27) return 6;
  if (age >= 56 && age <= 65) return 5;
  if (age >= 18 && age <= 21) return 2;
  return 2;
}
