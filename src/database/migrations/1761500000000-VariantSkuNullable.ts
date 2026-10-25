import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El SKU de una variante es opcional: el DTO ya lo declaraba así, pero la columna era
 * NOT NULL y crear una variante sin SKU respondía 500. No hay índices sobre la columna.
 *
 * El revert vuelve a exigirlo: las variantes sin SKU quedan con '' (no se puede inventar uno).
 */
export class VariantSkuNullable1761500000000 implements MigrationInterface {
  name = 'VariantSkuNullable1761500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "variant" ALTER COLUMN "sku" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "variant" SET "sku" = '' WHERE "sku" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "variant" ALTER COLUMN "sku" SET NOT NULL`,
    );
  }
}
