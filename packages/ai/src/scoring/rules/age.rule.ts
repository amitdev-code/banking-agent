import type { AgeBracket, Customer } from '@banking-crm/types';

import { resolveFromAgeBrackets } from '../brackets';

export function ageScore(customer: Customer, brackets: AgeBracket[]): number {
  return resolveFromAgeBrackets(customer.age, brackets);
}
