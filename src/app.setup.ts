// src/app.setup.ts
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { useContainer, type ValidationError } from 'class-validator';
import { AppModule } from './app.module';
import { configureHttpSecurity } from './common/security/http-security';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';

/**
 * Configuración HTTP común a main.ts y a los tests e2e: prefijo, seguridad, validación
 * y filtros. Lo que solo tiene sentido en el servidor real (Swagger, WebSockets,
 * archivos estáticos, listen) queda en main.ts.
 */
export function configureApp(
  app: NestExpressApplication,
  logger: Logger,
): void {
  // Habilitar la resolución de dependencias para class-validator
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.setGlobalPrefix('api');

  // trust proxy, security headers and CORS (CORS_ORIGINS); before any route, Swagger included
  configureHttpSecurity(app, logger);

  // ValidationPipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const extractErrors = (errs: ValidationError[]): string[] => {
          const res: string[] = [];
          for (const err of errs) {
            if (err.constraints) {
              res.push(...Object.values(err.constraints));
            }
            if (err.children && err.children.length > 0) {
              res.push(...extractErrors(err.children));
            }
            if (
              !err.constraints &&
              (!err.children || err.children.length === 0)
            ) {
              res.push(`${err.property} has invalid value`);
            }
          }
          return res;
        };
        const messages = extractErrors(errors);
        return new BadRequestException({
          message:
            messages.length > 1 ? messages : messages[0] || 'Validation error',
          errors: messages,
        });
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new ValidationExceptionFilter());
}
