import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';

/** Junto al .js compilado: nest-cli.json copia el .sql a dist/. */
export const REFERENCE_DATA_SQL = join(__dirname, 'reference-data.sql');

/**
 * Carga los datos de referencia (planes, aplicaciones, features y textos de onboarding) en
 * una sola transacción. Idempotente: se puede correr en cada deploy.
 */
export async function seedReferenceData(dataSource: DataSource): Promise<void> {
  const sql = readFileSync(REFERENCE_DATA_SQL, 'utf8');
  await dataSource.transaction(async (manager) => {
    await manager.query(sql);
  });
}
