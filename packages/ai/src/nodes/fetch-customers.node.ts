import type { PrismaClient } from '@banking-crm/database';
import type { Customer } from '@banking-crm/types';

import type { CrmState } from '../graph/state';

interface FetchCustomersDeps {
  prisma: PrismaClient;
  emitStep: (
    runId: string,
    step: string,
    status: string,
    detail?: string,
    progress?: { current: number; total: number },
  ) => void;
}

export function createFetchCustomersNode(deps: FetchCustomersDeps) {
  return async function fetchCustomersNode(state: CrmState): Promise<Partial<CrmState>> {
    deps.emitStep(state.runId, 'fetchCustomers', 'running');

    const { filters } = buildWhere(state.tenantId, state.resolvedFilters);

    deps.emitStep(state.runId, 'fetchCustomers', 'running', 'Querying database...');
    const rows = await deps.prisma.customer.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
    });

    const total = rows.length;
    const customers: Customer[] = [];
    const BATCH = 100;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      customers.push({
        id: r.id,
        tenantId: r.tenantId,
        age: r.age,
        city: r.city,
        segment: r.segment as Customer['segment'],
        accountType: r.accountType as Customer['accountType'],
        kycStatus: r.kycStatus as Customer['kycStatus'],
        joinedAt: r.joinedAt,
        createdAt: r.createdAt,
        avgMonthlyBalance: Number(r.avgMonthlyBalance),
        hasActiveLoan: r.hasActiveLoan,
        loanType: r.loanType,
        fullName: r.fullName,
        phone: r.phone,
        email: r.email,
        pan: r.pan,
        aadhaar: r.aadhaar,
        address: r.address,
        dob: r.dob,
        accountNumber: r.accountNumber,
      });
      if ((i + 1) % BATCH === 0 && i + 1 < total) {
        deps.emitStep(
          state.runId,
          'fetchCustomers',
          'running',
          `Loading ${i + 1} of ${total} customers`,
          { current: i + 1, total },
        );
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }

    deps.emitStep(state.runId, 'fetchCustomers', 'done', `${customers.length} customers loaded`, {
      current: customers.length,
      total: customers.length,
    });
    return { customers };
  };
}

function buildWhere(tenantId: string, filters: CrmState['resolvedFilters']) {
  const where: Record<string, unknown> = { tenantId };

  if (filters.minAge !== undefined || filters.maxAge !== undefined) {
    where['age'] = {
      ...(filters.minAge !== undefined ? { gte: filters.minAge } : {}),
      ...(filters.maxAge !== undefined ? { lte: filters.maxAge } : {}),
    };
  }
  if (filters.cities && filters.cities.length > 0) {
    where['city'] = { in: filters.cities };
  }
  if (filters.segments && filters.segments.length > 0) {
    where['segment'] = { in: filters.segments };
  }
  // Use the higher of minAvgBalance and minSalary — both map to avgMonthlyBalance in the DB
  const balanceFloor = Math.max(filters.minAvgBalance ?? 0, filters.minSalary ?? 0);
  if (balanceFloor > 0) {
    where['avgMonthlyBalance'] = { gte: balanceFloor };
  }
  if (filters.hasExistingLoan !== undefined) {
    where['hasActiveLoan'] = filters.hasExistingLoan;
  }

  return { filters: where };
}
