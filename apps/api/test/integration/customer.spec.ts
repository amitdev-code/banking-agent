import request from 'supertest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { prisma, seedMinimal } from './setup';
import * as bcrypt from 'bcrypt';

async function loginAs(app: INestApplication, slug: string, email: string, password: string): Promise<string[]> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .set('X-Tenant-Slug', slug)
    .send({ email, password });
  return res.headers['set-cookie'] as string[];
}

describe('Customer (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /customers returns only customers of the authenticated tenant', async () => {
    const { tenantId } = await seedMinimal();
    const hash = await bcrypt.hash('pass123', 10);
    await prisma.user.updateMany({ where: { tenantId }, data: { passwordHash: hash } });

    // Create a customer for tenant A
    await prisma.customer.create({
      data: {
        tenantId,
        fullName: 'Tenant A Customer',
        phone: '9999999999',
        email: 'a@a.com',
        pan: 'AAAAA1111A',
        aadhaar: '111111111111',
        accountNumber: 'ACCA001',
        address: 'Addr A',
        dob: new Date('1990-01-01'),
        city: 'Mumbai',
        age: 34,
      },
    });

    // Create a separate tenant B with its own customer
    const tenantB = await prisma.tenant.create({ data: { name: 'Bank B', slug: 'bank-b' } });
    await prisma.customer.create({
      data: {
        tenantId: tenantB.id,
        fullName: 'Tenant B Customer',
        phone: '8888888888',
        email: 'b@b.com',
        pan: 'BBBBB2222B',
        aadhaar: '222222222222',
        accountNumber: 'ACCB001',
        address: 'Addr B',
        dob: new Date('1985-06-15'),
        city: 'Delhi',
        age: 40,
      },
    });

    const cookie = await loginAs(app, 'test-bank', 'admin@test.com', 'pass123');

    const res = await request(app.getHttpServer())
      .get('/customers')
      .set('Cookie', cookie)
      .set('X-Tenant-Slug', 'test-bank');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].fullName).toBe('Tenant A Customer');
  });

  it('GET /customers/:id returns 403 if customer belongs to different tenant', async () => {
    const { tenantId } = await seedMinimal();
    const hash = await bcrypt.hash('pass123', 10);
    await prisma.user.updateMany({ where: { tenantId }, data: { passwordHash: hash } });

    const tenantB = await prisma.tenant.create({ data: { name: 'Bank B2', slug: 'bank-b2' } });
    const other = await prisma.customer.create({
      data: {
        tenantId: tenantB.id,
        fullName: 'Other Customer',
        phone: '7777777777',
        email: 'o@o.com',
        pan: 'OOOOO3333O',
        aadhaar: '333333333333',
        accountNumber: 'ACCO001',
        address: 'Addr O',
        dob: new Date('1992-03-10'),
        city: 'Chennai',
        age: 32,
      },
    });

    const cookie = await loginAs(app, 'test-bank', 'admin@test.com', 'pass123');

    const res = await request(app.getHttpServer())
      .get(`/customers/${other.id}`)
      .set('Cookie', cookie)
      .set('X-Tenant-Slug', 'test-bank');

    expect(res.status).toBe(403);
  });
});
