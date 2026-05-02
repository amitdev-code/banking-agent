# Skill: Create Business Service

Use this template when adding a new service to `apps/api`.

## Service Template

```typescript
// apps/api/src/modules/<feature>/<feature>.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@banking-crm/types';
import { FeatureRepository } from './<feature>.repository';
import type { CreateFeatureDto } from './dto/create-<feature>.dto';

@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  constructor(private readonly featureRepository: FeatureRepository) {}

  async findAll(tenantId: string, page: number, limit: number): Promise<FeatureListResult> {
    this.logger.debug(`Fetching feature list for tenant ${tenantId}`);
    return this.featureRepository.findAll(tenantId, page, limit);
  }

  async findById(tenantId: string, id: string): Promise<FeatureItem> {
    const item = await this.featureRepository.findById(tenantId, id);
    if (!item) throw new NotFoundException(`Feature ${id} not found`);
    return item;
  }

  async create(tenantId: string, dto: CreateFeatureDto): Promise<FeatureItem> {
    return this.featureRepository.create(tenantId, dto);
  }
}
```

## Repository Template

```typescript
// apps/api/src/modules/<feature>/<feature>.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { FeatureItem } from '@banking-crm/types';

@Injectable()
export class FeatureRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, page: number, limit: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.feature.findMany({
        where: { tenantId },              // ALWAYS scope by tenantId
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.feature.count({ where: { tenantId } }),
    ]);
    return { items, total, page, limit };
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.feature.findFirst({
      where: { id, tenantId },           // ALWAYS include tenantId in findFirst/findUnique
    });
  }
}
```

## Rules

- Services are `@Injectable()` — always use constructor injection
- Services never import `PrismaClient` directly — only via `PrismaService` through a repository
- Repositories always include `tenantId` in every query's `where` clause
- Services throw NestJS exceptions (`NotFoundException`, etc.) — never raw errors
- `Logger` is instantiated with `new Logger(ClassName.name)` — always
- Methods are async — no sync blocking
- Return domain types from `@banking-crm/types`, not raw Prisma types

## Unit Testing Pattern

```typescript
// <feature>.service.spec.ts
describe('FeatureService', () => {
  let service: FeatureService;
  let repository: jest.Mocked<FeatureRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FeatureService,
        { provide: FeatureRepository, useValue: { findAll: jest.fn(), findById: jest.fn() } },
      ],
    }).compile();

    service = module.get(FeatureService);
    repository = module.get(FeatureRepository);
  });

  it('throws NotFoundException when item not found', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.findById('tenant1', 'missing-id')).rejects.toThrow(NotFoundException);
  });
});
```
