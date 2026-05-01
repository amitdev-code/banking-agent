import { Injectable, type NestMiddleware, NotFoundException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request & { tenant?: unknown }, _res: Response, next: NextFunction): Promise<void> {
    const slug =
      (req.headers['x-tenant-slug'] as string | undefined) ??
      this.extractSubdomain(req.hostname);

    if (!slug) {
      next();
      return;
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException(`Tenant '${slug}' not found`);

    req.tenant = tenant;
    next();
  }

  private extractSubdomain(hostname: string): string | undefined {
    const parts = hostname.split('.');
    return parts.length >= 3 ? parts[0] : undefined;
  }
}
