import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { join } from 'path';
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

/**
 * Borra la base desechable y la crea con las migraciones, el mismo camino que una base
 * nueva de producción (no synchronize: así corren InitialSchema y sus índices parciales).
 * Conexión aparte porque la de la app busca migraciones *.js compiladas, que bajo ts-jest
 * no existen.
 */
export async function migrateE2eDatabase(): Promise<void> {
  const migrator = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    migrations: [join(__dirname, '../../src/database/migrations/*.ts')],
    migrationsTableName: 'migrations',
  });
  assertLocalDatabase(
    migrator.options as { host?: string; port?: number; database?: string },
  );
  await migrator.initialize();
  try {
    await migrator.dropDatabase();
    const applied = await migrator.runMigrations({ transaction: 'all' });
    if (applied.length === 0) {
      throw new Error('E2E: no migrations ran; check the migrations path');
    }
  } finally {
    await migrator.destroy();
  }
}

/** Levanta la app completa sobre una base vacía, creada con las migraciones. */
export async function createE2eApp(): Promise<E2eApp> {
  await migrateE2eDatabase();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: ['error'],
  });
  configureApp(app, new Logger('E2E'));

  // Segunda comprobación, sobre la conexión de la app, antes de escribir datos.
  const dataSource = app.get(DataSource);
  const options = dataSource.options as {
    host?: string;
    port?: number;
    database?: string;
  };
  assertLocalDatabase(options);

  const planId = await seedSubscriptionCatalog(dataSource);

  await app.init();
  return { app, dataSource, planId };
}
