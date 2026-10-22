import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * DataSource para la CLI de TypeORM (migration:generate / run / revert / show).
 *
 * Usa las mismas variables DB_* que app.module y trabaja sobre el código compilado en dist/:
 * los scripts de package.json compilan antes de invocar la CLI y cargan el .env con
 * `node --env-file`.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Las entidades siguen dos convenciones de nombre: foo.entity.ts y foo-entity.ts.
  entities: [__dirname + '/../**/*{.entity,-entity}.js'],
  migrations: [__dirname + '/migrations/*.js'],
  migrationsTableName: 'migrations',
  synchronize: false,
});
