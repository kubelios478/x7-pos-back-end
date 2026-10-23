import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * company.rut y merchant.rut (nombre chileno) pasan a tax_id: en EE. UU. guardan el EIN.
 *
 * El nombre del merchant ya no lleva el identificador ("Downtown (12-3456789)"): se agregaba
 * solo porque merchant.name era único en toda la base. La unicidad pasa a ser por empresa y
 * se quita el sufijo " (<tax_id>)" de los nombres existentes. Si quitarlo dejara dos
 * comercios con el mismo nombre en una empresa, la restricción nueva falla y la migración
 * entera se revierte.
 *
 * El revert vuelve a exigir nombres únicos globalmente, pero no restaura los sufijos.
 */
export class CompanyMerchantTaxId1761350000000 implements MigrationInterface {
  name = 'CompanyMerchantTaxId1761350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company" RENAME COLUMN "rut" TO "tax_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant" RENAME COLUMN "rut" TO "tax_id"`,
    );
    await queryRunner.query(`
      UPDATE "merchant"
      SET "name" = left("name", length("name") - length(' (' || "tax_id" || ')'))
      WHERE "tax_id" IS NOT NULL
        AND "tax_id" <> ''
        AND right("name", length(' (' || "tax_id" || ')')) = ' (' || "tax_id" || ')'`);
    await queryRunner.query(
      `ALTER TABLE "merchant" DROP CONSTRAINT IF EXISTS "UQ_e89bed75a5395a73cda0c558759"`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant" ADD CONSTRAINT "UQ_merchant_company_name" UNIQUE ("companyId", "name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "merchant" DROP CONSTRAINT "UQ_merchant_company_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant" ADD CONSTRAINT "UQ_e89bed75a5395a73cda0c558759" UNIQUE ("name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant" RENAME COLUMN "tax_id" TO "rut"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" RENAME COLUMN "tax_id" TO "rut"`,
    );
  }
}
