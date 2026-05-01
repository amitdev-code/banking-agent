import type { CustomerFilters, Segment } from '@banking-crm/types';

const VALID_SEGMENTS: Segment[] = ['retail', 'premium', 'sme', 'nri'];

export function sanitizeFilters(raw: Partial<CustomerFilters>): CustomerFilters {
  const filters: CustomerFilters = {};

  if (typeof raw.minAge === 'number' && raw.minAge >= 18) filters.minAge = raw.minAge;
  if (typeof raw.maxAge === 'number' && raw.maxAge <= 80) filters.maxAge = raw.maxAge;
  if (typeof raw.minAvgBalance === 'number' && raw.minAvgBalance >= 0) {
    filters.minAvgBalance = raw.minAvgBalance;
  }
  if (typeof raw.minSalary === 'number' && raw.minSalary >= 0) {
    filters.minSalary = raw.minSalary;
  }
  if (Array.isArray(raw.cities) && raw.cities.length > 0) {
    filters.cities = raw.cities.filter((c) => typeof c === 'string');
  }
  if (Array.isArray(raw.segments) && raw.segments.length > 0) {
    filters.segments = raw.segments.filter((s): s is Segment => VALID_SEGMENTS.includes(s as Segment));
  }
  if (typeof raw.hasExistingLoan === 'boolean') {
    filters.hasExistingLoan = raw.hasExistingLoan;
  }

  return filters;
}
