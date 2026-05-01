import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

import { generateCustomer } from './generators/customer.generator';
import { generateTransactions } from './generators/transaction.generator';
import { buildScenarioList } from './generators/scenario.generator';

const prisma = new PrismaClient();

const CUSTOMERS_PER_TENANT = 500;
const TX_BATCH_SIZE = 1000;
const SALT_ROUNDS = 10;

const TENANTS = [
  { name: 'Alpha Bank Mumbai', slug: 'alpha-bank-mumbai' },
  { name: 'Beta Bank Delhi', slug: 'beta-bank-delhi' },
];

async function seedTenants(): Promise<Array<{ id: string; slug: string }>> {
  console.log('Seeding tenants...');
  const tenants = [];
  for (const tenant of TENANTS) {
    const created = await prisma.tenant.upsert({
      where: { slug: tenant.slug },
      update: {},
      create: tenant,
    });
    tenants.push(created);
    console.log(`  ✓ Tenant: ${tenant.name}`);
  }
  return tenants;
}

async function seedUsers(tenants: Array<{ id: string; slug: string }>): Promise<void> {
  console.log('Seeding users...');
  const hashedPassword = await bcrypt.hash('Password@123', SALT_ROUNDS);

  const adminPii = JSON.stringify({
    showFullName: true, showPhone: true, showEmail: true, showPan: true,
    showAadhaar: true, showAddress: true, showDob: true, showAccountNumber: true,
  });
  const managerPii = JSON.stringify({
    showFullName: true, showPhone: true, showEmail: true, showPan: false,
    showAadhaar: false, showAddress: true, showDob: false, showAccountNumber: false,
  });
  const analystPii = JSON.stringify({
    showFullName: true, showPhone: false, showEmail: false, showPan: false,
    showAadhaar: false, showAddress: false, showDob: false, showAccountNumber: false,
  });

  for (const tenant of tenants) {
    const slug = tenant.slug.replace(/-/g, '');

    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: `admin@${tenant.slug}.com` } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: `admin@${tenant.slug}.com`,
        name: 'Super Admin',
        password: hashedPassword,
        role: 'ADMIN',
        piiVisibility: adminPii as unknown as object,
      },
    });

    for (let m = 1; m <= 5; m++) {
      await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: `manager${m}@${tenant.slug}.com` } },
        update: {},
        create: {
          tenantId: tenant.id,
          email: `manager${m}@${tenant.slug}.com`,
          name: `Manager ${m}`,
          password: hashedPassword,
          role: 'MANAGER',
          piiVisibility: managerPii as unknown as object,
        },
      });
    }

    for (let a = 1; a <= 10; a++) {
      await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: `analyst${a}@${tenant.slug}.com` } },
        update: {},
        create: {
          tenantId: tenant.id,
          email: `analyst${a}@${tenant.slug}.com`,
          name: `Analyst ${a}`,
          password: hashedPassword,
          role: 'ANALYST',
          piiVisibility: analystPii as unknown as object,
        },
      });
    }

    console.log(`  ✓ Users seeded for ${tenant.slug} (1 admin, 5 managers, 10 analysts)`);
  }
}

async function seedCustomersAndTransactions(
  tenants: Array<{ id: string; slug: string }>,
): Promise<void> {
  let globalIndex = 0;

  for (const tenant of tenants) {
    console.log(`\nSeeding customers for ${tenant.slug}...`);
    const scenarios = buildScenarioList(CUSTOMERS_PER_TENANT);

    // Build all customer data
    const customerDataArray = scenarios.map((scenario, i) => {
      const data = generateCustomer(scenario, tenant.id, globalIndex + i);
      return {
        tenantId: data.tenantId,
        age: data.age,
        city: data.city,
        segment: data.segment,
        accountType: data.accountType,
        kycStatus: data.kycStatus,
        joinedAt: data.joinedAt,
        fullName: data.fullName,
        phone: data.phone,
        email: `${data.email}.${globalIndex + i}`, // ensure uniqueness
        pan: `${data.pan}${String(globalIndex + i).padStart(3, '0')}`.substring(0, 10),
        aadhaar: data.aadhaar,
        address: data.address,
        dob: data.dob,
        accountNumber: String(1000000000 + globalIndex + i).padStart(16, '0'),
        hasActiveLoan: data.hasActiveLoan,
        loanType: data.loanType,
        avgMonthlyBalance: data.avgMonthlyBalance,
      };
    });

    // Batch insert customers
    await prisma.customer.createMany({ data: customerDataArray, skipDuplicates: true });
    console.log(`  ✓ ${customerDataArray.length} customers created`);

    // Fetch inserted customers to get their IDs
    const insertedCustomers = await prisma.customer.findMany({
      where: { tenantId: tenant.id },
      select: { id: true },
    });

    console.log(`  Generating transactions for ${insertedCustomers.length} customers...`);

    let allTransactions: Array<{
      customerId: string;
      tenantId: string;
      amount: number;
      type: 'CREDIT' | 'DEBIT';
      category: string;
      description: string;
      merchantName: string | null;
      occurredAt: Date;
    }> = [];

    insertedCustomers.forEach((customer, i) => {
      const scenario = scenarios[i] ?? scenarios[0];
      if (!scenario) return;
      const txs = generateTransactions(customer.id, tenant.id, scenario, globalIndex + i);
      allTransactions = allTransactions.concat(txs);
    });

    // Batch insert transactions
    let inserted = 0;
    for (let i = 0; i < allTransactions.length; i += TX_BATCH_SIZE) {
      const batch = allTransactions.slice(i, i + TX_BATCH_SIZE);
      await prisma.transaction.createMany({ data: batch as Parameters<typeof prisma.transaction.createMany>[0]['data'], skipDuplicates: true });
      inserted += batch.length;
      process.stdout.write(`\r  Transactions: ${inserted}/${allTransactions.length}`);
    }
    console.log(`\n  ✓ ${allTransactions.length} transactions created`);

    globalIndex += CUSTOMERS_PER_TENANT;
  }
}

async function main(): Promise<void> {
  console.log('🌱 Starting database seed...\n');
  const start = Date.now();

  try {
    const tenants = await seedTenants();
    await seedUsers(tenants);
    await seedCustomersAndTransactions(tenants);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✅ Seed complete in ${elapsed}s`);
    console.log('\nAdmin credentials:');
    console.log('  Email:    admin@alpha-bank-mumbai.com');
    console.log('  Password: Password@123');
    console.log('  Tenant:   X-Tenant-Slug: alpha-bank-mumbai');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
