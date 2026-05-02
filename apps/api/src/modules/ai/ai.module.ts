import { Module } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { CrmGateway } from '../crm/crm.gateway';
import { AiService } from './ai.service';

@Module({
  providers: [AiService, PrismaService, CrmGateway],
  exports: [AiService],
})
export class AiModule {}
