import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { SessionUser } from '@banking-crm/types';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & {
      session: { user?: SessionUser };
      tenant?: { id: string };
    }>();

    const user = request.session?.user;
    if (!user) throw new UnauthorizedException('Not authenticated');

    // Cross-tenant session validation
    if (request.tenant && user.tenantId !== request.tenant.id) {
      throw new UnauthorizedException('Session does not belong to this tenant');
    }

    return true;
  }
}
