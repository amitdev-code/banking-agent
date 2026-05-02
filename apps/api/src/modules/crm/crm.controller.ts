import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import type { SessionUser } from '@banking-crm/types';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CrmService } from './crm.service';
import { RunCrmDto } from './dto/run-crm.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

class HistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('run')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  run(
    @CurrentUser() user: SessionUser,
    @Body() dto: RunCrmDto,
  ): Promise<{ runId: string }> {
    return this.crmService.run(user, dto);
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: SessionUser,
    @Query() query: HistoryQueryDto,
  ) {
    return this.crmService.getHistory(user.tenantId, query.page ?? 1, query.limit ?? 20);
  }

  @Get('history/:id')
  getRunDetail(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ) {
    return this.crmService.getRunDetail(user.tenantId, id);
  }

  @Post('run/:id/pause')
  @HttpCode(HttpStatus.NO_CONTENT)
  pause(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.crmService.pauseRun(user.tenantId, id);
  }

  @Post('run/:id/resume')
  @HttpCode(HttpStatus.NO_CONTENT)
  resume(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.crmService.resumeRun(user.tenantId, id, user);
  }

  @Patch('results/:id/message')
  updateMessage(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: UpdateMessageDto,
  ): Promise<{ id: string }> {
    return this.crmService.updateMessage(user.tenantId, id, dto);
  }
}
