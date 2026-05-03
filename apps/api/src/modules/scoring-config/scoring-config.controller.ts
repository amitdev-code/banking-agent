import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';

import type { ScoringRulesConfig } from '@banking-crm/types';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { SessionUser } from '@banking-crm/types';
import { TuneConfigDto, UpdateScoringConfigDto } from './dto/scoring-config.dto';
import { ScoringConfigService } from './scoring-config.service';

@Controller('admin/scoring-config')
export class ScoringConfigController {
  constructor(private readonly service: ScoringConfigService) {}

  @Get()
  getConfig(@CurrentUser() user: SessionUser): Promise<ScoringRulesConfig> {
    return this.service.getConfig(user.tenantId);
  }

  @Put()
  @Roles('ADMIN')
  upsertConfig(
    @CurrentUser() user: SessionUser,
    @Body() dto: UpdateScoringConfigDto,
  ): Promise<ScoringRulesConfig> {
    return this.service.upsertConfig(user.tenantId, dto.rules as unknown as ScoringRulesConfig);
  }

  @Post('suggest')
  @Roles('ADMIN')
  @HttpCode(200)
  suggestConfig(
    @CurrentUser() user: SessionUser,
  ): Promise<{ proposed: ScoringRulesConfig; explanation: string[] }> {
    return this.service.suggestConfig(user.tenantId);
  }

  @Post('tune')
  @Roles('ADMIN')
  @HttpCode(200)
  tuneConfig(
    @CurrentUser() user: SessionUser,
    @Body() dto: TuneConfigDto,
  ): Promise<{ proposed: ScoringRulesConfig; changeLog: string[] }> {
    return this.service.tuneConfig(user.tenantId, dto.instruction);
  }
}
