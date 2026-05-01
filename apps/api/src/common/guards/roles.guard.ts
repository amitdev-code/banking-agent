import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { Role, SessionUser } from '@banking-crm/types';

import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & {
      session: { user?: SessionUser };
    }>();
    const user = request.session?.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Requires role: ${requiredRoles.join(' or ')}`);
    }

    return true;
  }
}
