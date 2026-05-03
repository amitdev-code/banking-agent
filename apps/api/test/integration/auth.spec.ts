import request from 'supertest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { prisma, seedMinimal } from './setup';
import * as bcrypt from 'bcrypt';

describe('Auth (integration)', () => {
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

  it('POST /auth/login returns 201 and sets session cookie', async () => {
    const { tenantId } = await seedMinimal();
    const hash = await bcrypt.hash('password123', 10);
    await prisma.user.updateMany({
      where: { tenantId },
      data: { passwordHash: hash },
    });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Slug', 'test-bank')
      .send({ email: 'admin@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.body.id).toBeDefined();
    expect(res.body.role).toBe('ADMIN');
  });

  it('POST /auth/login returns 401 for wrong password', async () => {
    await seedMinimal();

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Slug', 'test-bank')
      .send({ email: 'admin@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('POST /auth/logout clears session', async () => {
    const { tenantId } = await seedMinimal();
    const hash = await bcrypt.hash('password123', 10);
    await prisma.user.updateMany({ where: { tenantId }, data: { passwordHash: hash } });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Tenant-Slug', 'test-bank')
      .send({ email: 'admin@test.com', password: 'password123' });

    const cookie = loginRes.headers['set-cookie'];

    const logoutRes = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookie);

    expect(logoutRes.status).toBe(200);

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookie);

    expect(meRes.status).toBe(401);
  });
});
