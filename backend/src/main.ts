import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { WsService } from './websocket/ws.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // ── Security headers ──
  app.use(helmet());

  // ── Cookie parser (required for httpOnly refresh token cookies) ──
  app.use(cookieParser());

  // ── HTTP request logging ──
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // ── CORS ──
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Global API prefix ──
  app.setGlobalPrefix('api/v1');

  // ── Global validation pipe (class-validator + class-transformer) ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global exception filter ──
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Start HTTP server ──
  const port = process.env.PORT || 4000;
  await app.listen(port);

  // ── Attach raw WebSocket server to the same HTTP server ──
  const httpServer = app.getHttpServer();
  const wsService = app.get(WsService);
  wsService.init(httpServer);

  logger.log(`HTTP  → http://localhost:${port}/api/v1`);
  logger.log(`WS    → ws://localhost:${port}`);
  logger.log(`ENV   → ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
