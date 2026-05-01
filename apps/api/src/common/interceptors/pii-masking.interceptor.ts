import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { type Observable, map } from 'rxjs';

import type { PiiVisibilityConfig, SessionUser } from '@banking-crm/types';

const PII_FIELD_MAP: Record<string, keyof PiiVisibilityConfig> = {
  fullName: 'showFullName',
  phone: 'showPhone',
  email: 'showEmail',
  pan: 'showPan',
  aadhaar: 'showAadhaar',
  address: 'showAddress',
  dob: 'showDob',
  accountNumber: 'showAccountNumber',
};

@Injectable()
export class PiiMaskingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & {
      session: { user?: SessionUser };
    }>();
    const user = request.session?.user;

    return next.handle().pipe(
      map((data: unknown) => {
        if (!user) return data;
        return this.maskRecursive(data, user.piiVisibility);
      }),
    );
  }

  private maskRecursive(data: unknown, visibility: PiiVisibilityConfig): unknown {
    if (Array.isArray(data)) {
      return data.map((item) => this.maskRecursive(item, visibility));
    }
    if (data !== null && typeof data === 'object') {
      const result = { ...(data as Record<string, unknown>) };
      for (const [field, visKey] of Object.entries(PII_FIELD_MAP)) {
        if (field in result && !visibility[visKey]) {
          result[field] = this.maskValue(field, result[field]);
        }
      }
      for (const key of Object.keys(result)) {
        if (result[key] !== null && typeof result[key] === 'object') {
          result[key] = this.maskRecursive(result[key], visibility);
        }
      }
      return result;
    }
    return data;
  }

  private maskValue(field: string, value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const str = String(value);
    switch (field) {
      case 'email':
        return `${str[0] ?? '?'}***@***.***`;
      case 'phone':
        return `XXXXXX${str.slice(-4)}`;
      case 'pan':
        return `${str.slice(0, 2)}XXXXXXX${str.slice(-1)}`;
      case 'aadhaar':
        return `XXXX XXXX ${str.slice(-4)}`;
      case 'accountNumber':
        return `XXXXXXXX${str.slice(-4)}`;
      case 'dob':
        return '**/**/****';
      default:
        return '***MASKED***';
    }
  }
}
