import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración inicial: alinea una BD creada antes de que existieran migraciones con las
 * entidades actuales. Recoge lo que hasta ahora se aplicaba a mano con scripts/*.sql
 * (rerouting de estaciones KDS, capacidad de reservas, delivery externo, índices).
 *
 * Es idempotente (IF NOT EXISTS y comprobaciones previas): en una BD local que ya tenga
 * estos cambios, por synchronize o por los scripts, no falla ni duplica nada.
 */
export class AlignSharedSchema1761170000000 implements MigrationInterface {
  name = 'AlignSharedSchema1761170000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- Reservas: capacidad por comercio y override de aforo ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reservation_settings" (
        "id" SERIAL NOT NULL,
        "merchant_id" integer NOT NULL,
        "seat_capacity" integer,
        "slot_interval_minutes" integer NOT NULL DEFAULT '15',
        "max_covers_per_slot" integer,
        "shifts" jsonb,
        "updated_by" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_e1a9715484b4a510e7920cdb5e1" UNIQUE ("merchant_id"),
        CONSTRAINT "PK_1e850361792d3197228afa1ce66" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "capacity_override_by" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "capacity_override_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_reservation_status_history_reservation_changed_at" ON "reservation_status_history" ("reservation_id", "changed_at")`,
    );

    // ---- KDS: numeración de estaciones, estación de respaldo y reglas de rerouting ----
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" ADD COLUMN IF NOT EXISTS "station_number" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" ADD COLUMN IF NOT EXISTS "backup_station_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" ADD COLUMN IF NOT EXISTS "max_active_tickets_capacity" integer NOT NULL DEFAULT '15'`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" ADD COLUMN IF NOT EXISTS "auto_reroute_on_offline" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" ADD COLUMN IF NOT EXISTS "auto_reroute_on_capacity" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" ADD COLUMN IF NOT EXISTS "fallback_action" character varying(50) NOT NULL DEFAULT 'BACKUP_STATION'`,
    );
    // scripts/migration-reroute-and-fallback.sql creaba esta FK con otro nombre: solo se
    // añade si la columna todavía no tiene ninguna.
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint c
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
          WHERE c.conrelid = 'kitchen_station'::regclass AND c.contype = 'f' AND a.attname = 'backup_station_id'
        ) THEN
          ALTER TABLE "kitchen_station" ADD CONSTRAINT "FK_5ec7e78e89629cd9ad98e9ff633"
            FOREIGN KEY ("backup_station_id") REFERENCES "kitchen_station"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$`);

    // ---- Delivery: repartidores externos (DoorDash Drive, Uber Direct) ----
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."delivery_assignments_assignment_type_enum" AS ENUM ('in_house', 'doordash_drive', 'uber_direct');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$`);
    await queryRunner.query(
      `ALTER TABLE "delivery_assignments" ADD COLUMN IF NOT EXISTS "assignment_type" "public"."delivery_assignments_assignment_type_enum" NOT NULL DEFAULT 'in_house'`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_assignments" ADD COLUMN IF NOT EXISTS "external_delivery_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_assignments" ADD COLUMN IF NOT EXISTS "external_tracking_url" character varying(2048)`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_assignments" ADD COLUMN IF NOT EXISTS "external_dsp_fee" numeric(12,2)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_delivery_assignments_external_delivery" ON "delivery_assignments" ("assignment_type", "external_delivery_id") WHERE "external_delivery_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6f1df8583adfd346d8a8c4e425" ON "delivery_tracking" ("delivery_assignment_id", "recorded_at")`,
    );

    // Ciclo de vida del repartidor: 'unassigned' pasa a 'pending' y aparece 'failed'
    // (lo que hacía scripts/delivery-assignment-driver-lifecycle.sql). Solo si el enum aún
    // tiene la forma antigua.
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'delivery_assignments_delivery_status_enum' AND e.enumlabel = 'unassigned'
        ) OR NOT EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'delivery_assignments_delivery_status_enum' AND e.enumlabel = 'failed'
        ) THEN
          UPDATE "delivery_assignments" SET "delivery_status" = 'pending' WHERE "delivery_status"::text = 'unassigned';
          ALTER TYPE "public"."delivery_assignments_delivery_status_enum" RENAME TO "delivery_assignments_delivery_status_enum_old";
          CREATE TYPE "public"."delivery_assignments_delivery_status_enum" AS ENUM ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled');
          ALTER TABLE "delivery_assignments" ALTER COLUMN "delivery_status" DROP DEFAULT;
          ALTER TABLE "delivery_assignments" ALTER COLUMN "delivery_status" TYPE "public"."delivery_assignments_delivery_status_enum"
            USING "delivery_status"::text::"public"."delivery_assignments_delivery_status_enum";
          DROP TYPE "public"."delivery_assignments_delivery_status_enum_old";
        END IF;
      END $$`);
    await queryRunner.query(
      `ALTER TABLE "delivery_assignments" ALTER COLUMN "delivery_status" SET DEFAULT 'pending'`,
    );
    // collaborator_contracts.overtime_multiplier ya tiene DEFAULT 1.5: TypeORM lo sigue
    // listando en migration:generate por cómo compara defaults numeric; no requiere cambio.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Deshace lo añadido. El enum de delivery_status se deja como está: volver a
    // 'unassigned' no tiene sentido con el código actual.
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_6f1df8583adfd346d8a8c4e425"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_delivery_assignments_external_delivery"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_assignments" DROP COLUMN IF EXISTS "external_dsp_fee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_assignments" DROP COLUMN IF EXISTS "external_tracking_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_assignments" DROP COLUMN IF EXISTS "external_delivery_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_assignments" DROP COLUMN IF EXISTS "assignment_type"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."delivery_assignments_assignment_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" DROP CONSTRAINT IF EXISTS "FK_5ec7e78e89629cd9ad98e9ff633"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" DROP COLUMN IF EXISTS "fallback_action"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" DROP COLUMN IF EXISTS "auto_reroute_on_capacity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" DROP COLUMN IF EXISTS "auto_reroute_on_offline"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" DROP COLUMN IF EXISTS "max_active_tickets_capacity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" DROP COLUMN IF EXISTS "backup_station_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" DROP COLUMN IF EXISTS "station_number"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_reservation_status_history_reservation_changed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP COLUMN IF EXISTS "capacity_override_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP COLUMN IF EXISTS "capacity_override_by"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "reservation_settings"`);
  }
}
