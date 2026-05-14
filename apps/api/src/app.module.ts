import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { PrismaService } from './database/prisma.service';
import { PiiMaskingInterceptor } from './common/interceptors/pii-masking.interceptor';
import { SessionGuard } from './common/guards/session.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantResolutionMiddleware } from './common/middleware/tenant-resolution.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { CustomerModule } from './modules/customer/customer.module';
import { CrmModule } from './modules/crm/crm.module';
import { CrmSessionModule } from './modules/crm-session/crm-session.module';
import { ScoringConfigModule } from './modules/scoring-config/scoring-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    CustomerModule,
    CrmModule,
    CrmSessionModule,
    ScoringConfigModule,
  ],
  providers: [
    PrismaService,
    { provide: APP_INTERCEPTOR, useClass: PiiMaskingInterceptor },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantResolutionMiddleware).forRoutes('*');
  }
}
