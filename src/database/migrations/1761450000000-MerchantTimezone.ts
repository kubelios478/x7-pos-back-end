import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Zona horaria del comercio (IANA, p. ej. 'America/New_York'), para que "hoy" empiece a su
 * medianoche: hoy el ticket diario se reinicia a medianoche UTC.
 *
 * - merchant.timezone: NOT NULL, por defecto 'UTC' (el comportamiento actual). Un comercio
 *   con tienda online toma la zona de su tienda si Postgres la reconoce.
 * - onboarding_sessions.merchantTimezone: la zona elegida en el wizard antes de crear el
 *   comercio.
 *
 * El revert borra ambas columnas.
 */
export class MerchantTimezone1761450000000 implements MigrationInterface {
  name = 'MerchantTimezone1761450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "merchant" ADD "timezone" character varying(50) NOT NULL DEFAULT 'UTC'`,
    );
    await queryRunner.query(`
      UPDATE "merchant" m
      SET "timezone" = s."timezone"
      FROM (
        SELECT DISTINCT ON ("merchant_id") "merchant_id", "timezone"
        FROM "online_store"
        WHERE "timezone" IN (SELECT "name" FROM pg_timezone_names)
        ORDER BY "merchant_id", "id"
      ) s
      WHERE s."merchant_id" = m."id"`);
    await queryRunner.query(
      `ALTER TABLE "onboarding_sessions" ADD "merchantTimezone" character varying(50)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "onboarding_sessions" DROP COLUMN "merchantTimezone"`,
    );
    await queryRunner.query(`ALTER TABLE "merchant" DROP COLUMN "timezone"`);
  }
}
