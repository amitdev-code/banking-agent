import { Module } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { AiModule } from '../ai/ai.module';
import { CrmController } from './crm.controller';
import { CrmGateway } from './crm.gateway';
import { CrmService } from './crm.service';

@Module({
  imports: [AiModule],
  controllers: [CrmController],
  providers: [CrmService, CrmGateway, PrismaService],
  exports: [CrmGateway],
})
export class CrmModule {}
