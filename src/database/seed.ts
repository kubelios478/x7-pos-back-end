import 'reflect-metadata';
import dataSource from './data-source';
import { seedReferenceData } from './seeds/reference-data.seed';
import { seedAdmin } from './seeds/admin.seed';

/**
 * Datos que necesita cualquier base nueva, producción incluida (nunca datos demo):
 *   npm run seed:reference   planes, aplicaciones y features con sus ids fijos
 *   npm run seed:admin       el primer portal_admin (SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD)
 * Usan la base de DB_* (.env si existe; si no, las variables del entorno).
 */
async function main(command: string | undefined): Promise<void> {
  if (command !== 'reference' && command !== 'admin') {
    throw new Error('Usage: node dist/database/seed.js <reference|admin>');
  }
  await dataSource.initialize();
  try {
    if (command === 'reference') {
      await seedReferenceData(dataSource);
      console.log('Reference data loaded.');
      return;
    }
    const result = await seedAdmin(dataSource, {
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
    });
    console.log(
      result.created
        ? `portal_admin ${result.email} created (id ${result.userId}).`
        : `A portal_admin already exists (${result.existingEmail}); nothing was created.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main(process.argv[2]).catch((err: Error) => {
  console.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
