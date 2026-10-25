import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Las notas de un ítem de pedido QR son opcionales: el DTO ya lo declaraba así, pero la
 * columna era NOT NULL y crear un ítem sin notas respondía 500.
 *
 * El revert vuelve a exigirlas: los ítems sin notas quedan con ''.
 */
export class QrOrderItemNotesNullable1761510000000 implements MigrationInterface {
  name = 'QrOrderItemNotesNullable1761510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "qr_order_item" ALTER COLUMN "notes" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "qr_order_item" SET "notes" = '' WHERE "notes" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order_item" ALTER COLUMN "notes" SET NOT NULL`,
    );
  }
}
