import { Module } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { ScoringConfigController } from './scoring-config.controller';
import { ScoringConfigService } from './scoring-config.service';

@Module({
  controllers: [ScoringConfigController],
  providers: [ScoringConfigService, PrismaService],
  exports: [ScoringConfigService],
})
export class ScoringConfigModule {}
