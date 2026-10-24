import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Los pedidos para llevar y delivery no tienen mesa: orders.table_id pasa a aceptar NULL.
 *
 * El revert falla si ya hay pedidos sin mesa; habría que asignarles una antes.
 */
export class OrderTableOptional1761250000000 implements MigrationInterface {
  name = 'OrderTableOptional1761250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "table_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "table_id" SET NOT NULL`,
    );
  }
}
