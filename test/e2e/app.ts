import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { assertLocalDatabase } from './local-database.guard';
import { seedSubscriptionCatalog } from './fixtures';

export interface E2eApp {
  app: NestExpressApplication;
  dataSource: DataSource;
  planId: number;
}

/** Levanta la app completa sobre un esquema vacío, recreado desde las entidades. */
export async function createE2eApp(): Promise<E2eApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: ['error'],
  });
  configureApp(app, new Logger('E2E'));

  // Segunda comprobación, sobre la conexión real, antes de borrar nada.
  const dataSource = app.get(DataSource);
  const options = dataSource.options as {
    host?: string;
    port?: number;
    database?: string;
  };
  assertLocalDatabase(options);

  // Las migraciones no crean el esquema desde cero (la primera alinea uno existente).
  await dataSource.synchronize(true);
  const planId = await seedSubscriptionCatalog(dataSource);

  await app.init();
  return { app, dataSource, planId };
}
