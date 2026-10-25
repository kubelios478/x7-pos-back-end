import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Índices únicos parciales que respaldan en la base lo que el código ya evita con bloqueos:
 *
 * - un solo turno de caja OPEN por cajón (antes dos aperturas simultáneas podían dejar dos);
 * - una sola fila de stock activa por producto + variante + ubicación. NULLS NOT DISTINCT
 *   (Postgres 15+) hace que un producto sin variante (variantId NULL) tampoco se repita;
 * - una sola fila de stock activa por materia prima + ubicación.
 *
 * Son parciales (solo filas OPEN / activas): los turnos cerrados y las filas de stock
 * inactivas, que el código reactiva, no cuentan. Si la base ya tuviera duplicados, el
 * CREATE falla y la migración entera se revierte sin tocar datos.
 */
export class UniqueOpenShiftAndStockRows1761400000000 implements MigrationInterface {
  name = 'UniqueOpenShiftAndStockRows1761400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_cash_shifts_open_per_drawer"
      ON "cash_shifts" ("cash_drawer_id")
      WHERE "status" = 'OPEN'`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_stock_item_product_variant_location"
      ON "stock_item" ("productId", "variantId", "locationId") NULLS NOT DISTINCT
      WHERE "isActive" AND "productId" IS NOT NULL`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_stock_item_supply_location"
      ON "stock_item" ("supply_id", "locationId")
      WHERE "isActive" AND "supply_id" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_stock_item_supply_location"`);
    await queryRunner.query(
      `DROP INDEX "UQ_stock_item_product_variant_location"`,
    );
    await queryRunner.query(`DROP INDEX "UQ_cash_shifts_open_per_drawer"`);
  }
}
