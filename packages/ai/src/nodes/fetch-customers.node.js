"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFetchCustomersNode = createFetchCustomersNode;
function createFetchCustomersNode(deps) {
    return async function fetchCustomersNode(state) {
        deps.emitStep(state.runId, 'fetchCustomers', 'running');
        const { filters } = buildWhere(state.tenantId, state.resolvedFilters);
        const rows = await deps.prisma.customer.findMany({
            where: filters,
            orderBy: { createdAt: 'desc' },
        });
        const customers = rows.map((r) => ({
            id: r.id,
            tenantId: r.tenantId,
            age: r.age,
            city: r.city,
            segment: r.segment,
            accountType: r.accountType,
            kycStatus: r.kycStatus,
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
        }));
        deps.emitStep(state.runId, 'fetchCustomers', 'done');
        return { customers };
    };
}
function buildWhere(tenantId, filters) {
    const where = { tenantId };
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
    if (filters.minAvgBalance !== undefined) {
        where['avgMonthlyBalance'] = { gte: filters.minAvgBalance };
    }
    return { filters: where };
}
