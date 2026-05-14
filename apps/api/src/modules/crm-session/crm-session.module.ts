import { Module } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { AgentService } from '../ai/agent.service';
import { CrmSessionController } from './crm-session.controller';
import { CrmSessionGateway } from './crm-session.gateway';
import { CrmSessionService } from './crm-session.service';

@Module({
  controllers: [CrmSessionController],
  providers: [CrmSessionService, CrmSessionGateway, AgentService, PrismaService],
  exports: [CrmSessionGateway, AgentService],
})
export class CrmSessionModule {}
