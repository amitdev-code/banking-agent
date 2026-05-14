import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import type { SessionUser } from '@banking-crm/types';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CrmSessionService } from './crm-session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('crm-session')
export class CrmSessionController {
  constructor(private readonly sessionService: CrmSessionService) {}

  @Post()
  async createSession(@CurrentUser() user: SessionUser, @Body() dto: CreateSessionDto) {
    return this.sessionService.createSession(user.tenantId, user.id, dto.title);
  }

  @Get()
  async listSessions(
    @CurrentUser() user: SessionUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.sessionService.listSessions(user.tenantId, Number(page), Number(limit));
  }

  @Get(':id')
  async getSession(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.sessionService.getSession(id, user.tenantId);
  }

  @Get(':id/customers')
  async getSessionCustomers(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.sessionService.getSessionCustomers(id, user.tenantId);
  }

  @Post(':id/message')
  @HttpCode(202)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async sendMessage(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.sessionService.sendMessage(id, user.tenantId, user.id, dto.content);
  }

  @Post(':id/approve')
  @HttpCode(202)
  async approveMessages(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.sessionService.approveMessages(id, user.tenantId);
  }

  @Delete(':id')
  async archiveSession(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.sessionService.archiveSession(id, user.tenantId);
  }
}
