import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';

import type { PiiVisibilityConfig, SessionUser } from '@banking-crm/types';
import { ADMIN_PII_VISIBILITY } from '@banking-crm/types';

import { PrismaService } from '../../database/prisma.service';
import type { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  private resolvePiiVisibility(role: string, stored: unknown): PiiVisibilityConfig {
    if (role === 'ADMIN') return ADMIN_PII_VISIBILITY;
    return stored as PiiVisibilityConfig;
  }

  async validateCredentials(tenantId: string, dto: LoginDto): Promise<SessionUser> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId, isActive: true },
      include: { tenant: { select: { name: true, slug: true } } },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    this.logger.debug(`User ${user.id} authenticated for tenant ${tenantId}`);

    return {
      id: user.id,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      tenantSlug: user.tenant.slug,
      role: user.role as SessionUser['role'],
      piiVisibility: this.resolvePiiVisibility(user.role, user.piiVisibility),
      name: user.name,
      email: user.email,
    };
  }

  async getMe(userId: string, tenantId: string): Promise<SessionUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { tenant: { select: { name: true, slug: true } } },
    });
    if (!user) throw new UnauthorizedException('User not found');

    return {
      id: user.id,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      tenantSlug: user.tenant.slug,
      role: user.role as SessionUser['role'],
      piiVisibility: this.resolvePiiVisibility(user.role, user.piiVisibility),
      name: user.name,
      email: user.email,
    };
  }
}
