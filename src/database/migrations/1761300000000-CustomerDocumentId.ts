import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * customer.rut (identificador fiscal chileno, obligatorio) pasa a customer.document_id,
 * opcional: en EE. UU. los clientes de un restaurante no tienen identificador fiscal.
 *
 * El revert vuelve a exigir el valor: rellena con '' los clientes sin documento.
 */
export class CustomerDocumentId1761300000000 implements MigrationInterface {
  name = 'CustomerDocumentId1761300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer" RENAME COLUMN "rut" TO "document_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer" ALTER COLUMN "document_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "customer" SET "document_id" = '' WHERE "document_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer" ALTER COLUMN "document_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer" RENAME COLUMN "document_id" TO "rut"`,
    );
  }
}
