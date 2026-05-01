import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Session,
} from '@nestjs/common';
import type { Request } from 'express';

import type { SessionUser } from '@banking-crm/types';

import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import type { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request & { tenant: { id: string }; session: { user?: SessionUser } },
  ): Promise<{ user: SessionUser }> {
    const user = await this.authService.validateCredentials(req.tenant.id, dto);
    req.session.user = user;
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Req() req: Request & { session: { destroy: (cb: (err: unknown) => void) => void } }): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  @Get('me')
  async getMe(
    @Session() session: { user: SessionUser },
  ): Promise<{ user: SessionUser }> {
    const user = await this.authService.getMe(session.user.id, session.user.tenantId);
    return { user };
  }
}
