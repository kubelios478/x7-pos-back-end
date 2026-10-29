// src/main.ts
import './polyfill';
// .env antes que AppModule: algunos módulos leen NODE_ENV al importarse (isDevelopmentEnv).
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { parseCorsOrigins } from './common/security/http-security';
import { configureApp } from './app.setup';
import { isSwaggerEnabled } from './config/environment';
import { CorsIoAdapter } from './realtime/adapters/cors-io.adapter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { RedisIoAdapter } from './realtime/adapters/redis-io.adapter';
import { errorMessage, errorStack } from './common/utils/log-error.util';
import * as fs from 'fs';

const logger = new Logger('Bootstrap');

// Safe handling of fatal exceptions to avoid spamming the Railway logger
process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught exception (fatal): ${err.message}`, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error(
    `Unhandled rejection: ${errorMessage(reason)}`,
    errorStack(reason),
  );
});

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // It also preserves the raw body in `req.rawBody` (the JSON is still parsed the same):
    // The distribution webhooks verify the HMAC signature on the exact bytes received.
    rawBody: true,
    logger: isProduction
      ? ['error', 'warn']
      : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  configureApp(app, logger);

  // SIGTERM (redeploy en Railway): Nest cierra HTTP, WebSockets y el pool de la base
  // antes de salir, en lugar de cortarlos.
  app.enableShutdownHooks();

  // Swagger: siempre en desarrollo; en producción solo con SWAGGER_ENABLED=true.
  if (isSwaggerEnabled()) {
    const config = new DocumentBuilder()
      .setTitle('X7-POS APIs')
      .setDescription('Authentication and user management documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, config),
      {
        swaggerOptions: {
          tagsSorter: 'alpha', // Sort the tags alphabetically
          operationsSorter: 'alpha', // Sort the endpoints alphabetically
          docExpansion: 'none', // 'none' It collapses everything by default (tags and routes)
        },
      },
    );
  }

  // WebSockets: same allowed origins as HTTP unless WS_CORS_ORIGIN says otherwise
  const wsOrigins = parseCorsOrigins(
    process.env.WS_CORS_ORIGIN ?? process.env.CORS_ORIGINS,
  );
  let wsAdapterSet = false;
  const wsRedisEnabled =
    (process.env.WS_REDIS_ENABLED ?? '').toLowerCase() === 'true';
  const redisUrl = process.env.REDIS_URL;
  if (wsRedisEnabled && redisUrl) {
    try {
      const redisAdapter = new RedisIoAdapter(app, redisUrl, wsOrigins);
      await redisAdapter.connectToRedis();
      app.useWebSocketAdapter(redisAdapter);
      wsAdapterSet = true;
      logger.log('Redis WebSocket Adapter initialized successfully.');
    } catch (redisError) {
      logger.error('Error connecting Redis WebSocket Adapter:', redisError);
    }
  }
  if (!wsAdapterSet) {
    app.useWebSocketAdapter(new CorsIoAdapter(app, wsOrigins));
  }

  // Ensure the uploads folder exists before serving static files
  const uploadsPath = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  // Signed contracts used to live here; they are personal data and are no longer public
  // (served through signed links, see contract-document-url.ts).
  app.use('/uploads/contracts', (_req: Request, res: Response) =>
    res.status(404).end(),
  );
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });

  // Capture the port assigned by Railway
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Application running on port: ${port}`);
}

bootstrap().catch((err: Error) => {
  logger.error('Error starting application', err.stack || err.message);
  process.exit(1);
});
