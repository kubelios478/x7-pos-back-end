import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega campos de detalle (name, price, description, image_url) y notas nullable
 * a qr_menu_item, así como la relación de qr_order_item hacia qr_menu_item (columna qr_menu_item_id + FK).
 *
 * down():
 * - Elimina la clave foránea FK_e4c5f81f078f8fcb1a1f63f3482 y la columna qr_menu_item_id de qr_order_item
 *   (se pierden los vínculos entre ítems de pedido y el ítem de menú).
 * - Restaura la restricción NOT NULL en la columna notes de qr_menu_item.
 * - Elimina las columnas name, price, description e image_url de qr_menu_item,
 *   destruyendo los datos almacenados en ellas.
 */
export class QrMenuItemDetails1793052708351 implements MigrationInterface {
  name = 'QrMenuItemDetails1793052708351';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "qr_menu_item"
            ADD "name" character varying(150)
        `);
    await queryRunner.query(`
            ALTER TABLE "qr_menu_item"
            ADD "price" numeric(12, 2) DEFAULT '0'
        `);
    await queryRunner.query(`
            ALTER TABLE "qr_menu_item"
            ADD "description" text
        `);
    await queryRunner.query(`
            ALTER TABLE "qr_menu_item"
            ADD "image_url" text
        `);
    await queryRunner.query(`
            ALTER TABLE "qr_order_item"
            ADD "qr_menu_item_id" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "qr_menu_item"
            ALTER COLUMN "notes" DROP NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "qr_order_item"
            ADD CONSTRAINT "FK_e4c5f81f078f8fcb1a1f63f3482" FOREIGN KEY ("qr_menu_item_id") REFERENCES "qr_menu_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "qr_order_item" DROP CONSTRAINT "FK_e4c5f81f078f8fcb1a1f63f3482"
        `);
    await queryRunner.query(`
            ALTER TABLE "qr_menu_item"
            ALTER COLUMN "notes"
            SET NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "qr_order_item" DROP COLUMN "qr_menu_item_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "qr_menu_item" DROP COLUMN "image_url"
        `);
    await queryRunner.query(`
            ALTER TABLE "qr_menu_item" DROP COLUMN "description"
        `);
    await queryRunner.query(`
            ALTER TABLE "qr_menu_item" DROP COLUMN "price"
        `);
    await queryRunner.query(`
            ALTER TABLE "qr_menu_item" DROP COLUMN "name"
        `);
  }
}
