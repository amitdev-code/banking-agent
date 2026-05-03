import { PrismaClient } from '@banking-crm/database';

export const prisma = new PrismaClient({
  datasources: { db: { url: process.env['DATABASE_URL'] ?? 'postgresql://banking:banking@localhost:5432/banking_crm_test' } },
});

export async function truncateAll(): Promise<void> {
  await prisma.$executeRaw`TRUNCATE TABLE "ScoredResult", "AnalysisRun", "Transaction", "Customer", "User", "Tenant" RESTART IDENTITY CASCADE`;
}

export async function seedMinimal(): Promise<{ tenantId: string; userId: string }> {
  const tenant = await prisma.tenant.create({
    data: { name: 'Test Bank', slug: 'test-bank' },
  });

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@test.com',
      passwordHash: '$2b$10$testhashedpassword',
      name: 'Admin User',
      role: 'ADMIN',
      piiVisibility: {
        showFullName: true, showPhone: true, showEmail: true,
        showPan: true, showAadhaar: true, showAddress: true,
        showDob: true, showAccountNumber: true,
      },
    },
  });

  return { tenantId: tenant.id, userId: user.id };
}

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await truncateAll();
});
