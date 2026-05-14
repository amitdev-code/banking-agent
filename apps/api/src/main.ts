import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { CrmGateway } from './modules/crm/crm.gateway';
import { CrmSessionGateway } from './modules/crm-session/crm-session.gateway';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const PgSession = connectPgSimple(session);

  const sessionMiddleware = session({
    store: new PgSession({
      conString: process.env['DATABASE_URL'],
      tableName: 'user_sessions',
      createTableIfMissing: true,
    }),
    secret: process.env['SESSION_SECRET'] ?? 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env['NODE_ENV'] === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: process.env['NODE_ENV'] === 'production' ? 'strict' : 'lax',
    },
  });

  app.use(sessionMiddleware);

  // Wire session middleware into Socket.io
  const gateway = app.get(CrmGateway);
  gateway.setSessionMiddleware(sessionMiddleware);
  const chatGateway = app.get(CrmSessionGateway);
  chatGateway.setSessionMiddleware(sessionMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: process.env['WEB_URL'] ?? 'http://localhost:3000',
    credentials: true,
  });

  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  await app.listen(port);

  console.log(`API running on http://localhost:${port}`);
}

void bootstrap();
