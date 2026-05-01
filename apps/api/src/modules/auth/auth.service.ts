import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';

import type { PiiVisibilityConfig, SessionUser } from '@banking-crm/types';

import { PrismaService } from '../../database/prisma.service';
import type { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateCredentials(tenantId: string, dto: LoginDto): Promise<SessionUser> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId, isActive: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    this.logger.debug(`User ${user.id} authenticated for tenant ${tenantId}`);

    return {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role as SessionUser['role'],
      piiVisibility: user.piiVisibility as unknown as PiiVisibilityConfig,
      name: user.name,
      email: user.email,
    };
  }

  async getMe(userId: string, tenantId: string): Promise<SessionUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new UnauthorizedException('User not found');

    return {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role as SessionUser['role'],
      piiVisibility: user.piiVisibility as unknown as PiiVisibilityConfig,
      name: user.name,
      email: user.email,
    };
  }
}
