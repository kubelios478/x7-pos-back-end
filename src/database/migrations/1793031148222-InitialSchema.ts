import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Esquema completo desde una base vacía: reemplaza las 8 migraciones anteriores, que
 * partían de una base creada antes de que existieran migraciones (creaban 1 tabla de 124).
 *
 * Generada con migration:generate contra una base vacía, más lo que el generador no ve:
 * los 3 índices únicos parciales del final de up(), que las entidades declaran con
 * synchronize: false (un turno de caja OPEN por cajón y una fila de stock activa por
 * producto + variante + ubicación y por materia prima + ubicación).
 *
 * En una base que ya tenía las migraciones anteriores (la compartida, las locales) no se
 * ejecuta: se marca como aplicada con `npm run typeorm -- migration:run --fake`
 * (ver docs/database.md).
 */

export class InitialSchema1793031148222 implements MigrationInterface {
  name = 'InitialSchema1793031148222';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "onboarding_sessions" ("id" uuid NOT NULL, "step" integer NOT NULL DEFAULT '1', "selectedTierId" character varying(50), "planId" integer, "legalBusinessName" character varying(150), "taxId" character varying(20), "primaryIndustry" character varying(100), "registeredAddress" character varying(200), "city" character varying(80), "state" character varying(10), "zipCode" character varying(20), "merchantName" character varying(100), "merchantEmail" character varying(150), "merchantPhone" character varying(30), "merchantAddress" character varying(200), "merchantCity" character varying(80), "merchantState" character varying(80), "merchantCountry" character varying(80), "merchantTimezone" character varying(50), "firstName" character varying(80), "lastName" character varying(80), "jobTitle" character varying(100), "workEmail" character varying(150), "termsAccepted" boolean NOT NULL DEFAULT false, "completed" boolean NOT NULL DEFAULT false, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9553e455cbfe1aeebc6f43ae379" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."online_store_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "online_store" ("id" SERIAL NOT NULL, "merchant_id" integer NOT NULL, "subdomain" character varying(100) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "theme" character varying(100) NOT NULL, "currency" character varying(10) NOT NULL, "timezone" character varying(50) NOT NULL, "status" "public"."online_store_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2439e5ffeeadae88a7d272ac5c5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dda7e2b97d9553c7240e7b91a1" ON "online_store" ("merchant_id", "status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "floor_plan" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "width" integer NOT NULL, "height" integer NOT NULL, "outline" text, "status" character varying(50) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "merchant_id" integer, CONSTRAINT "PK_d16cdd3e52f897258d1587ef65c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "floor_zone" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "color" character varying(50), "area" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "status" character varying(50) NOT NULL, "merchant_id" integer, "floor_plan_id" integer, CONSTRAINT "PK_118fee5058672fbb6f88608644f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "table" ("id" SERIAL NOT NULL, "merchant_id" integer NOT NULL, "number" character varying(50) NOT NULL, "capacity" integer NOT NULL, "status" character varying(50) NOT NULL, "location" character varying(100) NOT NULL, "rotation" integer DEFAULT '0', "shape" character varying(50), "width" integer, "height" integer, "pos_x" integer, "pos_y" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "parent_table_id" integer, "tableStatus" character varying(50), "floor_zone_id" integer, "floor_plan_id" integer, CONSTRAINT "PK_28914b55c485fc2d7a101b1b2a4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f09bd9855ba0e2073f33040061" ON "table" ("merchant_id", "number") `,
    );
    await queryRunner.query(
      `CREATE TABLE "table_assignments" ("id" SERIAL NOT NULL, "shiftId" integer NOT NULL, "tableId" integer NOT NULL, "collaboratorId" integer NOT NULL, "assignedAt" TIMESTAMP NOT NULL, "releasedAt" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "status" character varying(50) NOT NULL, CONSTRAINT "PK_0fc92ec783cae6f7212aa7511a1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4cd151d51611d0dddb7459c4db" ON "table_assignments" ("tableId", "shiftId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."collaborator_role_enum" AS ENUM('waiter', 'cook', 'bartender', 'host', 'cashier', 'manager', 'busser', 'delivery')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."collaborator_status_enum" AS ENUM('active', 'inactive', 'vacation', 'deleted', 'activo', 'vacaciones')`,
    );
    await queryRunner.query(
      `CREATE TABLE "collaborator" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "merchant_id" integer NOT NULL, "name" character varying(150) NOT NULL, "employeeId" character varying(60), "department" character varying(80), "role" "public"."collaborator_role_enum" NOT NULL, "status" "public"."collaborator_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "shift_id" integer, CONSTRAINT "PK_aa48142926d7bdb485d21ad2696" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2b516ff163b9e85cb9adecc76c" ON "collaborator" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_assignment_roleduringshift_enum" AS ENUM('waiter', 'cook', 'bartender', 'host', 'cashier', 'manager', 'busser', 'delivery')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_assignment_status_enum" AS ENUM('active', 'completed', 'cancelled', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "shift_assignment" ("id" SERIAL NOT NULL, "shiftId" integer NOT NULL, "collaboratorId" integer NOT NULL, "roleDuringShift" "public"."shift_assignment_roleduringshift_enum" NOT NULL DEFAULT 'waiter', "startTime" TIMESTAMP NOT NULL, "endTime" TIMESTAMP, "status" "public"."shift_assignment_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "PK_035a580d2f4cd37fa971d6976a5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_role_enum" AS ENUM('waiter', 'cook', 'bartender', 'host', 'cashier', 'manager', 'busser', 'delivery')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_status_enum" AS ENUM('active', 'completed', 'cancelled', 'deleted', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "shift" ("id" SERIAL NOT NULL, "merchantId" integer NOT NULL, "startTime" TIMESTAMP NOT NULL, "endTime" TIMESTAMP, "role" "public"."shift_role_enum" NOT NULL DEFAULT 'waiter', "status" "public"."shift_status_enum" NOT NULL DEFAULT 'active', "current_balance" numeric(12,2) NOT NULL DEFAULT '0', CONSTRAINT "PK_53071a6485a1e9dc75ec3db54b9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."cash_shifts_status_enum" AS ENUM('OPEN', 'CLOSED', 'DISCREPANCY', 'AUDITED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "cash_shifts" ("id" SERIAL NOT NULL, "merchant_id" integer NOT NULL, "cash_drawer_id" integer NOT NULL, "opened_by" integer NOT NULL, "closed_by" integer, "opening_balance" numeric(12,2) NOT NULL, "system_amount" numeric(12,2), "declared_amount" numeric(12,2), "difference" numeric(12,2), "status" "public"."cash_shifts_status_enum" NOT NULL DEFAULT 'OPEN', "opened_at" TIMESTAMP NOT NULL DEFAULT now(), "closed_at" TIMESTAMP, CONSTRAINT "PK_3040bddb5b101defd8eb23d3a8c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "cash_drawer" ("id" SERIAL NOT NULL, "merchant_id" integer NOT NULL, "shift_id" integer NOT NULL, "opening_balance" numeric(12,2) NOT NULL, "current_balance" numeric(12,2) NOT NULL, "closing_balance" numeric(12,2), "opened_by" integer NOT NULL, "closed_by" integer, "status" character varying(50) NOT NULL DEFAULT 'Open', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4b730ea0c639813b8e228a01b04" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."cash_transactions_type_enum" AS ENUM('opening', 'sale', 'refund', 'tip', 'withdrawal', 'adjustment_up', 'adjustment_down', 'close', 'pause', 'unpause')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."cash_transactions_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "cash_transactions" ("id" SERIAL NOT NULL, "cash_drawer_id" integer NOT NULL, "order_id" integer, "type" "public"."cash_transactions_type_enum" NOT NULL, "amount" numeric(12,2) NOT NULL, "collaborator_id" integer NOT NULL, "status" "public"."cash_transactions_status_enum" NOT NULL DEFAULT 'active', "notes" text, "shift_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_df7299c9dda9bf4b78d874e588e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."loyalty_point_transactions_source_enum" AS ENUM('ORDER', 'PAYMENT', 'REFERRAL', 'PROMOTION', 'MANUAL_ADJUST', 'REDEMPTION', 'ORDER_REVERSAL', 'REFUND_REVERSAL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "loyalty_point_transactions" ("id" BIGSERIAL NOT NULL, "description" text, "source" "public"."loyalty_point_transactions_source_enum" NOT NULL DEFAULT 'ORDER', "points" integer NOT NULL, "loyalty_customer_id" bigint NOT NULL, "order_id" integer, "payment_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_7c61d857b70bf9f4c4954362a4a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "loyalty_rewards_redemptions" ("id" BIGSERIAL NOT NULL, "loyalty_customer_id" bigint NOT NULL, "reward_id" integer NOT NULL, "order_id" integer NOT NULL, "redeemed_points" integer NOT NULL, "redeemed_at" TIMESTAMP NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_ca2484171308704625099638a9b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."loyalty_coupons_status_enum" AS ENUM('ACTIVE', 'REDEEMED', 'EXPIRED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "loyalty_coupons" ("id" BIGSERIAL NOT NULL, "loyalty_customer_id" bigint NOT NULL, "code" character varying(50) NOT NULL, "reward_id" integer NOT NULL, "order_id" integer, "status" "public"."loyalty_coupons_status_enum" NOT NULL DEFAULT 'ACTIVE', "discount_value" numeric(10,2) NOT NULL, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "redeemed_at" TIMESTAMP, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_93b9b75e26641120058d8547bcd" UNIQUE ("code"), CONSTRAINT "PK_11e7016ac5994dee97f2f8c8dbe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "loyalty_customers" ("id" BIGSERIAL NOT NULL, "loyalty_program_id" integer NOT NULL, "customer_id" integer NOT NULL, "current_points" integer NOT NULL DEFAULT '0', "lifetime_points" integer NOT NULL DEFAULT '0', "loyalty_tier_id" integer, "is_active" boolean NOT NULL DEFAULT true, "joined_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_065f096588eb9336229a9178e86" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "loyalty_tiers" ("id" SERIAL NOT NULL, "loyalty_program_id" integer NOT NULL, "name" character varying(100) NOT NULL, "level" integer, "min_points" integer NOT NULL, "multiplier" numeric(10,2) NOT NULL, "benefits" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a669fdbbbe951b211e403c977a6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."loyalty_programs_points_rounding_mode_enum" AS ENUM('FLOOR', 'NEAREST')`,
    );
    await queryRunner.query(
      `CREATE TABLE "loyalty_programs" ("id" SERIAL NOT NULL, "merchantId" integer NOT NULL, "name" character varying(100) NOT NULL, "description" text, "is_active" boolean NOT NULL DEFAULT true, "points_per_currency" numeric(10,2) NOT NULL DEFAULT '0', "redeem_points_per_currency" numeric(10,2) NOT NULL DEFAULT '0', "min_points_to_redeem" integer NOT NULL DEFAULT '0', "earn_rate_percent" numeric(5,2), "points_rounding_mode" "public"."loyalty_programs_points_rounding_mode_enum" NOT NULL DEFAULT 'NEAREST', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9911f010986d7730cc744f91ff4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."loyalty_reward_type_enum" AS ENUM('DISCOUNT', 'CASHBACK', 'FREE_ITEM', 'STORE_CREDIT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "loyalty_reward" ("id" SERIAL NOT NULL, "loyalty_program_id" integer NOT NULL, "type" "public"."loyalty_reward_type_enum" NOT NULL DEFAULT 'CASHBACK', "name" character varying(100) NOT NULL, "description" text NOT NULL, "cost_points" integer NOT NULL, "discount_value" numeric(10,2), "cashback_value" numeric(10,2), "free_product_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_3727fa4ca8388ead184d387ddc7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "category" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "merchantId" integer NOT NULL, "parentId" integer, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_location" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "code" character varying(50), "address" character varying(255), "is_main_storage" boolean NOT NULL DEFAULT false, "merchantId" integer NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_adf770067d0df1421f525fa25cc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "raw_material_categories" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "name" character varying(255) NOT NULL, "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_de2791f71671c8dcb0d1d5e190d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_32bfd864523c486ef20c272d6f" ON "raw_material_categories" ("company_id", "name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "supply_suppliers" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "supply_id" integer, "supplier_id" integer, CONSTRAINT "PK_ed3703287381da35e2cffb08c5a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f72b3017acfc8a1b9d0b2fc9a4" ON "supply_suppliers" ("supply_id", "supplier_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."supplies_unit_enum" AS ENUM('gram', 'milliliter', 'unit')`,
    );
    await queryRunner.query(
      `CREATE TABLE "supplies" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "code" character varying(80) NOT NULL, "sku" character varying(80), "name" character varying(255) NOT NULL, "category_id" integer, "unit" "public"."supplies_unit_enum" NOT NULL DEFAULT 'unit', "purchase_unit" character varying(50), "consumption_unit" character varying(50), "conversion_factor" numeric(14,4) NOT NULL DEFAULT '1', "cost_per_unit" numeric(14,4), "description" text, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_49c0dc272c9fcf2723bdfd48be1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3b1b827cc8a4073044ca743e8f" ON "supplies" ("company_id", "code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "purchase_order_item" ("id" SERIAL NOT NULL, "purchaseOrderId" integer NOT NULL, "productId" integer, "variantId" integer, "quantity" integer NOT NULL DEFAULT '0', "unitPrice" numeric(10,2) NOT NULL DEFAULT '0', "totalPrice" numeric(10,2) NOT NULL DEFAULT '0', "raw_material_id" integer, "purchase_unit" character varying(50), "quantity_ordered" numeric(14,4), "unit_cost" numeric(14,4), "tax_amount" numeric(12,2) DEFAULT '0', "received_quantity" integer NOT NULL DEFAULT '0', "locationId" integer, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_f3eaf81afb216ae78a59cc19503" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."purchase_order_status_enum" AS ENUM('DRAFT', 'SENT', 'PENDING', 'COMPLETED', 'RECEIVED', 'PARTIALLY_RECEIVED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "purchase_order" ("id" SERIAL NOT NULL, "merchantId" integer NOT NULL, "supplierId" integer NOT NULL, "order_date" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."purchase_order_status_enum" NOT NULL DEFAULT 'PENDING', "total_amount" numeric(10,2) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_ad3e1c7b862f4043b103a6c8c60" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "supplier" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "name" character varying(255) NOT NULL, "tax_id" character varying(50), "email" character varying(150), "phone" character varying(50), "address" text, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2bc0d2cab6276144d2ff98a2828" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "supplier_invoice_items" ("id" SERIAL NOT NULL, "invoice_id" integer NOT NULL, "product_id" integer, "variant_id" integer, "description" character varying(255) NOT NULL, "quantity" numeric(15,4) NOT NULL, "unit_price" numeric(15,4) NOT NULL, "line_subtotal" numeric(15,2) NOT NULL, "tax_amount" numeric(15,2) NOT NULL DEFAULT '0', "line_total" numeric(15,2) NOT NULL, "deleted_at" TIMESTAMP, CONSTRAINT "PK_fcc1294c12b69b3ab3c0a33d12c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "supplier_invoices" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "supplier_id" integer NOT NULL, "invoice_number" character varying(100) NOT NULL, "invoice_date" date NOT NULL, "due_date" date NOT NULL, "subtotal" numeric(15,2) NOT NULL, "tax_total" numeric(15,2) NOT NULL DEFAULT '0', "total_amount" numeric(15,2) NOT NULL, "paid_amount" numeric(15,2) NOT NULL DEFAULT '0', "balance_due" numeric(15,2) NOT NULL, "status" character varying(50) NOT NULL DEFAULT 'pending', "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "inventory_received_at" TIMESTAMP, CONSTRAINT "PK_08f98a1a117d65ab2f4452247a3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_movement_type_enum" AS ENUM('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'WASTE', 'SALE', 'OUT_FOR_SALE', 'PURCHASE_ENTRY', 'RETURN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_movement" ("id" SERIAL NOT NULL, "stockItemId" integer NOT NULL, "quantity" integer NOT NULL, "type" "public"."stock_movement_type_enum" NOT NULL DEFAULT 'IN', "reference" character varying, "reason" character varying, "merchantId" integer NOT NULL, "order_id" integer, "shift_id" integer, "supplier_invoice_id" integer, "source_location_id" integer, "destination_location_id" integer, "created_by" character varying(255), "movement_type" character varying(50), "unit_cost" numeric(14,4), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_9fe1232f916686ae8cf00294749" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_96249b84ebaa98a2a796f2eae1" ON "stock_movement" ("supplier_invoice_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3941af41b7cdd5178fe804b092" ON "stock_movement" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_item" ("id" SERIAL NOT NULL, "currentQty" integer NOT NULL, "minimum_qty" integer, "productId" integer, "variantId" integer, "supply_id" integer, "locationId" integer NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "weighted_average_unit_cost" numeric(14,4), CONSTRAINT "PK_0b51047279d22d97442d46dfee8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."variant_stock_basis_kind_enum" AS ENUM('MASS_GRAM', 'VOLUME_ML', 'UNIT_COUNT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "variant" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "price" numeric(10,2) NOT NULL, "sku" character varying(255), "productId" integer NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "stock_basis_kind" "public"."variant_stock_basis_kind_enum", "base_units_per_stock_increment" numeric(14,4), CONSTRAINT "PK_f8043a8a34fa021a727a4718470" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "modifier" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "priceDelta" numeric(10,2) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "productId" integer NOT NULL, "parentId" integer, CONSTRAINT "PK_30c20db2bc7a8c2318b4db0dfc0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "sku" character varying(255) NOT NULL, "basePrice" numeric(10,2) NOT NULL, "merchantId" integer NOT NULL, "categoryId" integer, "supplierId" integer, "isActive" boolean NOT NULL DEFAULT true, "stock" numeric NOT NULL DEFAULT '0', CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_item_modifiers" ("id" SERIAL NOT NULL, "order_item_id" integer NOT NULL, "modifier_id" integer NOT NULL, "price" numeric(12,2) NOT NULL, CONSTRAINT "PK_e87d8ed07e34e0bd3cdc8f64ec8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_item_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_item" ("id" SERIAL NOT NULL, "order_id" integer NOT NULL, "product_id" integer NOT NULL, "variant_id" integer, "quantity" integer NOT NULL, "price" numeric(12,2) NOT NULL, "discount" numeric(12,2) NOT NULL DEFAULT '0', "total_price" numeric(12,2) NOT NULL, "notes" text, "status" "public"."order_item_status_enum" NOT NULL DEFAULT 'active', "kitchen_status" character varying(50) NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d01158fe15b1ead5c26fd7f4e90" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7cbafa10d699904fb95c61dac6" ON "order_item" ("order_id", "status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."online_order_item_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "online_order_item" ("id" SERIAL NOT NULL, "online_order_id" integer NOT NULL, "product_id" integer NOT NULL, "variant_id" integer, "quantity" integer NOT NULL, "modifiers" jsonb, "notes" text, "status" "public"."online_order_item_status_enum" NOT NULL DEFAULT 'active', "order_item_id" integer, "kitchen_line_status" character varying(32), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_390581cf46b43a1cba2696ad590" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ad9aff30045bb6bda3b533ba74" ON "online_order_item" ("order_item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f7f1f8b352d9f328d45b767e7f" ON "online_order_item" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c70fd7a84783f4fd577d26f8b8" ON "online_order_item" ("variant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f2b05f3920321d575a43eb9aa3" ON "online_order_item" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_186128068aa204bba59d47024b" ON "online_order_item" ("online_order_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."online_order_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "online_order" ("id" SERIAL NOT NULL, "merchant_id" integer NOT NULL, "store_id" integer NOT NULL, "order_id" integer, "customer_id" integer NOT NULL, "status" "public"."online_order_status_enum" NOT NULL DEFAULT 'active', "type" character varying(20) NOT NULL, "payment_status" character varying(20) NOT NULL, "scheduled_at" TIMESTAMP, "placed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "notes" text, "fulfillment_status" character varying(32) NOT NULL DEFAULT 'received', "accepted_at" TIMESTAMP, "ready_at" TIMESTAMP, "completed_at" TIMESTAMP, CONSTRAINT "PK_74aa1a0753ce4bea457a4bf80c0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3dd931810f2a4eb28b84bd8151" ON "online_order" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_abdc5bcfb0728453441e8c4064" ON "online_order" ("customer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e0cf7088781e84ceac75a71ca8" ON "online_order" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f7633489fcf55fede38a2d5f5a" ON "online_order" ("store_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_41a844349b02e469df772f185f" ON "online_order" ("merchant_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kitchen_station_station_type_enum" AS ENUM('HOT', 'COLD', 'BAR', 'DESSERT', 'PREP', 'PACKING', 'EXPO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kitchen_station_display_mode_enum" AS ENUM('AUTO', 'MANUAL', 'SUMMARY', 'GRID')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kitchen_station_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "kitchen_station" ("id" SERIAL NOT NULL, "merchant_id" integer NOT NULL, "name" character varying(100) NOT NULL, "station_type" "public"."kitchen_station_station_type_enum" NOT NULL, "display_mode" "public"."kitchen_station_display_mode_enum" NOT NULL, "display_order" integer NOT NULL, "station_number" integer NOT NULL DEFAULT '1', "printer_name" character varying(100), "backup_station_id" integer, "max_active_tickets_capacity" integer NOT NULL DEFAULT '15', "auto_reroute_on_offline" boolean NOT NULL DEFAULT true, "auto_reroute_on_capacity" boolean NOT NULL DEFAULT true, "fallback_action" character varying(50) NOT NULL DEFAULT 'BACKUP_STATION', "is_active" boolean NOT NULL DEFAULT true, "status" "public"."kitchen_station_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b0518e7932300e7d39eb008cb85" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7f131604e2bf65c985be3c8e26" ON "kitchen_station" ("merchant_id", "status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kitchen_order_item_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "kitchen_order_item" ("id" SERIAL NOT NULL, "kitchen_order_id" integer NOT NULL, "order_item_id" integer, "product_id" integer NOT NULL, "variant_id" integer, "quantity" integer NOT NULL, "prepared_quantity" integer NOT NULL DEFAULT '0', "preparation_status" character varying(50) NOT NULL DEFAULT 'pending', "course" character varying(50) NOT NULL DEFAULT 'main_course', "hold_until" TIMESTAMP, "fired_at" TIMESTAMP, "status" "public"."kitchen_order_item_status_enum" NOT NULL DEFAULT 'active', "started_at" TIMESTAMP, "completed_at" TIMESTAMP, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_503c0b72da598bb9b5546812cd3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ef06dc7dd686f2f71b947b6b01" ON "kitchen_order_item" ("course") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b70366fb051a9e8c79e4df33af" ON "kitchen_order_item" ("preparation_status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6d1a15ea144582ef18772b9611" ON "kitchen_order_item" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_74a20e29d25f2e62a5059af4ce" ON "kitchen_order_item" ("variant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_322dfb7de76edfce3e0cb4ee68" ON "kitchen_order_item" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_74b1e053f86dee00fc92ac1c07" ON "kitchen_order_item" ("order_item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ff7eb1ae4fa7f21df483b6cba1" ON "kitchen_order_item" ("kitchen_order_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kitchen_order_status_enum" AS ENUM('active', 'deleted', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kitchen_order_cancellation_reason_enum" AS ENUM('data_entry_error', 'customer_complaint', 'out_of_stock', 'preparation_delay', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "kitchen_order" ("id" SERIAL NOT NULL, "merchant_id" integer NOT NULL, "order_id" integer, "online_order_id" integer, "station_id" integer, "priority" integer NOT NULL DEFAULT '0', "business_status" character varying(50) NOT NULL DEFAULT 'pending', "started_at" TIMESTAMP, "completed_at" TIMESTAMP, "notes" text, "status" "public"."kitchen_order_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "cancellation_reason" "public"."kitchen_order_cancellation_reason_enum", "cancelled_by_user_id" integer, "cancelled_at" TIMESTAMP, CONSTRAINT "PK_307189bb6b47643d1bef8a64747" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_278b2c010cf4928c178402c817" ON "kitchen_order" ("business_status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_96fa8118417304de16a6458855" ON "kitchen_order" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1f8c094f83a9d3c11bbe5063af" ON "kitchen_order" ("station_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_294d2dd8a04986080135f48625" ON "kitchen_order" ("online_order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2da23ed974aec101e39d1b909c" ON "kitchen_order" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_51234ae099bef6793d64c307b4" ON "kitchen_order" ("merchant_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_plan_display_feature" ("id" BIGSERIAL NOT NULL, "subscription_plan_id" bigint NOT NULL, "label" character varying(255) NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_6952e0cfee38f3880dfac21d77f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_plan" ("id" BIGSERIAL NOT NULL, "name" character varying(100) NOT NULL, "slug" character varying(50), "badge" character varying(100), "description" text NOT NULL, "price" numeric(12,2), "price_label" character varying(100), "billingCycle" character varying(50) NOT NULL, "status" character varying(50) NOT NULL, "recommended" boolean NOT NULL DEFAULT false, "is_custom_pricing" boolean NOT NULL DEFAULT false, "image_url" character varying(500), CONSTRAINT "UQ_a8b506b29b6676308f7c0fc6613" UNIQUE ("slug"), CONSTRAINT "PK_5fde988e5d9b9a522d70ebec27c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "merchant_subscription" ("id" SERIAL NOT NULL, "startDate" date NOT NULL, "endDate" date, "renewalDate" date, "status" character varying(50) NOT NULL, "payment_method" character varying(50) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "merchant_id" integer, "plan_id" bigint, CONSTRAINT "PK_6c92cb16e3b33e6f38222bbe0c2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."receipts_type_enum" AS ENUM('INVOICE', 'RECEIPT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "receipts" ("id" SERIAL NOT NULL, "order_id" integer NOT NULL, "merchant_id" integer NOT NULL, "type" "public"."receipts_type_enum" NOT NULL DEFAULT 'RECEIPT', "fiscal_data" text, "subtotal" numeric(12,2) NOT NULL DEFAULT '0', "total_tax" numeric(12,2) NOT NULL DEFAULT '0', "total_discount" numeric(12,2) NOT NULL DEFAULT '0', "grand_total" numeric(12,2) NOT NULL DEFAULT '0', "currency" character varying(10) NOT NULL DEFAULT 'USD', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order_snapshot" jsonb, "processed_by_user_id" integer, "processed_by_role" character varying(50), "is_locked" boolean DEFAULT false, "invoice_number" character varying(50), CONSTRAINT "PK_5e8182d7c29e023da6e1ff33bfe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cc823e0200a9a09b7a3fcc5ee7" ON "receipts" ("merchant_id", "invoice_number") `,
    );
    await queryRunner.query(
      `CREATE TABLE "order_payments" ("id" SERIAL NOT NULL, "order_id" integer NOT NULL, "amount" numeric(12,2) NOT NULL, "method" character varying(50) NOT NULL, "provider" character varying(50), "reference" character varying(100), "tip_amount" numeric(12,2) NOT NULL DEFAULT '0', "is_refund" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "source" character varying(255), "shift_id" integer, CONSTRAINT "PK_bc14b014a69d39c7bbc4a154b69" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_taxes" ("id" SERIAL NOT NULL, "order_id" integer NOT NULL, "name" character varying(100) NOT NULL, "rate" numeric(10,4) NOT NULL, "amount" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c3b49729fbb58d88ff87a64b2a6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tip_settlements_status_enum" AS ENUM('pending', 'liquidated', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tip_settlements" ("id" BIGSERIAL NOT NULL, "company_id" bigint NOT NULL, "merchant_id" bigint NOT NULL, "collaborator_id" integer NOT NULL, "shift_id" integer NOT NULL, "total_amount" numeric(12,2) NOT NULL, "settlement_method" character varying(50) NOT NULL, "settled_by" integer, "settled_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "order_id" integer, "status" "public"."tip_settlements_status_enum" NOT NULL DEFAULT 'pending', CONSTRAINT "PK_95c9a12b1ca0c28120d0c270218" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ecd43386489579736dc7e19e73" ON "tip_settlements" ("collaborator_id", "shift_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f8c92b8cd8a0797abed8756b44" ON "tip_settlements" ("company_id", "merchant_id", "settled_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_logical_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_source_enum" AS ENUM('pos', 'qr', 'online', 'delivery')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_delivery_status_enum" AS ENUM('unassigned', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_kitchen_status_enum" AS ENUM('pending', 'sent', 'preparing', 'ready', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" SERIAL NOT NULL, "merchant_id" integer NOT NULL, "table_id" integer, "collaborator_id" integer NOT NULL, "subscription_id" integer, "cash_shift_id" integer, "type" character varying(50) NOT NULL, "status" character varying(50) NOT NULL, "customer_id" integer NOT NULL, "logical_status" "public"."orders_logical_status_enum" NOT NULL DEFAULT 'active', "order_number" character varying(20), "source" "public"."orders_source_enum" NOT NULL DEFAULT 'pos', "guest_count" integer NOT NULL DEFAULT '1', "subtotal" numeric(12,2) NOT NULL DEFAULT '0', "tax_total" numeric(12,2) NOT NULL DEFAULT '0', "discount_total" numeric(12,2) NOT NULL DEFAULT '0', "manual_tip_total" numeric(12,2) NOT NULL DEFAULT '0', "tip_total" numeric(12,2) NOT NULL DEFAULT '0', "total" numeric(12,2) NOT NULL DEFAULT '0', "paid_total" numeric(12,2) NOT NULL DEFAULT '0', "balance_due" numeric(12,2) NOT NULL DEFAULT '0', "is_paid" boolean NOT NULL DEFAULT false, "delivery_address" character varying, "delivery_zone_id" integer, "delivery_fee" numeric(12,2) NOT NULL DEFAULT '0', "delivery_status" "public"."orders_delivery_status_enum" NOT NULL DEFAULT 'unassigned', "kitchen_status" "public"."orders_kitchen_status_enum" NOT NULL DEFAULT 'pending', "ready_at" TIMESTAMP, "preparing_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "closed_at" TIMESTAMP, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "inventory_consumed_at" TIMESTAMP, "loyalty_points_awarded_at" TIMESTAMP, "shift_id" integer, "display_id" character varying, "merchant_tip_rule_id" integer, "merchant_tax_rule_ids" integer array, "refund_reason" character varying, "refunded_by_user_id" integer, CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bdc12bd9ddcf6d8b07cdf352f0" ON "orders" ("merchant_id", "order_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7288b57fa483167f2cc9d577ba" ON "orders" ("merchant_id", "status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "customer" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying, "document_id" character varying, "address" character varying NOT NULL, "city" character varying NOT NULL, "state" character varying NOT NULL, "country" character varying NOT NULL, "merchantId" integer NOT NULL, "companyId" integer, CONSTRAINT "PK_a7a13f4cacb744524e44dfdad32" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."configuration_tipcalculationmethod_enum" AS ENUM('percentage', 'fixed_amount', 'custom')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."configuration_tipdistributionmethod_enum" AS ENUM('individual', 'pool', 'role_based')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."configuration_taxtype_enum" AS ENUM('percentage', 'fixed', 'compound')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."configuration_frequencypayroll_enum" AS ENUM('weekly', 'biweekly', 'monthly', 'custom')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."configuration_calculationmethod_enum" AS ENUM('daily', 'weekly', 'holiday', 'special_day')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."configuration_ratemethod_enum" AS ENUM('percentage', 'multiplier', 'fixed_amount')`,
    );
    await queryRunner.query(
      `CREATE TABLE "configuration" ("id" SERIAL NOT NULL, "merchant_id" integer, "createdAt" date NOT NULL, "updatedAt" date NOT NULL, "status" character varying(50) NOT NULL, "name" character varying(50), "tipCalculationMethod" "public"."configuration_tipcalculationmethod_enum", "tipDistributionMethod" "public"."configuration_tipdistributionmethod_enum", "suggestedPercentages" numeric(5,4) array, "fixedAmountOptions" integer array, "allowCustomTip" boolean, "maximumTipPercentage" integer, "autoDistribute" boolean, "staffPercentage" numeric(5,2), "kitchenPercentage" numeric(5,2), "managerPercentage" numeric(5,2), "description" character varying(200), "taxType" "public"."configuration_taxtype_enum", "rate" numeric(10,4), "appliesToTips" boolean, "appliesToOvertime" boolean, "isCompound" boolean, "externalTaxCode" character varying(50), "frequencyPayroll" "public"."configuration_frequencypayroll_enum", "payDayOfWeek" integer, "payDayOfMonth" integer, "allowNegativePayroll" boolean, "roundingPrecision" integer, "currency" character varying(10), "autoApprovePayroll" boolean, "requiresManagerApproval" boolean, "calculationMethod" "public"."configuration_calculationmethod_enum", "thresholdHours" integer, "maxHours" integer, "rateMethod" "public"."configuration_ratemethod_enum", "rateValue" integer, "appliesOnHolidays" boolean, "appliesOnWeekends" boolean, "priority" integer, "type" character varying NOT NULL, "company_id" integer, "created_by" integer, "updated_by" integer, CONSTRAINT "PK_03bad512915052d2342358f0d8b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a60597808bce764b9cd796973" ON "configuration" ("type") `,
    );
    await queryRunner.query(
      `CREATE TABLE "company" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'active', "email" character varying, "phone" character varying, "tax_id" character varying, "address" character varying, "city" character varying, "state" character varying, "country" character varying, CONSTRAINT "PK_056f7854a7afdba7cbd6d45fc20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "merchant" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying, "phone" character varying, "tax_id" character varying, "address" character varying, "city" character varying, "state" character varying, "country" character varying, "timezone" character varying(50) NOT NULL DEFAULT 'UTC', "status" character varying(20) NOT NULL DEFAULT 'active', "companyId" integer NOT NULL, "default_sales_stock_location_id" integer, CONSTRAINT "UQ_merchant_company_name" UNIQUE ("companyId", "name"), CONSTRAINT "PK_9a3850e0537d869734fc9bff5d6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('portal_admin', 'portal_user', 'merchant_admin', 'merchant_user', 'customer_admin', 'customer_user')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_scope_enum" AS ENUM('admin_portal', 'merchant_web', 'merchant_android', 'merchant_ios', 'merchant_clover', 'clover_sdk', 'public_checkout', 'external_api')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "username" character varying, "password" character varying NOT NULL, "email" character varying NOT NULL, "role" "public"."users_role_enum", "scope" "public"."users_scope_enum", "scopes" text array, "resetToken" character varying, "refreshToken" character varying, "isActive" boolean NOT NULL DEFAULT true, "merchantId" integer NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "company_subscription" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "startDate" date NOT NULL, "endDate" date, "renewalDate" date, "status" character varying(50) NOT NULL, "payment_method" character varying(50) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "plan_id" bigint, CONSTRAINT "PK_8b9e234380f132cb34950b0d830" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_payments" ("id" BIGSERIAL NOT NULL, "company_id" integer, "plan_id" bigint, "external_transaction_id" character varying(100), "raw_payload" jsonb, "amount" numeric(12,2) NOT NULL, "currency" character varying(10) NOT NULL, "status" character varying(50) NOT NULL, "payment_date" TIMESTAMP NOT NULL DEFAULT now(), "payment_method" character varying(50) NOT NULL, "merchant_subscription_id" integer, "company_subscription_id" integer, CONSTRAINT "PK_1b7a76365fd477de59cba0ab957" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "application" ("id" BIGSERIAL NOT NULL, "name" character varying(100) NOT NULL, "description" text NOT NULL, "category" character varying(50) NOT NULL, "status" character varying(50) NOT NULL, CONSTRAINT "PK_569e0c3e863ebdf5f2408ee1670" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_applications" ("id" BIGSERIAL NOT NULL, "status" character varying(20) NOT NULL, "merchant_subscription_id" integer, "company_subscription_id" integer, "application_id" bigint, CONSTRAINT "PK_55afc0a9281d4b4b6253f7bddca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "feature" ("id" BIGSERIAL NOT NULL, "name" character varying(100) NOT NULL, "description" text NOT NULL, "Unit" character varying(50) NOT NULL, "status" character varying(50) NOT NULL, CONSTRAINT "PK_03930932f909ca4be8e33d16a2d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "plan_features" ("id" BIGSERIAL NOT NULL, "limit_value" numeric(12,2) NOT NULL, "status" character varying(50) NOT NULL, "subscription_plan_id" bigint, "feature_id" bigint, CONSTRAINT "PK_eb2b32d1d93a8b2e96e122e3a77" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "plan_applications" ("id" BIGSERIAL NOT NULL, "limits" character varying(50) NOT NULL, "status" character varying(50) NOT NULL, "subscriptionplan_id" bigint, "application_id" bigint, CONSTRAINT "PK_050e791bb67f3d8bc7459133f0d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_stock_alert" ("id" SERIAL NOT NULL, "merchantId" integer NOT NULL, "stockItemId" integer NOT NULL, "productId" integer, "variantId" integer, "supplyId" integer, "locationId" integer NOT NULL, "categoryId" integer, "alertType" character varying(32) NOT NULL, "currentQty" integer NOT NULL, "minimumQty" integer, "status" character varying(32) NOT NULL DEFAULT 'ACTIVE', "triggeredAt" TIMESTAMP NOT NULL DEFAULT now(), "resolvedAt" TIMESTAMP, "emailSentAt" TIMESTAMP, CONSTRAINT "PK_a94c8cd31c76a41252905b6607d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c49389e6db3f1e23a6bb3990d7" ON "inventory_stock_alert" ("stockItemId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b33eb92336730d9c3a3bcaed0e" ON "inventory_stock_alert" ("categoryId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1e900a51d370283d8d11270dba" ON "inventory_stock_alert" ("merchantId", "status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."product_recipe_line_line_type_enum" AS ENUM('REQUIRED', 'OPTIONAL', 'MODIFIER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."product_recipe_line_quantity_unit_enum" AS ENUM('GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'UNIT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_recipe_line" ("id" SERIAL NOT NULL, "recipe_id" integer NOT NULL, "line_type" "public"."product_recipe_line_line_type_enum" NOT NULL DEFAULT 'REQUIRED', "modifier_id" integer, "supply_product_id" integer, "supply_variant_id" integer, "raw_material_id" integer, "quantity" numeric(14,4), "unit_of_measure" character varying(50), "quantity_per_sold_unit" numeric(14,4) NOT NULL, "quantity_unit" "public"."product_recipe_line_quantity_unit_enum" NOT NULL DEFAULT 'UNIT', CONSTRAINT "PK_3eb7278cfa7b4d66996a014b3a0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_recipe" ("id" SERIAL NOT NULL, "merchant_id" integer NOT NULL, "finished_product_id" integer NOT NULL, "finished_variant_id" integer, "theoretical_cost_cached" numeric(14,4), CONSTRAINT "PK_87c7fb0c98a8d4049d8417d7968" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5c724a6db7cdf78a7235d6a339" ON "product_recipe" ("merchant_id", "finished_product_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "receipt_items" ("id" SERIAL NOT NULL, "receipt_id" integer NOT NULL, "name" character varying(255) NOT NULL, "sku" character varying(100), "quantity" numeric(10,2) NOT NULL, "unit_price" numeric(12,2) NOT NULL, "subtotal" numeric(12,2) NOT NULL, "discount_amount" numeric(12,2) NOT NULL DEFAULT '0', "total" numeric(12,2) NOT NULL, "metadata" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_8633ef98a0b970a980ebfd246e6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."receipt_taxes_scope_enum" AS ENUM('RECEIPT', 'ITEM')`,
    );
    await queryRunner.query(
      `CREATE TABLE "receipt_taxes" ("id" SERIAL NOT NULL, "receipt_id" integer NOT NULL, "receipt_item_id" integer, "name" character varying(150) NOT NULL, "rate" numeric(5,2) NOT NULL, "amount" numeric(12,2) NOT NULL, "scope" "public"."receipt_taxes_scope_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_565e8e17d2494160c5b3c31e7fc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tips" ("id" BIGSERIAL NOT NULL, "company_id" integer NOT NULL, "merchant_id" integer NOT NULL, "order_id" integer NOT NULL, "payment_id" bigint, "amount" numeric(12,2) NOT NULL, "method" character varying(50) NOT NULL, "status" character varying(50) NOT NULL, "record_status" character varying(50) NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b63a628fdfd7517d8e58fe39199" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_710ecf5ec7771f633954dc9136" ON "tips" ("order_id", "status", "record_status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e8b3a91f838ffb58a7716b8ae5" ON "tips" ("company_id", "merchant_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tip_pools" ("id" BIGSERIAL NOT NULL, "company_id" integer NOT NULL, "merchant_id" integer NOT NULL, "shift_id" integer NOT NULL, "name" character varying(150) NOT NULL, "distribution_type" character varying(50) NOT NULL, "total_amount" numeric(12,2) NOT NULL DEFAULT '0', "status" character varying(50) NOT NULL, "record_status" character varying(50) NOT NULL DEFAULT 'active', "closed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_03fb60450dc46c62444b82f7671" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1ceffbbc22b0caa7865e5ae491" ON "tip_pools" ("status", "record_status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ab028ac11aab3c2866a9ead5d7" ON "tip_pools" ("company_id", "merchant_id", "shift_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tip_pool_members" ("id" BIGSERIAL NOT NULL, "tip_pool_id" bigint NOT NULL, "collaborator_id" integer NOT NULL, "role" character varying(50) NOT NULL, "weight" numeric(5,2) NOT NULL, "record_status" character varying(50) NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9b1fa902a97eac9aeb40ae13ee7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f412eb2286d4d3ce22f4276f24" ON "tip_pool_members" ("tip_pool_id", "collaborator_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tip_allocations" ("id" BIGSERIAL NOT NULL, "tip_id" bigint NOT NULL, "collaborator_id" integer NOT NULL, "shift_id" integer NOT NULL, "role" character varying(50) NOT NULL, "percentage" numeric(5,2) NOT NULL, "amount" numeric(12,2) NOT NULL, "record_status" character varying(50) NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_db8ef1a5a14683d0f7b3770add7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e60d542c918b06f66a0e10de40" ON "tip_allocations" ("role", "record_status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ae95dcc3f3d492845f3089f19c" ON "tip_allocations" ("tip_id", "collaborator_id", "shift_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cash_tip_movements" ("id" BIGSERIAL NOT NULL, "cash_drawer_id" integer NOT NULL, "tip_id" bigint NOT NULL, "movement_type" character varying(50) NOT NULL, "amount" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_05a32c594e298d2f62d96f2c238" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eeb96a41b9182cd8521ae94594" ON "cash_tip_movements" ("tip_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_21f57d8769c305cfe58e2c62d8" ON "cash_tip_movements" ("cash_drawer_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "reservation_guests" ("id" SERIAL NOT NULL, "reservation_id" integer NOT NULL, "name" character varying(100) NOT NULL, "email" character varying(100), "phone" character varying(20), "is_primary" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_1c366ed8ed2fa328cfe19c105c2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservation_notes" ("id" SERIAL NOT NULL, "reservation_id" integer NOT NULL, "note" text NOT NULL, "created_by" integer, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0c67bf66f34b7c5fb23fbc48ca9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservation_status_history_status_enum" AS ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'white_list', 'no_show')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservation_status_history" ("id" SERIAL NOT NULL, "reservation_id" integer NOT NULL, "status" "public"."reservation_status_history_status_enum" NOT NULL DEFAULT 'pending', "changed_by" integer, "is_active" boolean NOT NULL DEFAULT true, "changed_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4cab29d490a85ac969e0fac2690" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reservation_status_history_reservation_changed_at" ON "reservation_status_history" ("reservation_id", "changed_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservations_reservationstatus_enum" AS ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'white_list', 'no_show')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservations" ("id" SERIAL NOT NULL, "merchant_id" integer NOT NULL, "customer_id" integer, "reservation_date" TIMESTAMP NOT NULL, "duration_minutes" integer NOT NULL DEFAULT '90', "seated_at" TIMESTAMP, "party_size" integer NOT NULL, "ReservationStatus" "public"."reservations_reservationstatus_enum" NOT NULL DEFAULT 'pending', "source" character varying(20), "special_requests" text, "created_by" integer, "capacity_override_by" integer, "capacity_override_at" TIMESTAMP, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_863365c5fc6ee2ce22f210a21d" ON "reservations" ("merchant_id", "reservation_date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "reservation_tables" ("id" SERIAL NOT NULL, "reservation_id" integer NOT NULL, "table_id" integer NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_2edb8b4ab691f7530e916f84403" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservation_settings" ("id" SERIAL NOT NULL, "merchant_id" integer NOT NULL, "seat_capacity" integer, "slot_interval_minutes" integer NOT NULL DEFAULT '15', "max_covers_per_slot" integer, "shifts" jsonb, "updated_by" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e1a9715484b4a510e7920cdb5e1" UNIQUE ("merchant_id"), CONSTRAINT "PK_1e850361792d3197228afa1ce66" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kitchen_event_log_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "kitchen_event_log" ("id" SERIAL NOT NULL, "kitchen_order_id" integer, "kitchen_order_item_id" integer, "station_id" integer, "user_id" integer, "event_type" character varying(100) NOT NULL, "event_time" TIMESTAMP NOT NULL, "message" text, "status" "public"."kitchen_event_log_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b79492cb5d23ce4fc621154e791" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4db0a3d8ff9cbcabf3ada7fef8" ON "kitchen_event_log" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6270ebacc19a7efecb38c36583" ON "kitchen_event_log" ("event_time") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_544d6055572ae7b8423bb841e2" ON "kitchen_event_log" ("event_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da09beb32407846f20c032bc33" ON "kitchen_event_log" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c56bd0b443a95709758fcf0bc4" ON "kitchen_event_log" ("station_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_226eb0ffd5e67485b273827944" ON "kitchen_event_log" ("kitchen_order_item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0e6e354055cfba7b8f68ae000a" ON "kitchen_event_log" ("kitchen_order_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kitchen_display_device_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "kitchen_display_device" ("id" SERIAL NOT NULL, "merchant_id" integer NOT NULL, "station_id" integer, "name" character varying(100) NOT NULL, "device_identifier" character varying(100) NOT NULL, "ip_address" character varying(50), "is_online" boolean NOT NULL DEFAULT false, "last_sync" TIMESTAMP, "status" "public"."kitchen_display_device_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_76ed1a60811360942f6838195d8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_be606480b83ed3348eb338b355" ON "kitchen_display_device" ("device_identifier") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5974522fb550fdebc197e47a9b" ON "kitchen_display_device" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8d95b0f1824d94f78572ecbf13" ON "kitchen_display_device" ("station_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ba4618997503b7f44b74eb0959" ON "kitchen_display_device" ("merchant_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "table_transfer_log" ("id" SERIAL NOT NULL, "merchant_id" integer NOT NULL, "source_table_id" integer NOT NULL, "target_table_id" integer NOT NULL, "order_id" integer, "user_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_05b50bab9af336ee7b73e3a8a7f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c4196c9b0c53785c6ae12d5a9e" ON "table_transfer_log" ("merchant_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."cash_movements_type_enum" AS ENUM('OUTFLOW', 'INFLOW')`,
    );
    await queryRunner.query(
      `CREATE TABLE "cash_movements" ("id" SERIAL NOT NULL, "shift_id" integer NOT NULL, "amount" numeric(12,2) NOT NULL, "reason" text NOT NULL, "receipt_photo" character varying, "user_id" integer NOT NULL, "type" "public"."cash_movements_type_enum" NOT NULL DEFAULT 'OUTFLOW', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_25faead19e1ff74153a01604d37" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."cash_drawer_history_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "cash_drawer_history" ("id" SERIAL NOT NULL, "cash_drawer_id" integer NOT NULL, "opening_balance" numeric(12,2) NOT NULL, "closing_balance" numeric(12,2) NOT NULL, "opened_by" integer NOT NULL, "closed_by" integer NOT NULL, "status" "public"."cash_drawer_history_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3013635848001a69d00c4174d08" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4eb13ea2702b69455803614d2a" ON "cash_drawer_history" ("cash_drawer_id", "status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."marketing_campaigns_channel_enum" AS ENUM('email', 'sms', 'push', 'inapp', 'popup')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."marketing_campaigns_status_enum" AS ENUM('draft', 'scheduled', 'sent', 'cancelled', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "marketing_campaigns" ("id" SERIAL NOT NULL, "merchant_id" integer NOT NULL, "name" character varying(255) NOT NULL, "channel" "public"."marketing_campaigns_channel_enum" NOT NULL, "content" text NOT NULL, "status" "public"."marketing_campaigns_status_enum" NOT NULL DEFAULT 'draft', "scheduled_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2601ceb29654c2a8adfddf2abbf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8bb4d6c5fd7c1254db693823c1" ON "marketing_campaigns" ("merchant_id", "status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."marketing_segments_type_enum" AS ENUM('automatic', 'manual')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."marketing_segments_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "marketing_segments" ("id" BIGSERIAL NOT NULL, "merchant_id" integer NOT NULL, "name" character varying(255) NOT NULL, "type" "public"."marketing_segments_type_enum" NOT NULL, "status" "public"."marketing_segments_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fa4c2b4e5ba51206ebb1f9b38ba" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_885754cc53f514af9d1ba740ad" ON "marketing_segments" ("merchant_id", "status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."marketing_segment_rules_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "marketing_segment_rules" ("id" BIGSERIAL NOT NULL, "segment_id" bigint NOT NULL, "field" character varying(255) NOT NULL, "operator" character varying(20) NOT NULL, "value" character varying(255) NOT NULL, "status" "public"."marketing_segment_rules_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6e7885d9a5342d36436a59a3916" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_717c7f243579a04867a2fb7cca" ON "marketing_segment_rules" ("segment_id", "status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."marketing_automations_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "marketing_automations" ("id" BIGSERIAL NOT NULL, "merchant_id" integer NOT NULL, "name" character varying(255) NOT NULL, "trigger" character varying(100) NOT NULL, "action" character varying(100) NOT NULL, "action_payload" text, "active" boolean NOT NULL DEFAULT true, "status" "public"."marketing_automations_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1d9e77f1a57d262a5cac3c6da5a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_afcebfe3e0bd986f7a1c0ac502" ON "marketing_automations" ("merchant_id", "trigger", "active", "status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "marketing_message_logs" ("id" BIGSERIAL NOT NULL, "campaign_id" integer, "automation_id" bigint, "customer_id" integer NOT NULL, "channel" character varying(50) NOT NULL, "status" character varying(50) NOT NULL, "sent_at" TIMESTAMP NOT NULL, "metadata" text, "record_status" character varying(50) NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_27381603801ed1763f65d84e0df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87b271d52b7200db320973efd1" ON "marketing_message_logs" ("channel", "status", "record_status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e37035e65b78d0f6db03bd4988" ON "marketing_message_logs" ("campaign_id", "automation_id", "customer_id", "sent_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."marketing_coupons_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "marketing_coupons" ("id" BIGSERIAL NOT NULL, "merchant_id" integer NOT NULL, "code" character varying(100) NOT NULL, "type" character varying(50) NOT NULL, "amount" numeric(10,2), "percentage" integer, "max_uses" integer, "max_uses_per_customer" integer, "valid_from" TIMESTAMP, "valid_until" TIMESTAMP, "min_order_amount" numeric(10,2), "applies_to" character varying(50) NOT NULL, "status" "public"."marketing_coupons_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_de800f3a27074a2e5cec4b0962c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4eb00938012968367ac1735a01" ON "marketing_coupons" ("merchant_id", "code", "status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."marketing_coupon_redemptions_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "marketing_coupon_redemptions" ("id" BIGSERIAL NOT NULL, "coupon_id" bigint NOT NULL, "order_id" integer NOT NULL, "customer_id" integer NOT NULL, "redeemed_at" TIMESTAMP NOT NULL, "discount_applied" numeric(10,2) NOT NULL, "status" "public"."marketing_coupon_redemptions_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9c74edfd5ba56aee55e9eb59537" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5866a7df19afb0050a69a650b5" ON "marketing_coupon_redemptions" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e3675f2c58d04b5e2f784630d3" ON "marketing_coupon_redemptions" ("coupon_id", "order_id", "customer_id", "redeemed_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."marketing_campaign_audience_status_enum" AS ENUM('pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "marketing_campaign_audience" ("id" BIGSERIAL NOT NULL, "marketing_campaign_id" integer NOT NULL, "customer_id" integer NOT NULL, "status" "public"."marketing_campaign_audience_status_enum" NOT NULL DEFAULT 'pending', "sent_at" TIMESTAMP, "delivered_at" TIMESTAMP, "opened_at" TIMESTAMP, "clicked_at" TIMESTAMP, "error_message" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_68f5120447bc4c4204bf6c869b9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a5d150de00bb29e491bdff2a02" ON "marketing_campaign_audience" ("customer_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d48ec28e6ebd9044104512c5e9" ON "marketing_campaign_audience" ("marketing_campaign_id", "status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_016ddf524b62bfb5ba1fa4f767" ON "marketing_campaign_audience" ("marketing_campaign_id", "customer_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."marketing_automation_actions_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "marketing_automation_actions" ("id" BIGSERIAL NOT NULL, "automation_id" bigint NOT NULL, "sequence" integer NOT NULL, "action_type" character varying(100) NOT NULL, "target_id" bigint, "payload" text, "delay_seconds" integer, "status" "public"."marketing_automation_actions_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197d427b76d3e990c1c45b73b2a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_51c2308048fa70f5f17d7d6f02" ON "marketing_automation_actions" ("action_type", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_03ee63e1ce69953394a6f6d049" ON "marketing_automation_actions" ("automation_id", "sequence", "status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "loyalty_redemption_audit_logs" ("id" BIGSERIAL NOT NULL, "merchant_id" bigint NOT NULL, "order_id" bigint NOT NULL, "loyalty_customer_id" bigint NOT NULL, "loyalty_points_lock_id" bigint NOT NULL, "cashier_user_id" integer NOT NULL, "redeemed_points" integer NOT NULL, "redeemed_amount" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6348ad6f846f37659a7c29d6d46" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."loyalty_points_locks_status_enum" AS ENUM('RESERVED', 'CONSUMED', 'RELEASED', 'EXPIRED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "loyalty_points_locks" ("id" BIGSERIAL NOT NULL, "merchant_id" bigint NOT NULL, "loyalty_customer_id" bigint NOT NULL, "order_id" integer NOT NULL, "reserved_points" integer NOT NULL, "reserved_amount" numeric(12,2) NOT NULL, "status" "public"."loyalty_points_locks_status_enum" NOT NULL DEFAULT 'RESERVED', "created_by_user_id" integer NOT NULL, "expires_at" TIMESTAMP NOT NULL, "consumed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_812d53744ee7e86e1e118323724" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "payroll_runs" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "merchant_id" integer NOT NULL, "period_start" date NOT NULL, "period_end" date NOT NULL, "status" character varying(50) NOT NULL DEFAULT 'draft', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "approved_at" TIMESTAMP, "deleted_at" TIMESTAMP, CONSTRAINT "PK_6049f42c972640c0eb99ba8035e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "payroll_entries" ("id" SERIAL NOT NULL, "payroll_run_id" integer NOT NULL, "collaborator_id" integer NOT NULL, "base_pay" numeric(12,2) NOT NULL DEFAULT '0', "overtime_pay" numeric(12,2) NOT NULL DEFAULT '0', "double_overtime_pay" numeric(12,2) NOT NULL DEFAULT '0', "tips_amount" numeric(12,2) NOT NULL DEFAULT '0', "bonuses" numeric(12,2) NOT NULL DEFAULT '0', "deductions" numeric(12,2) NOT NULL DEFAULT '0', "gross_total" numeric(12,2) NOT NULL DEFAULT '0', "tax_total" numeric(12,2) NOT NULL DEFAULT '0', "net_total" numeric(12,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_749b8c91480734ee1e616d4456d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "payroll_tax_details" ("id" SERIAL NOT NULL, "payroll_entry_id" integer NOT NULL, "tax_type" character varying(100) NOT NULL, "percentage" numeric(5,2) NOT NULL, "amount" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_76356aff600e5473c822e63fbc8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "payroll_adjustments" ("id" SERIAL NOT NULL, "payroll_entry_id" integer NOT NULL, "adjustment_type" character varying(50) NOT NULL, "description" text, "amount" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_b9f99e1e3098779fb717ecfe093" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "time_entries" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "merchant_id" integer NOT NULL, "collaborator_id" integer NOT NULL, "shift_id" integer, "clock_in" TIMESTAMP NOT NULL, "clock_out" TIMESTAMP, "regular_hours" numeric(6,2) NOT NULL DEFAULT '0', "overtime_hours" numeric(6,2) NOT NULL DEFAULT '0', "double_overtime_hours" numeric(6,2) NOT NULL DEFAULT '0', "approved" boolean NOT NULL DEFAULT false, "break_minutes" integer NOT NULL DEFAULT '0', "adjustment_reason" character varying(255), "is_edited" boolean NOT NULL DEFAULT false, "edited_by_user_id" integer, "edited_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b8bc5f10269ba2fe88708904aa0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "time_entry_revision" ("id" SERIAL NOT NULL, "time_entry_id" integer NOT NULL, "edited_by_user_id" integer NOT NULL, "adjustment_reason" character varying(255) NOT NULL, "previous_clock_in" TIMESTAMP, "previous_clock_out" TIMESTAMP, "previous_break_minutes" integer, "new_clock_in" TIMESTAMP, "new_clock_out" TIMESTAMP, "new_break_minutes" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b564016fa9770b4f68eb42c4a53" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_393db4a91133a91afa4d18a678" ON "time_entry_revision" ("time_entry_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "collaborator_contracts" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "merchant_id" integer NOT NULL, "collaborator_id" integer NOT NULL, "contract_type" character varying(50) NOT NULL, "employment_type" character varying(30) NOT NULL DEFAULT 'full_time', "pay_frequency" character varying(20) NOT NULL DEFAULT 'monthly', "working_hours_per_week" numeric(5,2) NOT NULL DEFAULT '40', "document_url" character varying(512), "document_name" character varying(255), "base_salary" numeric(12,2) NOT NULL DEFAULT '0', "hourly_rate" numeric(12,2) NOT NULL DEFAULT '0', "overtime_multiplier" numeric(5,2) NOT NULL DEFAULT 1.5, "double_overtime_multiplier" numeric(5,2) NOT NULL DEFAULT '2', "tips_included_in_payroll" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, "start_date" date NOT NULL, "end_date" date, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_98703b1aeea872e09216fe00e72" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "collaborator_contract_revisions" ("id" SERIAL NOT NULL, "contract_id" integer NOT NULL, "field" character varying(60) NOT NULL, "previous_value" character varying(255), "new_value" character varying(255), "changed_by_user_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_04f1240c5411bf3320c8eb43d16" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "supplier_payment_items" ("id" SERIAL NOT NULL, "payment_id" integer NOT NULL, "document_number" character varying(100) NOT NULL, "document_type" character varying(50) NOT NULL, "amount" numeric(15,2) NOT NULL, "deleted_at" TIMESTAMP, CONSTRAINT "PK_d9653c3eadaa7f8add1041066ef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."supplier_payments_status_enum" AS ENUM('draft', 'posted', 'partially_allocated', 'fully_allocated', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "supplier_payments" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "supplier_id" integer NOT NULL, "payment_number" character varying(100) NOT NULL, "payment_date" date NOT NULL, "payment_method" character varying(50) NOT NULL, "reference" character varying(100), "total_amount" numeric(15,2) NOT NULL, "allocated_amount" numeric(15,2) NOT NULL DEFAULT '0', "status" "public"."supplier_payments_status_enum" NOT NULL DEFAULT 'draft', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_76e86f3194494faf999c652dbf9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."supplier_credit_notes_status_enum" AS ENUM('draft', 'issued', 'partially_applied', 'fully_applied', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "supplier_credit_notes" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "supplier_id" integer NOT NULL, "credit_note_number" character varying(100) NOT NULL, "issue_date" date NOT NULL, "total_amount" numeric(15,2) NOT NULL, "applied_amount" numeric(15,2) NOT NULL DEFAULT '0', "status" "public"."supplier_credit_notes_status_enum" NOT NULL DEFAULT 'draft', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_0e2c2f4982a5bd60040fa750eaf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "supplier_payment_allocations" ("id" SERIAL NOT NULL, "payment_id" integer, "credit_note_id" integer, "supplier_id" integer NOT NULL, "document_number" character varying(100) NOT NULL, "document_type" character varying(50) NOT NULL, "allocated_amount" numeric(15,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_6b8f3bbd46a51d5f53fa7df22ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."journal_entries_status_enum" AS ENUM('DRAFT', 'POSTED', 'VOIDED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."journal_entries_reference_type_enum" AS ENUM('ORDER', 'PAYMENT', 'PAYROLL', 'TAX', 'INVENTORY', 'ADJUSTMENT', 'MANUAL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "journal_entries" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "entry_number" character varying(100) NOT NULL, "entry_date" date NOT NULL, "description" text, "status" "public"."journal_entries_status_enum" NOT NULL DEFAULT 'DRAFT', "total_debit" numeric(15,2) NOT NULL, "total_credit" numeric(15,2) NOT NULL, "reference_type" "public"."journal_entries_reference_type_enum", "reference_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_a70368e64230434457c8d007ab3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_793d0c733787f9a849b018c0e0" ON "journal_entries" ("company_id", "entry_number") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ledger_accounts_type_enum" AS ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ledger_accounts" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "code" character varying(50) NOT NULL, "name" character varying(150) NOT NULL, "type" "public"."ledger_accounts_type_enum" NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "parent_account_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_62b34396dda564757cf123fff0e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_dbaaabeb4f909b9e438be05c9b" ON "ledger_accounts" ("company_id", "code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "journal_entry_lines" ("id" SERIAL NOT NULL, "journal_entry_id" integer NOT NULL, "account_id" integer NOT NULL, "debit" numeric(15,2) NOT NULL DEFAULT '0', "credit" numeric(15,2) NOT NULL DEFAULT '0', "description" text, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_b2f60e3664cd9803a829fb61aa4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."qr_menu_qr_type_enum" AS ENUM('Table', 'Pickup', 'Delivery')`,
    );
    await queryRunner.query(
      `CREATE TABLE "qr_menu" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "description" text NOT NULL, "status" character varying(50) NOT NULL, "design_theme" character varying(100) NOT NULL, "qr_type" "public"."qr_menu_qr_type_enum" NOT NULL, "merchant_id" integer, CONSTRAINT "PK_494c5435d625284739c24c95de1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."qr_location_location_type_enum" AS ENUM('Table', 'Pickup', 'Delivery')`,
    );
    await queryRunner.query(
      `CREATE TABLE "qr_location" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "qr_code_url" text NOT NULL, "qr_code_image" text NOT NULL, "location_type" "public"."qr_location_location_type_enum" NOT NULL, "status" character varying(50) NOT NULL, "merchant_id" integer, "qr_menu_id" integer, "table_id" integer, CONSTRAINT "PK_c7d6f677298486e29e3db48061d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."qr_order_qr_order_status_enum" AS ENUM('Draft', 'Submitted', 'Accepted', 'Rejected', 'In Preparation', 'Ready', 'Completed', 'Cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "qr_order" ("id" SERIAL NOT NULL, "qr_order_status" "public"."qr_order_qr_order_status_enum" NOT NULL, "notes" text NOT NULL, "total_amount" numeric(12,2) NOT NULL, "status" character varying(50) NOT NULL, "merchant_id" integer, "qr_location_id" integer, "customer_id" integer, "table_id" integer, "order_id" integer, CONSTRAINT "PK_1227f87bc8fbe6bfafc7467f8b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "qr_order_item" ("id" SERIAL NOT NULL, "quantity" integer NOT NULL, "price" numeric(12,2) NOT NULL, "total_price" numeric(12,2) NOT NULL, "notes" text, "status" character varying(50) NOT NULL, "qr_order_id" integer, "product_id" integer, "variant_id" integer, CONSTRAINT "PK_a01ac307e179fcaa54c4f37db31" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "qr_menu_section" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "description" text NOT NULL, "status" character varying(50) NOT NULL, "display_order" integer NOT NULL, "qr_menu_id" integer, CONSTRAINT "PK_fe9abba9ec0a07937791a460e31" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "qr_menu_item" ("id" SERIAL NOT NULL, "status" character varying(50) NOT NULL, "display_order" integer NOT NULL, "notes" text NOT NULL, "is_visible" boolean NOT NULL, "qr_menu_section_id" integer, "product_id" integer, "variant_id" integer, CONSTRAINT "PK_c3b863c0ac74ee11eae5e2b0d16" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."online_payment_logical_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "online_payment" ("id" SERIAL NOT NULL, "online_order_id" integer NOT NULL, "payment_provider" character varying(50) NOT NULL, "transaction_id" character varying(100) NOT NULL, "amount" numeric(12,2) NOT NULL, "status" character varying(20) NOT NULL, "processed_at" TIMESTAMP, "logical_status" "public"."online_payment_logical_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_58de638282c4b5ae75d3f0a4536" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_69b24066be2a781acf1b004119" ON "online_payment" ("logical_status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0d6b7f3deeb2b5aa3a48130ff0" ON "online_payment" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_93e232de4f3dc710257c6b2ae0" ON "online_payment" ("online_order_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "online_menu" ("id" SERIAL NOT NULL, "store_id" integer NOT NULL, "name" character varying(100) NOT NULL, "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_38c19937e413253a6bc149d9c5a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f5ca59a0ead555409b37882115" ON "online_menu" ("store_id", "is_active", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."online_menu_item_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "online_menu_item" ("id" SERIAL NOT NULL, "menu_id" integer NOT NULL, "product_id" integer NOT NULL, "variant_id" integer, "is_available" boolean NOT NULL DEFAULT true, "price_override" numeric(10,2), "display_order" integer NOT NULL, "status" "public"."online_menu_item_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ef1e41b78886bd99f9a6b8a2094" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dabe3bb94c7e2c305ee730f056" ON "online_menu_item" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_be5b62c3ec0c9ec39d62b70109" ON "online_menu_item" ("variant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7c40cebad6fbbdb9bd54730ae2" ON "online_menu_item" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d19f237f8c5b283769e9c4837c" ON "online_menu_item" ("menu_id", "display_order") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."online_menu_category_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "online_menu_category" ("id" SERIAL NOT NULL, "menu_id" integer NOT NULL, "category_id" integer NOT NULL, "display_order" integer NOT NULL, "status" "public"."online_menu_category_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d4693322ca6d62f2b886ea02965" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6634aa5aca7af736f802e9a79c" ON "online_menu_category" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dad0f3fbd1a99ca78298bcd8a0" ON "online_menu_category" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1e44ac6f19e36ab67bf5a005d2" ON "online_menu_category" ("menu_id", "display_order") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."online_delivery_info_status_enum" AS ENUM('active', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "online_delivery_info" ("id" SERIAL NOT NULL, "online_order_id" integer NOT NULL, "customer_name" character varying(100) NOT NULL, "address" character varying(200) NOT NULL, "city" character varying(100) NOT NULL, "phone" character varying(50) NOT NULL, "delivery_instructions" text, "status" "public"."online_delivery_info_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3add1d6617044067021f014b0fd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7627ff9c3310c67f6ac42d03b2" ON "online_delivery_info" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c173eb4d8980195a2e6bbead8d" ON "online_delivery_info" ("online_order_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "delivery_zones" ("id" SERIAL NOT NULL, "name" character varying(200) NOT NULL, "description" character varying(500), "geojson" json, "status" character varying(50) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "merchant_id" integer, CONSTRAINT "PK_88bc4c12be62436a61930cf34a9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "delivery_drivers" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "phone" character varying(20) NOT NULL, "vehicleType" character varying(50) NOT NULL, "status" character varying(50) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "merchant_id" integer, CONSTRAINT "PK_4dd4af220a2bc6d27785662bbde" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."delivery_assignments_assignment_type_enum" AS ENUM('in_house', 'doordash_drive', 'uber_direct')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."delivery_assignments_delivery_status_enum" AS ENUM('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "delivery_assignments" ("id" SERIAL NOT NULL, "assignment_type" "public"."delivery_assignments_assignment_type_enum" NOT NULL DEFAULT 'in_house', "delivery_status" "public"."delivery_assignments_delivery_status_enum" NOT NULL DEFAULT 'pending', "assigned_at" TIMESTAMP, "picked_up_at" TIMESTAMP, "delivered_at" TIMESTAMP, "external_delivery_id" character varying(255), "external_tracking_url" character varying(2048), "external_dsp_fee" numeric(12,2), "status" character varying(50) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "order_id" integer, "delivery_driver_id" integer, CONSTRAINT "PK_d1cfabf26db04a5282217fb7b83" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_delivery_assignments_external_delivery" ON "delivery_assignments" ("assignment_type", "external_delivery_id") WHERE "external_delivery_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "delivery_tracking" ("id" SERIAL NOT NULL, "latitude" numeric(10,6) NOT NULL, "longitude" numeric(10,6) NOT NULL, "recorded_at" TIMESTAMP, "status" character varying(50) NOT NULL, "delivery_assignment_id" integer, CONSTRAINT "PK_165d1402d6af7bb3aa56eecd0f0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6f1df8583adfd346d8a8c4e425" ON "delivery_tracking" ("delivery_assignment_id", "recorded_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "delivery_fees" ("id" SERIAL NOT NULL, "base_fee" numeric(12,2) NOT NULL, "per_km_fee" numeric(12,2), "min_order_amount" numeric(12,2), "free_above" numeric(12,2), "status" character varying(50) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "delivery_zone_id" integer, CONSTRAINT "PK_736fa0ed72064a12309a2e731ac" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_store" ADD CONSTRAINT "FK_c35a9ae0af93e2b7ea3b5805f4c" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "floor_plan" ADD CONSTRAINT "FK_45352eca61ea0cb09624b61a88d" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "floor_zone" ADD CONSTRAINT "FK_153018cdb11a4ece3e7a50dab87" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "floor_zone" ADD CONSTRAINT "FK_f95ae1771a1322480413b68d3d8" FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "table" ADD CONSTRAINT "FK_bb9e69b6b07d00857e1b459df92" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "table" ADD CONSTRAINT "FK_8dabf016c96c83e8cb6917308b0" FOREIGN KEY ("floor_zone_id") REFERENCES "floor_zone"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "table" ADD CONSTRAINT "FK_a740330267115bc03fa954995a0" FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "table" ADD CONSTRAINT "FK_a3bc43edcb4621ee5776382d43c" FOREIGN KEY ("parent_table_id") REFERENCES "table"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_assignments" ADD CONSTRAINT "FK_3c76c8edb5d70fdce40f6d828f2" FOREIGN KEY ("shiftId") REFERENCES "shift"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_assignments" ADD CONSTRAINT "FK_fb7947dc40b1939907e11fa8d1d" FOREIGN KEY ("tableId") REFERENCES "table"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_assignments" ADD CONSTRAINT "FK_25c30478c36cd23e327ab351976" FOREIGN KEY ("collaboratorId") REFERENCES "collaborator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collaborator" ADD CONSTRAINT "FK_2b516ff163b9e85cb9adecc76c8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collaborator" ADD CONSTRAINT "FK_2a72d33b4cbbfcfa3c6c7944338" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collaborator" ADD CONSTRAINT "FK_a4c4ba9ce46126d8292d7d2f592" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_assignment" ADD CONSTRAINT "FK_eee9dd774a06c0b967d75e370d1" FOREIGN KEY ("shiftId") REFERENCES "shift"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_assignment" ADD CONSTRAINT "FK_6b3dba51376aa61dc7cef49ae4a" FOREIGN KEY ("collaboratorId") REFERENCES "collaborator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift" ADD CONSTRAINT "FK_30fd5f210426ec4428f3e1fbe9b" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_shifts" ADD CONSTRAINT "FK_a43ba42d36a4e48027671cbe520" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_shifts" ADD CONSTRAINT "FK_953758d874b680d18d9a0bf7182" FOREIGN KEY ("cash_drawer_id") REFERENCES "cash_drawer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_shifts" ADD CONSTRAINT "FK_8b463baf9f9620382e7b29b54da" FOREIGN KEY ("opened_by") REFERENCES "collaborator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_shifts" ADD CONSTRAINT "FK_35eef7fa2fb037c7716bab94485" FOREIGN KEY ("closed_by") REFERENCES "collaborator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_drawer" ADD CONSTRAINT "FK_9efca904f8a684462a07b2f7449" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_drawer" ADD CONSTRAINT "FK_9574b2547bba42825ddd547f553" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_drawer" ADD CONSTRAINT "FK_7caca0ceb13e72cf5e8277f04d0" FOREIGN KEY ("opened_by") REFERENCES "collaborator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_drawer" ADD CONSTRAINT "FK_af544adf8d916b2213f5a24d584" FOREIGN KEY ("closed_by") REFERENCES "collaborator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_transactions" ADD CONSTRAINT "FK_41c8614c32afab1c987f6fb779c" FOREIGN KEY ("cash_drawer_id") REFERENCES "cash_drawer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_transactions" ADD CONSTRAINT "FK_6becd980679a9a8814cf3a50592" FOREIGN KEY ("collaborator_id") REFERENCES "collaborator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_transactions" ADD CONSTRAINT "FK_430f10122cfdd3233233fe4f5d6" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_transactions" ADD CONSTRAINT "FK_c1ce95f2a4eddbfb4a3affb21c4" FOREIGN KEY ("shift_id") REFERENCES "cash_shifts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_point_transactions" ADD CONSTRAINT "FK_4a79a8569709b81b7d77cbab276" FOREIGN KEY ("loyalty_customer_id") REFERENCES "loyalty_customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_point_transactions" ADD CONSTRAINT "FK_348362221ff94d7ed4ec384c9b3" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_point_transactions" ADD CONSTRAINT "FK_6f5e100eefe2fbb2593d27958c1" FOREIGN KEY ("payment_id") REFERENCES "cash_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_rewards_redemptions" ADD CONSTRAINT "FK_db2665c4148dc788efc4bd807b8" FOREIGN KEY ("loyalty_customer_id") REFERENCES "loyalty_customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_rewards_redemptions" ADD CONSTRAINT "FK_9a39e12112f2fab85a763a53082" FOREIGN KEY ("reward_id") REFERENCES "loyalty_reward"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_rewards_redemptions" ADD CONSTRAINT "FK_cb6fc2003ce32da50afe7c98224" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_coupons" ADD CONSTRAINT "FK_4dde3972deabf43f87aa5cd7883" FOREIGN KEY ("loyalty_customer_id") REFERENCES "loyalty_customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_coupons" ADD CONSTRAINT "FK_c2822c6c11b344232eba3b6ce58" FOREIGN KEY ("reward_id") REFERENCES "loyalty_reward"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_coupons" ADD CONSTRAINT "FK_40fc3aee9c03929d01afb900e55" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_customers" ADD CONSTRAINT "FK_2becebbc63e2bd5356c91a31521" FOREIGN KEY ("loyalty_program_id") REFERENCES "loyalty_programs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_customers" ADD CONSTRAINT "FK_32a594135702a9afad109059175" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_customers" ADD CONSTRAINT "FK_d7cb8aacf4f9b0aae5d1762b8c1" FOREIGN KEY ("loyalty_tier_id") REFERENCES "loyalty_tiers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_tiers" ADD CONSTRAINT "FK_197ccdd3ed20bc29c89138ae694" FOREIGN KEY ("loyalty_program_id") REFERENCES "loyalty_programs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_programs" ADD CONSTRAINT "FK_149e92c26e6ac9ce25e896a1e20" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_reward" ADD CONSTRAINT "FK_68518986f2d322afd9c93336d4f" FOREIGN KEY ("loyalty_program_id") REFERENCES "loyalty_programs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_reward" ADD CONSTRAINT "FK_e9708ba10f4b7566a68bded63af" FOREIGN KEY ("free_product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "category" ADD CONSTRAINT "FK_5f44aa02d1c66d9a916a409fcb2" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "category" ADD CONSTRAINT "FK_d5456fd7e4c4866fec8ada1fa10" FOREIGN KEY ("parentId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_location" ADD CONSTRAINT "FK_9d4808a02440115f0614ecb78ae" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "raw_material_categories" ADD CONSTRAINT "FK_15a68987ca2835664111de7fc96" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_suppliers" ADD CONSTRAINT "FK_ea9aebe884e8031de8d47ebf93c" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_suppliers" ADD CONSTRAINT "FK_2f819882723967d35f0cab0fac0" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplies" ADD CONSTRAINT "FK_77d8fe3e7226a9895da5443f607" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplies" ADD CONSTRAINT "FK_59589e06003348b05247ee482a4" FOREIGN KEY ("category_id") REFERENCES "raw_material_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_item" ADD CONSTRAINT "FK_13ef910b84865fed2a2799dea55" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_item" ADD CONSTRAINT "FK_3064ddc2f33fbc5b09f53cee561" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_item" ADD CONSTRAINT "FK_866df188f9dec7ff644e8292bbf" FOREIGN KEY ("variantId") REFERENCES "variant"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_item" ADD CONSTRAINT "FK_70a51e1ec3debaac6d7641c0d3d" FOREIGN KEY ("raw_material_id") REFERENCES "supplies"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_item" ADD CONSTRAINT "FK_167a9995d0518384c53e7e82bd6" FOREIGN KEY ("locationId") REFERENCES "stock_location"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order" ADD CONSTRAINT "FK_cd5b5d261e431bc310bc7f76b07" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order" ADD CONSTRAINT "FK_e4ea5841622429c12889a487f31" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier" ADD CONSTRAINT "FK_3e3ed41fe5a4f5ea801e2e55dad" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoice_items" ADD CONSTRAINT "FK_2e84dd67055562c4db05c0886ae" FOREIGN KEY ("invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoice_items" ADD CONSTRAINT "FK_8b79bfa4ae4700f5870c5503a3c" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoice_items" ADD CONSTRAINT "FK_b669aea1db60f02df62748cd68c" FOREIGN KEY ("variant_id") REFERENCES "variant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoices" ADD CONSTRAINT "FK_8912d8dc59ffc89931161b3a5d6" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoices" ADD CONSTRAINT "FK_1c85b2d278b6b6f3ab2ea9dc582" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movement" ADD CONSTRAINT "FK_7a78658cd8325aaa00571368507" FOREIGN KEY ("stockItemId") REFERENCES "stock_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movement" ADD CONSTRAINT "FK_77ba473461d8613d4c171367755" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movement" ADD CONSTRAINT "FK_3941af41b7cdd5178fe804b0923" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movement" ADD CONSTRAINT "FK_d17af3e00e35ed92d29da07e56d" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movement" ADD CONSTRAINT "FK_96249b84ebaa98a2a796f2eae1e" FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movement" ADD CONSTRAINT "FK_1d81dbe4f82a4b389ce514f2a92" FOREIGN KEY ("source_location_id") REFERENCES "stock_location"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movement" ADD CONSTRAINT "FK_eba3c566c5d160ba7ae233fe92e" FOREIGN KEY ("destination_location_id") REFERENCES "stock_location"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_item" ADD CONSTRAINT "FK_541552503e8c80053f8ccda754e" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_item" ADD CONSTRAINT "FK_6024c402fedf13cf77e627f2ec7" FOREIGN KEY ("variantId") REFERENCES "variant"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_item" ADD CONSTRAINT "FK_305aff91e6e66d693a33530b0cd" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_item" ADD CONSTRAINT "FK_79569e763910987b7685d69244d" FOREIGN KEY ("locationId") REFERENCES "stock_location"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "variant" ADD CONSTRAINT "FK_cb0df5c8d79ac0ea08a87119673" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "modifier" ADD CONSTRAINT "FK_5c02e59829c5e0f2311c2aff1b8" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "modifier" ADD CONSTRAINT "FK_8506b06b24c0aa4d4d711a5f0f2" FOREIGN KEY ("parentId") REFERENCES "modifier"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "FK_62fcc319202f6ec1f6819e1d5f5" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "FK_ff0c0301a95e517153df97f6812" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "FK_4346e4adb741e80f3711ee09ba4" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "FK_1f6709a805b8bcafe0bda11edbf" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "FK_e8ec685225f6710f5ce06a8ffff" FOREIGN KEY ("modifier_id") REFERENCES "modifier"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD CONSTRAINT "FK_e9674a6053adbaa1057848cddfa" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD CONSTRAINT "FK_5e17c017aa3f5164cb2da5b1c6b" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD CONSTRAINT "FK_6312e502a3cc8068671253bdbaf" FOREIGN KEY ("variant_id") REFERENCES "variant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order_item" ADD CONSTRAINT "FK_186128068aa204bba59d47024ba" FOREIGN KEY ("online_order_id") REFERENCES "online_order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order_item" ADD CONSTRAINT "FK_f2b05f3920321d575a43eb9aa3e" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order_item" ADD CONSTRAINT "FK_c70fd7a84783f4fd577d26f8b8d" FOREIGN KEY ("variant_id") REFERENCES "variant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order_item" ADD CONSTRAINT "FK_ad9aff30045bb6bda3b533ba744" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order" ADD CONSTRAINT "FK_bf06fc1fe061464d7145e2fed7b" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order" ADD CONSTRAINT "FK_f7633489fcf55fede38a2d5f5ad" FOREIGN KEY ("store_id") REFERENCES "online_store"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order" ADD CONSTRAINT "FK_e0cf7088781e84ceac75a71ca8d" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order" ADD CONSTRAINT "FK_abdc5bcfb0728453441e8c4064d" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" ADD CONSTRAINT "FK_dc648adc230d215cb9e9248d3db" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" ADD CONSTRAINT "FK_5ec7e78e89629cd9ad98e9ff633" FOREIGN KEY ("backup_station_id") REFERENCES "kitchen_station"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order_item" ADD CONSTRAINT "FK_ff7eb1ae4fa7f21df483b6cba15" FOREIGN KEY ("kitchen_order_id") REFERENCES "kitchen_order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order_item" ADD CONSTRAINT "FK_74b1e053f86dee00fc92ac1c07a" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order_item" ADD CONSTRAINT "FK_322dfb7de76edfce3e0cb4ee681" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order_item" ADD CONSTRAINT "FK_74a20e29d25f2e62a5059af4ce8" FOREIGN KEY ("variant_id") REFERENCES "variant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order" ADD CONSTRAINT "FK_51234ae099bef6793d64c307b40" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order" ADD CONSTRAINT "FK_2da23ed974aec101e39d1b909c1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order" ADD CONSTRAINT "FK_294d2dd8a04986080135f48625a" FOREIGN KEY ("online_order_id") REFERENCES "online_order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order" ADD CONSTRAINT "FK_1f8c094f83a9d3c11bbe5063af6" FOREIGN KEY ("station_id") REFERENCES "kitchen_station"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plan_display_feature" ADD CONSTRAINT "FK_a97e913b2163b358564e98ec9ae" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plan"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant_subscription" ADD CONSTRAINT "FK_b45f5e802db4cb9117825587a25" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant_subscription" ADD CONSTRAINT "FK_2551a84cbf9f79d7b7af98072d1" FOREIGN KEY ("plan_id") REFERENCES "subscription_plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipts" ADD CONSTRAINT "FK_9545ae8fc5f7714cd8a807dd937" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payments" ADD CONSTRAINT "FK_5d2ebca202f9d9370a001a571ba" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_taxes" ADD CONSTRAINT "FK_eb520307d57426aff4fda28244e" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_settlements" ADD CONSTRAINT "FK_aa3a49a150a55aa510f9e087fab" FOREIGN KEY ("collaborator_id") REFERENCES "collaborator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_settlements" ADD CONSTRAINT "FK_099cadc42ff26a41e8dec8db08e" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_settlements" ADD CONSTRAINT "FK_f86e455bd3590505a7cdf481425" FOREIGN KEY ("settled_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_settlements" ADD CONSTRAINT "FK_4947f7311096135d84c9d5156ad" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_2474866c8f8e9196ff227a7cbbd" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_3d36410e89a795172fa6e0dd968" FOREIGN KEY ("table_id") REFERENCES "table"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_7dcc61fd46b90b6bfa732109042" FOREIGN KEY ("collaborator_id") REFERENCES "collaborator"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_a99c67e713ffa08f499b2c79d57" FOREIGN KEY ("subscription_id") REFERENCES "merchant_subscription"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_3350ff300ac6830b9a9d1c752fc" FOREIGN KEY ("cash_shift_id") REFERENCES "cash_shifts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_a47d559598368bc78800dd5175b" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer" ADD CONSTRAINT "FK_23778827c741b8937b565a59293" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer" ADD CONSTRAINT "FK_a9d874b83a7879be8538bf08b09" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "configuration" ADD CONSTRAINT "FK_b041bdc17c33aa36063e2a33f34" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "configuration" ADD CONSTRAINT "FK_f803251c1f91cfb4f6583521c90" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "configuration" ADD CONSTRAINT "FK_16b2f8865fcacd0602b8685335c" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "configuration" ADD CONSTRAINT "FK_a2bd3c1661eabc2108a779a6ddb" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant" ADD CONSTRAINT "FK_bc4dfecbbf72ab80b1ce9cc0123" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant" ADD CONSTRAINT "FK_52e783bcdaeb35ff09c4e438f8f" FOREIGN KEY ("default_sales_stock_location_id") REFERENCES "stock_location"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_af94df2e060180b6043d5e45042" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_subscription" ADD CONSTRAINT "FK_f8b117158ab95f921469ff24a3e" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_subscription" ADD CONSTRAINT "FK_6da40fa9198cbd9174e6eb6a0ed" FOREIGN KEY ("plan_id") REFERENCES "subscription_plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" ADD CONSTRAINT "FK_fc3858421bceb3ee2fb8e0c0da9" FOREIGN KEY ("merchant_subscription_id") REFERENCES "merchant_subscription"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" ADD CONSTRAINT "FK_c49de0bffcf48582403845263da" FOREIGN KEY ("company_subscription_id") REFERENCES "company_subscription"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" ADD CONSTRAINT "FK_eebfcdfc544379ebbf73bbb0bea" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" ADD CONSTRAINT "FK_8b68e73bad65dc9449b55725dfc" FOREIGN KEY ("plan_id") REFERENCES "subscription_plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_applications" ADD CONSTRAINT "FK_5fe81d28fa5c3a4a782a55204ff" FOREIGN KEY ("merchant_subscription_id") REFERENCES "merchant_subscription"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_applications" ADD CONSTRAINT "FK_1f538b99ff20b3fe5c1caf454d2" FOREIGN KEY ("company_subscription_id") REFERENCES "company_subscription"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_applications" ADD CONSTRAINT "FK_fce39af633bdc6e0847eda8cf23" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_features" ADD CONSTRAINT "FK_e1a23af2ad3dc02af893d510de7" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_features" ADD CONSTRAINT "FK_27e866bdf4c6f2cf5854b7d0e57" FOREIGN KEY ("feature_id") REFERENCES "feature"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_applications" ADD CONSTRAINT "FK_02aab4ababf2391e492da621264" FOREIGN KEY ("subscriptionplan_id") REFERENCES "subscription_plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_applications" ADD CONSTRAINT "FK_8f7c239baf8c1b1a25171353fb7" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_stock_alert" ADD CONSTRAINT "FK_85e62371c8eb0fca308c1d4c373" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_stock_alert" ADD CONSTRAINT "FK_60915740657e228c397ebe67ab0" FOREIGN KEY ("stockItemId") REFERENCES "stock_item"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_stock_alert" ADD CONSTRAINT "FK_9485521796cecb310cbb13d1b41" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_stock_alert" ADD CONSTRAINT "FK_f8ff22aff05ea99760fec148a06" FOREIGN KEY ("variantId") REFERENCES "variant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_stock_alert" ADD CONSTRAINT "FK_17171ad3ecdc84fdaf36a56ed7c" FOREIGN KEY ("supplyId") REFERENCES "supplies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_stock_alert" ADD CONSTRAINT "FK_e87b106e077506008550779fe93" FOREIGN KEY ("locationId") REFERENCES "stock_location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe_line" ADD CONSTRAINT "FK_77be922580bdb4b90f5cbec1a85" FOREIGN KEY ("recipe_id") REFERENCES "product_recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe_line" ADD CONSTRAINT "FK_a78a5c5b836b3c2418721198ca7" FOREIGN KEY ("modifier_id") REFERENCES "modifier"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe_line" ADD CONSTRAINT "FK_e89aa1cbfd3fed5f817a0f30a4b" FOREIGN KEY ("supply_product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe_line" ADD CONSTRAINT "FK_f5194bfe9a01381fb63c6e9d417" FOREIGN KEY ("supply_variant_id") REFERENCES "variant"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe_line" ADD CONSTRAINT "FK_8625fa571c9ae8768202e8ecc03" FOREIGN KEY ("raw_material_id") REFERENCES "supplies"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe" ADD CONSTRAINT "FK_4c45610bdaf18f053cb5a2b5b32" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe" ADD CONSTRAINT "FK_5cdb7707a0cdf3214fd9f669b1d" FOREIGN KEY ("finished_product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe" ADD CONSTRAINT "FK_4f5cdc926c4ac117dcfc516ff34" FOREIGN KEY ("finished_variant_id") REFERENCES "variant"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_items" ADD CONSTRAINT "FK_9f35634152710322f0296938400" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_taxes" ADD CONSTRAINT "FK_f99c0b5f9ddfcb4231d617ff444" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_taxes" ADD CONSTRAINT "FK_3d8cc0d599dc3009f9bbdf6577e" FOREIGN KEY ("receipt_item_id") REFERENCES "receipt_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tips" ADD CONSTRAINT "FK_5341c0f93f5947ed02015f4a896" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tips" ADD CONSTRAINT "FK_6175a70437e75e396651d25e56d" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tips" ADD CONSTRAINT "FK_8e4fdcabccb18060213413bd5ed" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_pools" ADD CONSTRAINT "FK_8f8169976e1061d45e637e34c5b" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_pools" ADD CONSTRAINT "FK_48a5f6d095d5fb09f82ad1797f2" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_pools" ADD CONSTRAINT "FK_9bd75ea623f6b41c7c9b8c07177" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_pool_members" ADD CONSTRAINT "FK_c49e08a71dcd34201f341b8b4ec" FOREIGN KEY ("tip_pool_id") REFERENCES "tip_pools"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_pool_members" ADD CONSTRAINT "FK_e64173cc9d300b3b03e7367df2b" FOREIGN KEY ("collaborator_id") REFERENCES "collaborator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_allocations" ADD CONSTRAINT "FK_a39be61a199711d055652bbcafd" FOREIGN KEY ("tip_id") REFERENCES "tips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_allocations" ADD CONSTRAINT "FK_e807ecfa97fc19ba38b1a0987e1" FOREIGN KEY ("collaborator_id") REFERENCES "collaborator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_allocations" ADD CONSTRAINT "FK_e88e19d421cd941556d3cb2231b" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_tip_movements" ADD CONSTRAINT "FK_de7df945c76cc4ff3fd7a5f55ca" FOREIGN KEY ("cash_drawer_id") REFERENCES "cash_drawer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_tip_movements" ADD CONSTRAINT "FK_eeb96a41b9182cd8521ae945944" FOREIGN KEY ("tip_id") REFERENCES "tips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_guests" ADD CONSTRAINT "FK_470205da22df04a29160ebb9d37" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_notes" ADD CONSTRAINT "FK_750bda94c8d7238a868122878a5" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_status_history" ADD CONSTRAINT "FK_2d4af05477181b4ca7128a6cfc3" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_c3d2e556d2e983c89799bd05bc1" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_f63cb79a34cdf2d47ab23f31a8b" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_tables" ADD CONSTRAINT "FK_42b25dfe200c194d3ff52a11b43" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_tables" ADD CONSTRAINT "FK_f6bef828da716ddc01cca3c4705" FOREIGN KEY ("table_id") REFERENCES "table"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_event_log" ADD CONSTRAINT "FK_0e6e354055cfba7b8f68ae000a6" FOREIGN KEY ("kitchen_order_id") REFERENCES "kitchen_order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_event_log" ADD CONSTRAINT "FK_226eb0ffd5e67485b273827944f" FOREIGN KEY ("kitchen_order_item_id") REFERENCES "kitchen_order_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_event_log" ADD CONSTRAINT "FK_c56bd0b443a95709758fcf0bc4f" FOREIGN KEY ("station_id") REFERENCES "kitchen_station"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_event_log" ADD CONSTRAINT "FK_da09beb32407846f20c032bc330" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_display_device" ADD CONSTRAINT "FK_ba4618997503b7f44b74eb0959a" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_display_device" ADD CONSTRAINT "FK_8d95b0f1824d94f78572ecbf137" FOREIGN KEY ("station_id") REFERENCES "kitchen_station"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_movements" ADD CONSTRAINT "FK_a7dd9378a61295e20a9f79e1b0c" FOREIGN KEY ("shift_id") REFERENCES "cash_shifts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_movements" ADD CONSTRAINT "FK_798030be2b2ae79a0b538e98f73" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_drawer_history" ADD CONSTRAINT "FK_8201a64bf67c0d0a34d22491576" FOREIGN KEY ("cash_drawer_id") REFERENCES "cash_drawer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_drawer_history" ADD CONSTRAINT "FK_a5186084454e9f6208f94708792" FOREIGN KEY ("opened_by") REFERENCES "collaborator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_drawer_history" ADD CONSTRAINT "FK_d9c4d552d570319d883ca74d150" FOREIGN KEY ("closed_by") REFERENCES "collaborator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "FK_fd28bcd8b91660d0ef54267e9cd" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_segments" ADD CONSTRAINT "FK_eecb1f04ee19185d15cb2ab234f" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_segment_rules" ADD CONSTRAINT "FK_b8896dfa807766a479d239b759d" FOREIGN KEY ("segment_id") REFERENCES "marketing_segments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_automations" ADD CONSTRAINT "FK_d3c7706a6145fb4aa476f0a6aa5" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_message_logs" ADD CONSTRAINT "FK_60f667efa8bcd2e8949ef31804d" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_message_logs" ADD CONSTRAINT "FK_657b89fbd8f982ccf2536549009" FOREIGN KEY ("automation_id") REFERENCES "marketing_automations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_message_logs" ADD CONSTRAINT "FK_ea479329413a06aa8c973777462" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_coupons" ADD CONSTRAINT "FK_67e39882acddda1e6e235474c0f" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_coupon_redemptions" ADD CONSTRAINT "FK_1763e3e053d15e8675809f7b386" FOREIGN KEY ("coupon_id") REFERENCES "marketing_coupons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_coupon_redemptions" ADD CONSTRAINT "FK_7a80f0e076a808a3ba3939cf8d5" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_coupon_redemptions" ADD CONSTRAINT "FK_360bfa77556a5fb3b04bf38fb96" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_campaign_audience" ADD CONSTRAINT "FK_c37272c652fd12eadb008b567c7" FOREIGN KEY ("marketing_campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_campaign_audience" ADD CONSTRAINT "FK_5536a22de5b57acbfdb1812d78b" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_automation_actions" ADD CONSTRAINT "FK_cd2b0819992471f4f884ccd7a9e" FOREIGN KEY ("automation_id") REFERENCES "marketing_automations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_points_locks" ADD CONSTRAINT "FK_3da7dc797c1bd1c1cdf56461db0" FOREIGN KEY ("loyalty_customer_id") REFERENCES "loyalty_customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_points_locks" ADD CONSTRAINT "FK_5cde5c5b7c7c296c4cad9de4fec" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_runs" ADD CONSTRAINT "FK_80b8c94472202fe66289580a6b1" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_runs" ADD CONSTRAINT "FK_0340e4ce523518fe5444e35e36c" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_entries" ADD CONSTRAINT "FK_9709571e91a123bfe3784472fd8" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_entries" ADD CONSTRAINT "FK_0ebf69f105c11d624bdb7977af8" FOREIGN KEY ("collaborator_id") REFERENCES "collaborator"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_tax_details" ADD CONSTRAINT "FK_5aa32b317130c96254595707f2d" FOREIGN KEY ("payroll_entry_id") REFERENCES "payroll_entries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "FK_9ed61b896311a8bed8fcd1f8e55" FOREIGN KEY ("payroll_entry_id") REFERENCES "payroll_entries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD CONSTRAINT "FK_cd2c12c9a45c8bd116caaaf94bf" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD CONSTRAINT "FK_8a9f4c74834d159a3d750d81d2e" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD CONSTRAINT "FK_cd8bdebfcf4b2f37231f5ff8017" FOREIGN KEY ("collaborator_id") REFERENCES "collaborator"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD CONSTRAINT "FK_b2111b10208367d571e4b56c553" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collaborator_contracts" ADD CONSTRAINT "FK_959b62a541718271ffd7c9fe298" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collaborator_contracts" ADD CONSTRAINT "FK_2128d693d02191db6bb1c0a8767" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collaborator_contracts" ADD CONSTRAINT "FK_c7c4ff4d2225b94ec87e7b0f165" FOREIGN KEY ("collaborator_id") REFERENCES "collaborator"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collaborator_contract_revisions" ADD CONSTRAINT "FK_3b6822d2f71d48c217bcb8842b4" FOREIGN KEY ("contract_id") REFERENCES "collaborator_contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_payment_items" ADD CONSTRAINT "FK_6511242c952bb3d96145e8fe607" FOREIGN KEY ("payment_id") REFERENCES "supplier_payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_payments" ADD CONSTRAINT "FK_220694212ec38b4aa2fb02ed622" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_payments" ADD CONSTRAINT "FK_e8e091c424c8bbecb589b207b06" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_credit_notes" ADD CONSTRAINT "FK_3a5812a0a2f799f73897ccf4498" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_credit_notes" ADD CONSTRAINT "FK_58ffa83156ab9e1a1ce3852c0b8" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "FK_944a6532dd40474cc432e90062b" FOREIGN KEY ("payment_id") REFERENCES "supplier_payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "FK_e7965872607acedb9f911a16bca" FOREIGN KEY ("credit_note_id") REFERENCES "supplier_credit_notes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" ADD CONSTRAINT "FK_435ac51210483ad504efff69a40" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_accounts" ADD CONSTRAINT "FK_c9556b5ccb181617dc17bf64e6d" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_accounts" ADD CONSTRAINT "FK_c1c583c8d2aeae33192fc1c773e" FOREIGN KEY ("parent_account_id") REFERENCES "ledger_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "FK_9a54f62140d93c608634baad589" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "FK_4a4fcd732e7b109880444ebc9c1" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_menu" ADD CONSTRAINT "FK_20d1de6c38509f6196ca83a25af" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_location" ADD CONSTRAINT "FK_35984ff5fbecb4279abc3844836" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_location" ADD CONSTRAINT "FK_f894685304377830a7ced7fd9c6" FOREIGN KEY ("qr_menu_id") REFERENCES "qr_menu"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_location" ADD CONSTRAINT "FK_d4975cbe84d90318c6fd525d228" FOREIGN KEY ("table_id") REFERENCES "table"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order" ADD CONSTRAINT "FK_d01ef1436cbcaaacaffe7b8db3b" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order" ADD CONSTRAINT "FK_e9abce343c4c2965a768aeb7905" FOREIGN KEY ("qr_location_id") REFERENCES "qr_location"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order" ADD CONSTRAINT "FK_de03fb030ec7e288044760a8417" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order" ADD CONSTRAINT "FK_02218069d17dbef98de27d91517" FOREIGN KEY ("table_id") REFERENCES "table"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order" ADD CONSTRAINT "FK_34c307f699f78a57209245a36e0" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order_item" ADD CONSTRAINT "FK_046f8dc293f275ea1927d8ead98" FOREIGN KEY ("qr_order_id") REFERENCES "qr_order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order_item" ADD CONSTRAINT "FK_87ef8f05e1344ee701ddecfd55d" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order_item" ADD CONSTRAINT "FK_aa9870209360cad8681bcadb8eb" FOREIGN KEY ("variant_id") REFERENCES "variant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_menu_section" ADD CONSTRAINT "FK_4a9ae9b73c3f70082c451792afb" FOREIGN KEY ("qr_menu_id") REFERENCES "qr_menu"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_menu_item" ADD CONSTRAINT "FK_6013b008a92567a1d61bdf8ca75" FOREIGN KEY ("qr_menu_section_id") REFERENCES "qr_menu_section"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_menu_item" ADD CONSTRAINT "FK_66f951a4202ac51b716e2525163" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_menu_item" ADD CONSTRAINT "FK_1b91081cc5e4aeb1b5219532809" FOREIGN KEY ("variant_id") REFERENCES "variant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_payment" ADD CONSTRAINT "FK_93e232de4f3dc710257c6b2ae00" FOREIGN KEY ("online_order_id") REFERENCES "online_order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_menu" ADD CONSTRAINT "FK_49cb7796837eeb7122a8326186d" FOREIGN KEY ("store_id") REFERENCES "online_store"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_menu_item" ADD CONSTRAINT "FK_523a21e194f9e79c848f5fda336" FOREIGN KEY ("menu_id") REFERENCES "online_menu"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_menu_item" ADD CONSTRAINT "FK_7c40cebad6fbbdb9bd54730ae23" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_menu_item" ADD CONSTRAINT "FK_be5b62c3ec0c9ec39d62b701092" FOREIGN KEY ("variant_id") REFERENCES "variant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_menu_category" ADD CONSTRAINT "FK_a7a464d30b13898c83f8aeeb513" FOREIGN KEY ("menu_id") REFERENCES "online_menu"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_menu_category" ADD CONSTRAINT "FK_dad0f3fbd1a99ca78298bcd8a0d" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_delivery_info" ADD CONSTRAINT "FK_c173eb4d8980195a2e6bbead8de" FOREIGN KEY ("online_order_id") REFERENCES "online_order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_zones" ADD CONSTRAINT "FK_e16831cdb8098e190687ac1448f" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_drivers" ADD CONSTRAINT "FK_3d0a5f4c220109bb1d125d364f0" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_assignments" ADD CONSTRAINT "FK_3442216f1a3836b6e3a97c3e729" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_assignments" ADD CONSTRAINT "FK_f962a3c7e582d24e7e74be155c8" FOREIGN KEY ("delivery_driver_id") REFERENCES "delivery_drivers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_tracking" ADD CONSTRAINT "FK_e38fb0cc53fe1b8d3b88854b87b" FOREIGN KEY ("delivery_assignment_id") REFERENCES "delivery_assignments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_fees" ADD CONSTRAINT "FK_5bde91a7a378e3bd87cfd68d2ff" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    // Índices únicos parciales (solo filas OPEN / activas). NULLS NOT DISTINCT
    // (Postgres 15+) hace que un producto sin variante tampoco se repita.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_cash_shifts_open_per_drawer" ON "cash_shifts" ("cash_drawer_id") WHERE "status" = 'OPEN'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_stock_item_product_variant_location" ON "stock_item" ("productId", "variantId", "locationId") NULLS NOT DISTINCT WHERE "isActive" AND "productId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_stock_item_supply_location" ON "stock_item" ("supply_id", "locationId") WHERE "isActive" AND "supply_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "delivery_fees" DROP CONSTRAINT "FK_5bde91a7a378e3bd87cfd68d2ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_tracking" DROP CONSTRAINT "FK_e38fb0cc53fe1b8d3b88854b87b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_assignments" DROP CONSTRAINT "FK_f962a3c7e582d24e7e74be155c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_assignments" DROP CONSTRAINT "FK_3442216f1a3836b6e3a97c3e729"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_drivers" DROP CONSTRAINT "FK_3d0a5f4c220109bb1d125d364f0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_zones" DROP CONSTRAINT "FK_e16831cdb8098e190687ac1448f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_delivery_info" DROP CONSTRAINT "FK_c173eb4d8980195a2e6bbead8de"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_menu_category" DROP CONSTRAINT "FK_dad0f3fbd1a99ca78298bcd8a0d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_menu_category" DROP CONSTRAINT "FK_a7a464d30b13898c83f8aeeb513"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_menu_item" DROP CONSTRAINT "FK_be5b62c3ec0c9ec39d62b701092"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_menu_item" DROP CONSTRAINT "FK_7c40cebad6fbbdb9bd54730ae23"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_menu_item" DROP CONSTRAINT "FK_523a21e194f9e79c848f5fda336"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_menu" DROP CONSTRAINT "FK_49cb7796837eeb7122a8326186d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_payment" DROP CONSTRAINT "FK_93e232de4f3dc710257c6b2ae00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_menu_item" DROP CONSTRAINT "FK_1b91081cc5e4aeb1b5219532809"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_menu_item" DROP CONSTRAINT "FK_66f951a4202ac51b716e2525163"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_menu_item" DROP CONSTRAINT "FK_6013b008a92567a1d61bdf8ca75"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_menu_section" DROP CONSTRAINT "FK_4a9ae9b73c3f70082c451792afb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order_item" DROP CONSTRAINT "FK_aa9870209360cad8681bcadb8eb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order_item" DROP CONSTRAINT "FK_87ef8f05e1344ee701ddecfd55d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order_item" DROP CONSTRAINT "FK_046f8dc293f275ea1927d8ead98"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order" DROP CONSTRAINT "FK_34c307f699f78a57209245a36e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order" DROP CONSTRAINT "FK_02218069d17dbef98de27d91517"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order" DROP CONSTRAINT "FK_de03fb030ec7e288044760a8417"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order" DROP CONSTRAINT "FK_e9abce343c4c2965a768aeb7905"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_order" DROP CONSTRAINT "FK_d01ef1436cbcaaacaffe7b8db3b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_location" DROP CONSTRAINT "FK_d4975cbe84d90318c6fd525d228"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_location" DROP CONSTRAINT "FK_f894685304377830a7ced7fd9c6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_location" DROP CONSTRAINT "FK_35984ff5fbecb4279abc3844836"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qr_menu" DROP CONSTRAINT "FK_20d1de6c38509f6196ca83a25af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entry_lines" DROP CONSTRAINT "FK_4a4fcd732e7b109880444ebc9c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entry_lines" DROP CONSTRAINT "FK_9a54f62140d93c608634baad589"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_accounts" DROP CONSTRAINT "FK_c1c583c8d2aeae33192fc1c773e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_accounts" DROP CONSTRAINT "FK_c9556b5ccb181617dc17bf64e6d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" DROP CONSTRAINT "FK_435ac51210483ad504efff69a40"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_payment_allocations" DROP CONSTRAINT "FK_e7965872607acedb9f911a16bca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_payment_allocations" DROP CONSTRAINT "FK_944a6532dd40474cc432e90062b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_credit_notes" DROP CONSTRAINT "FK_58ffa83156ab9e1a1ce3852c0b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_credit_notes" DROP CONSTRAINT "FK_3a5812a0a2f799f73897ccf4498"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_payments" DROP CONSTRAINT "FK_e8e091c424c8bbecb589b207b06"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_payments" DROP CONSTRAINT "FK_220694212ec38b4aa2fb02ed622"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_payment_items" DROP CONSTRAINT "FK_6511242c952bb3d96145e8fe607"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collaborator_contract_revisions" DROP CONSTRAINT "FK_3b6822d2f71d48c217bcb8842b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collaborator_contracts" DROP CONSTRAINT "FK_c7c4ff4d2225b94ec87e7b0f165"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collaborator_contracts" DROP CONSTRAINT "FK_2128d693d02191db6bb1c0a8767"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collaborator_contracts" DROP CONSTRAINT "FK_959b62a541718271ffd7c9fe298"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" DROP CONSTRAINT "FK_b2111b10208367d571e4b56c553"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" DROP CONSTRAINT "FK_cd8bdebfcf4b2f37231f5ff8017"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" DROP CONSTRAINT "FK_8a9f4c74834d159a3d750d81d2e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" DROP CONSTRAINT "FK_cd2c12c9a45c8bd116caaaf94bf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_adjustments" DROP CONSTRAINT "FK_9ed61b896311a8bed8fcd1f8e55"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_tax_details" DROP CONSTRAINT "FK_5aa32b317130c96254595707f2d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_entries" DROP CONSTRAINT "FK_0ebf69f105c11d624bdb7977af8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_entries" DROP CONSTRAINT "FK_9709571e91a123bfe3784472fd8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_runs" DROP CONSTRAINT "FK_0340e4ce523518fe5444e35e36c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_runs" DROP CONSTRAINT "FK_80b8c94472202fe66289580a6b1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_points_locks" DROP CONSTRAINT "FK_5cde5c5b7c7c296c4cad9de4fec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_points_locks" DROP CONSTRAINT "FK_3da7dc797c1bd1c1cdf56461db0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_automation_actions" DROP CONSTRAINT "FK_cd2b0819992471f4f884ccd7a9e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_campaign_audience" DROP CONSTRAINT "FK_5536a22de5b57acbfdb1812d78b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_campaign_audience" DROP CONSTRAINT "FK_c37272c652fd12eadb008b567c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_coupon_redemptions" DROP CONSTRAINT "FK_360bfa77556a5fb3b04bf38fb96"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_coupon_redemptions" DROP CONSTRAINT "FK_7a80f0e076a808a3ba3939cf8d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_coupon_redemptions" DROP CONSTRAINT "FK_1763e3e053d15e8675809f7b386"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_coupons" DROP CONSTRAINT "FK_67e39882acddda1e6e235474c0f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_message_logs" DROP CONSTRAINT "FK_ea479329413a06aa8c973777462"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_message_logs" DROP CONSTRAINT "FK_657b89fbd8f982ccf2536549009"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_message_logs" DROP CONSTRAINT "FK_60f667efa8bcd2e8949ef31804d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_automations" DROP CONSTRAINT "FK_d3c7706a6145fb4aa476f0a6aa5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_segment_rules" DROP CONSTRAINT "FK_b8896dfa807766a479d239b759d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_segments" DROP CONSTRAINT "FK_eecb1f04ee19185d15cb2ab234f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketing_campaigns" DROP CONSTRAINT "FK_fd28bcd8b91660d0ef54267e9cd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_drawer_history" DROP CONSTRAINT "FK_d9c4d552d570319d883ca74d150"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_drawer_history" DROP CONSTRAINT "FK_a5186084454e9f6208f94708792"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_drawer_history" DROP CONSTRAINT "FK_8201a64bf67c0d0a34d22491576"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_movements" DROP CONSTRAINT "FK_798030be2b2ae79a0b538e98f73"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_movements" DROP CONSTRAINT "FK_a7dd9378a61295e20a9f79e1b0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_display_device" DROP CONSTRAINT "FK_8d95b0f1824d94f78572ecbf137"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_display_device" DROP CONSTRAINT "FK_ba4618997503b7f44b74eb0959a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_event_log" DROP CONSTRAINT "FK_da09beb32407846f20c032bc330"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_event_log" DROP CONSTRAINT "FK_c56bd0b443a95709758fcf0bc4f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_event_log" DROP CONSTRAINT "FK_226eb0ffd5e67485b273827944f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_event_log" DROP CONSTRAINT "FK_0e6e354055cfba7b8f68ae000a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_tables" DROP CONSTRAINT "FK_f6bef828da716ddc01cca3c4705"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_tables" DROP CONSTRAINT "FK_42b25dfe200c194d3ff52a11b43"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_f63cb79a34cdf2d47ab23f31a8b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_c3d2e556d2e983c89799bd05bc1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_status_history" DROP CONSTRAINT "FK_2d4af05477181b4ca7128a6cfc3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_notes" DROP CONSTRAINT "FK_750bda94c8d7238a868122878a5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_guests" DROP CONSTRAINT "FK_470205da22df04a29160ebb9d37"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_tip_movements" DROP CONSTRAINT "FK_eeb96a41b9182cd8521ae945944"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_tip_movements" DROP CONSTRAINT "FK_de7df945c76cc4ff3fd7a5f55ca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_allocations" DROP CONSTRAINT "FK_e88e19d421cd941556d3cb2231b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_allocations" DROP CONSTRAINT "FK_e807ecfa97fc19ba38b1a0987e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_allocations" DROP CONSTRAINT "FK_a39be61a199711d055652bbcafd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_pool_members" DROP CONSTRAINT "FK_e64173cc9d300b3b03e7367df2b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_pool_members" DROP CONSTRAINT "FK_c49e08a71dcd34201f341b8b4ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_pools" DROP CONSTRAINT "FK_9bd75ea623f6b41c7c9b8c07177"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_pools" DROP CONSTRAINT "FK_48a5f6d095d5fb09f82ad1797f2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_pools" DROP CONSTRAINT "FK_8f8169976e1061d45e637e34c5b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tips" DROP CONSTRAINT "FK_8e4fdcabccb18060213413bd5ed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tips" DROP CONSTRAINT "FK_6175a70437e75e396651d25e56d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tips" DROP CONSTRAINT "FK_5341c0f93f5947ed02015f4a896"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_taxes" DROP CONSTRAINT "FK_3d8cc0d599dc3009f9bbdf6577e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_taxes" DROP CONSTRAINT "FK_f99c0b5f9ddfcb4231d617ff444"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_items" DROP CONSTRAINT "FK_9f35634152710322f0296938400"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe" DROP CONSTRAINT "FK_4f5cdc926c4ac117dcfc516ff34"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe" DROP CONSTRAINT "FK_5cdb7707a0cdf3214fd9f669b1d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe" DROP CONSTRAINT "FK_4c45610bdaf18f053cb5a2b5b32"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe_line" DROP CONSTRAINT "FK_8625fa571c9ae8768202e8ecc03"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe_line" DROP CONSTRAINT "FK_f5194bfe9a01381fb63c6e9d417"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe_line" DROP CONSTRAINT "FK_e89aa1cbfd3fed5f817a0f30a4b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe_line" DROP CONSTRAINT "FK_a78a5c5b836b3c2418721198ca7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_recipe_line" DROP CONSTRAINT "FK_77be922580bdb4b90f5cbec1a85"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_stock_alert" DROP CONSTRAINT "FK_e87b106e077506008550779fe93"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_stock_alert" DROP CONSTRAINT "FK_17171ad3ecdc84fdaf36a56ed7c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_stock_alert" DROP CONSTRAINT "FK_f8ff22aff05ea99760fec148a06"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_stock_alert" DROP CONSTRAINT "FK_9485521796cecb310cbb13d1b41"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_stock_alert" DROP CONSTRAINT "FK_60915740657e228c397ebe67ab0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_stock_alert" DROP CONSTRAINT "FK_85e62371c8eb0fca308c1d4c373"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_applications" DROP CONSTRAINT "FK_8f7c239baf8c1b1a25171353fb7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_applications" DROP CONSTRAINT "FK_02aab4ababf2391e492da621264"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_features" DROP CONSTRAINT "FK_27e866bdf4c6f2cf5854b7d0e57"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_features" DROP CONSTRAINT "FK_e1a23af2ad3dc02af893d510de7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_applications" DROP CONSTRAINT "FK_fce39af633bdc6e0847eda8cf23"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_applications" DROP CONSTRAINT "FK_1f538b99ff20b3fe5c1caf454d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_applications" DROP CONSTRAINT "FK_5fe81d28fa5c3a4a782a55204ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" DROP CONSTRAINT "FK_8b68e73bad65dc9449b55725dfc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" DROP CONSTRAINT "FK_eebfcdfc544379ebbf73bbb0bea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" DROP CONSTRAINT "FK_c49de0bffcf48582403845263da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" DROP CONSTRAINT "FK_fc3858421bceb3ee2fb8e0c0da9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_subscription" DROP CONSTRAINT "FK_6da40fa9198cbd9174e6eb6a0ed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_subscription" DROP CONSTRAINT "FK_f8b117158ab95f921469ff24a3e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_af94df2e060180b6043d5e45042"`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant" DROP CONSTRAINT "FK_52e783bcdaeb35ff09c4e438f8f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant" DROP CONSTRAINT "FK_bc4dfecbbf72ab80b1ce9cc0123"`,
    );
    await queryRunner.query(
      `ALTER TABLE "configuration" DROP CONSTRAINT "FK_a2bd3c1661eabc2108a779a6ddb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "configuration" DROP CONSTRAINT "FK_16b2f8865fcacd0602b8685335c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "configuration" DROP CONSTRAINT "FK_f803251c1f91cfb4f6583521c90"`,
    );
    await queryRunner.query(
      `ALTER TABLE "configuration" DROP CONSTRAINT "FK_b041bdc17c33aa36063e2a33f34"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer" DROP CONSTRAINT "FK_a9d874b83a7879be8538bf08b09"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer" DROP CONSTRAINT "FK_23778827c741b8937b565a59293"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_a47d559598368bc78800dd5175b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_3350ff300ac6830b9a9d1c752fc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_a99c67e713ffa08f499b2c79d57"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_7dcc61fd46b90b6bfa732109042"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_3d36410e89a795172fa6e0dd968"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_2474866c8f8e9196ff227a7cbbd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_settlements" DROP CONSTRAINT "FK_4947f7311096135d84c9d5156ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_settlements" DROP CONSTRAINT "FK_f86e455bd3590505a7cdf481425"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_settlements" DROP CONSTRAINT "FK_099cadc42ff26a41e8dec8db08e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tip_settlements" DROP CONSTRAINT "FK_aa3a49a150a55aa510f9e087fab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_taxes" DROP CONSTRAINT "FK_eb520307d57426aff4fda28244e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payments" DROP CONSTRAINT "FK_5d2ebca202f9d9370a001a571ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipts" DROP CONSTRAINT "FK_9545ae8fc5f7714cd8a807dd937"`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant_subscription" DROP CONSTRAINT "FK_2551a84cbf9f79d7b7af98072d1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant_subscription" DROP CONSTRAINT "FK_b45f5e802db4cb9117825587a25"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plan_display_feature" DROP CONSTRAINT "FK_a97e913b2163b358564e98ec9ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order" DROP CONSTRAINT "FK_1f8c094f83a9d3c11bbe5063af6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order" DROP CONSTRAINT "FK_294d2dd8a04986080135f48625a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order" DROP CONSTRAINT "FK_2da23ed974aec101e39d1b909c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order" DROP CONSTRAINT "FK_51234ae099bef6793d64c307b40"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order_item" DROP CONSTRAINT "FK_74a20e29d25f2e62a5059af4ce8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order_item" DROP CONSTRAINT "FK_322dfb7de76edfce3e0cb4ee681"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order_item" DROP CONSTRAINT "FK_74b1e053f86dee00fc92ac1c07a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_order_item" DROP CONSTRAINT "FK_ff7eb1ae4fa7f21df483b6cba15"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" DROP CONSTRAINT "FK_5ec7e78e89629cd9ad98e9ff633"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kitchen_station" DROP CONSTRAINT "FK_dc648adc230d215cb9e9248d3db"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order" DROP CONSTRAINT "FK_abdc5bcfb0728453441e8c4064d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order" DROP CONSTRAINT "FK_e0cf7088781e84ceac75a71ca8d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order" DROP CONSTRAINT "FK_f7633489fcf55fede38a2d5f5ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order" DROP CONSTRAINT "FK_bf06fc1fe061464d7145e2fed7b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order_item" DROP CONSTRAINT "FK_ad9aff30045bb6bda3b533ba744"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order_item" DROP CONSTRAINT "FK_c70fd7a84783f4fd577d26f8b8d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order_item" DROP CONSTRAINT "FK_f2b05f3920321d575a43eb9aa3e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_order_item" DROP CONSTRAINT "FK_186128068aa204bba59d47024ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_6312e502a3cc8068671253bdbaf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_5e17c017aa3f5164cb2da5b1c6b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_e9674a6053adbaa1057848cddfa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item_modifiers" DROP CONSTRAINT "FK_e8ec685225f6710f5ce06a8ffff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item_modifiers" DROP CONSTRAINT "FK_1f6709a805b8bcafe0bda11edbf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "FK_4346e4adb741e80f3711ee09ba4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "FK_ff0c0301a95e517153df97f6812"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "FK_62fcc319202f6ec1f6819e1d5f5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "modifier" DROP CONSTRAINT "FK_8506b06b24c0aa4d4d711a5f0f2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "modifier" DROP CONSTRAINT "FK_5c02e59829c5e0f2311c2aff1b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "variant" DROP CONSTRAINT "FK_cb0df5c8d79ac0ea08a87119673"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_item" DROP CONSTRAINT "FK_79569e763910987b7685d69244d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_item" DROP CONSTRAINT "FK_305aff91e6e66d693a33530b0cd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_item" DROP CONSTRAINT "FK_6024c402fedf13cf77e627f2ec7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_item" DROP CONSTRAINT "FK_541552503e8c80053f8ccda754e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movement" DROP CONSTRAINT "FK_eba3c566c5d160ba7ae233fe92e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movement" DROP CONSTRAINT "FK_1d81dbe4f82a4b389ce514f2a92"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movement" DROP CONSTRAINT "FK_96249b84ebaa98a2a796f2eae1e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movement" DROP CONSTRAINT "FK_d17af3e00e35ed92d29da07e56d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movement" DROP CONSTRAINT "FK_3941af41b7cdd5178fe804b0923"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movement" DROP CONSTRAINT "FK_77ba473461d8613d4c171367755"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movement" DROP CONSTRAINT "FK_7a78658cd8325aaa00571368507"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoices" DROP CONSTRAINT "FK_1c85b2d278b6b6f3ab2ea9dc582"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoices" DROP CONSTRAINT "FK_8912d8dc59ffc89931161b3a5d6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoice_items" DROP CONSTRAINT "FK_b669aea1db60f02df62748cd68c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoice_items" DROP CONSTRAINT "FK_8b79bfa4ae4700f5870c5503a3c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoice_items" DROP CONSTRAINT "FK_2e84dd67055562c4db05c0886ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier" DROP CONSTRAINT "FK_3e3ed41fe5a4f5ea801e2e55dad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order" DROP CONSTRAINT "FK_e4ea5841622429c12889a487f31"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order" DROP CONSTRAINT "FK_cd5b5d261e431bc310bc7f76b07"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_item" DROP CONSTRAINT "FK_167a9995d0518384c53e7e82bd6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_item" DROP CONSTRAINT "FK_70a51e1ec3debaac6d7641c0d3d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_item" DROP CONSTRAINT "FK_866df188f9dec7ff644e8292bbf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_item" DROP CONSTRAINT "FK_3064ddc2f33fbc5b09f53cee561"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_item" DROP CONSTRAINT "FK_13ef910b84865fed2a2799dea55"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplies" DROP CONSTRAINT "FK_59589e06003348b05247ee482a4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplies" DROP CONSTRAINT "FK_77d8fe3e7226a9895da5443f607"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_suppliers" DROP CONSTRAINT "FK_2f819882723967d35f0cab0fac0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supply_suppliers" DROP CONSTRAINT "FK_ea9aebe884e8031de8d47ebf93c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "raw_material_categories" DROP CONSTRAINT "FK_15a68987ca2835664111de7fc96"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_location" DROP CONSTRAINT "FK_9d4808a02440115f0614ecb78ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "category" DROP CONSTRAINT "FK_d5456fd7e4c4866fec8ada1fa10"`,
    );
    await queryRunner.query(
      `ALTER TABLE "category" DROP CONSTRAINT "FK_5f44aa02d1c66d9a916a409fcb2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_reward" DROP CONSTRAINT "FK_e9708ba10f4b7566a68bded63af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_reward" DROP CONSTRAINT "FK_68518986f2d322afd9c93336d4f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_programs" DROP CONSTRAINT "FK_149e92c26e6ac9ce25e896a1e20"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_tiers" DROP CONSTRAINT "FK_197ccdd3ed20bc29c89138ae694"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_customers" DROP CONSTRAINT "FK_d7cb8aacf4f9b0aae5d1762b8c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_customers" DROP CONSTRAINT "FK_32a594135702a9afad109059175"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_customers" DROP CONSTRAINT "FK_2becebbc63e2bd5356c91a31521"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_coupons" DROP CONSTRAINT "FK_40fc3aee9c03929d01afb900e55"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_coupons" DROP CONSTRAINT "FK_c2822c6c11b344232eba3b6ce58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_coupons" DROP CONSTRAINT "FK_4dde3972deabf43f87aa5cd7883"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_rewards_redemptions" DROP CONSTRAINT "FK_cb6fc2003ce32da50afe7c98224"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_rewards_redemptions" DROP CONSTRAINT "FK_9a39e12112f2fab85a763a53082"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_rewards_redemptions" DROP CONSTRAINT "FK_db2665c4148dc788efc4bd807b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_point_transactions" DROP CONSTRAINT "FK_6f5e100eefe2fbb2593d27958c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_point_transactions" DROP CONSTRAINT "FK_348362221ff94d7ed4ec384c9b3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loyalty_point_transactions" DROP CONSTRAINT "FK_4a79a8569709b81b7d77cbab276"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_transactions" DROP CONSTRAINT "FK_c1ce95f2a4eddbfb4a3affb21c4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_transactions" DROP CONSTRAINT "FK_430f10122cfdd3233233fe4f5d6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_transactions" DROP CONSTRAINT "FK_6becd980679a9a8814cf3a50592"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_transactions" DROP CONSTRAINT "FK_41c8614c32afab1c987f6fb779c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_drawer" DROP CONSTRAINT "FK_af544adf8d916b2213f5a24d584"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_drawer" DROP CONSTRAINT "FK_7caca0ceb13e72cf5e8277f04d0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_drawer" DROP CONSTRAINT "FK_9574b2547bba42825ddd547f553"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_drawer" DROP CONSTRAINT "FK_9efca904f8a684462a07b2f7449"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_shifts" DROP CONSTRAINT "FK_35eef7fa2fb037c7716bab94485"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_shifts" DROP CONSTRAINT "FK_8b463baf9f9620382e7b29b54da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_shifts" DROP CONSTRAINT "FK_953758d874b680d18d9a0bf7182"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_shifts" DROP CONSTRAINT "FK_a43ba42d36a4e48027671cbe520"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift" DROP CONSTRAINT "FK_30fd5f210426ec4428f3e1fbe9b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_assignment" DROP CONSTRAINT "FK_6b3dba51376aa61dc7cef49ae4a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_assignment" DROP CONSTRAINT "FK_eee9dd774a06c0b967d75e370d1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collaborator" DROP CONSTRAINT "FK_a4c4ba9ce46126d8292d7d2f592"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collaborator" DROP CONSTRAINT "FK_2a72d33b4cbbfcfa3c6c7944338"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collaborator" DROP CONSTRAINT "FK_2b516ff163b9e85cb9adecc76c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_assignments" DROP CONSTRAINT "FK_25c30478c36cd23e327ab351976"`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_assignments" DROP CONSTRAINT "FK_fb7947dc40b1939907e11fa8d1d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_assignments" DROP CONSTRAINT "FK_3c76c8edb5d70fdce40f6d828f2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "table" DROP CONSTRAINT "FK_a3bc43edcb4621ee5776382d43c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "table" DROP CONSTRAINT "FK_a740330267115bc03fa954995a0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "table" DROP CONSTRAINT "FK_8dabf016c96c83e8cb6917308b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "table" DROP CONSTRAINT "FK_bb9e69b6b07d00857e1b459df92"`,
    );
    await queryRunner.query(
      `ALTER TABLE "floor_zone" DROP CONSTRAINT "FK_f95ae1771a1322480413b68d3d8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "floor_zone" DROP CONSTRAINT "FK_153018cdb11a4ece3e7a50dab87"`,
    );
    await queryRunner.query(
      `ALTER TABLE "floor_plan" DROP CONSTRAINT "FK_45352eca61ea0cb09624b61a88d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_store" DROP CONSTRAINT "FK_c35a9ae0af93e2b7ea3b5805f4c"`,
    );
    await queryRunner.query(`DROP TABLE "delivery_fees"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6f1df8583adfd346d8a8c4e425"`,
    );
    await queryRunner.query(`DROP TABLE "delivery_tracking"`);
    await queryRunner.query(
      `DROP INDEX "public"."uq_delivery_assignments_external_delivery"`,
    );
    await queryRunner.query(`DROP TABLE "delivery_assignments"`);
    await queryRunner.query(
      `DROP TYPE "public"."delivery_assignments_delivery_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."delivery_assignments_assignment_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "delivery_drivers"`);
    await queryRunner.query(`DROP TABLE "delivery_zones"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c173eb4d8980195a2e6bbead8d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7627ff9c3310c67f6ac42d03b2"`,
    );
    await queryRunner.query(`DROP TABLE "online_delivery_info"`);
    await queryRunner.query(
      `DROP TYPE "public"."online_delivery_info_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1e44ac6f19e36ab67bf5a005d2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dad0f3fbd1a99ca78298bcd8a0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6634aa5aca7af736f802e9a79c"`,
    );
    await queryRunner.query(`DROP TABLE "online_menu_category"`);
    await queryRunner.query(
      `DROP TYPE "public"."online_menu_category_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d19f237f8c5b283769e9c4837c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7c40cebad6fbbdb9bd54730ae2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_be5b62c3ec0c9ec39d62b70109"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dabe3bb94c7e2c305ee730f056"`,
    );
    await queryRunner.query(`DROP TABLE "online_menu_item"`);
    await queryRunner.query(
      `DROP TYPE "public"."online_menu_item_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f5ca59a0ead555409b37882115"`,
    );
    await queryRunner.query(`DROP TABLE "online_menu"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_93e232de4f3dc710257c6b2ae0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0d6b7f3deeb2b5aa3a48130ff0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_69b24066be2a781acf1b004119"`,
    );
    await queryRunner.query(`DROP TABLE "online_payment"`);
    await queryRunner.query(
      `DROP TYPE "public"."online_payment_logical_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "qr_menu_item"`);
    await queryRunner.query(`DROP TABLE "qr_menu_section"`);
    await queryRunner.query(`DROP TABLE "qr_order_item"`);
    await queryRunner.query(`DROP TABLE "qr_order"`);
    await queryRunner.query(
      `DROP TYPE "public"."qr_order_qr_order_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "qr_location"`);
    await queryRunner.query(
      `DROP TYPE "public"."qr_location_location_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "qr_menu"`);
    await queryRunner.query(`DROP TYPE "public"."qr_menu_qr_type_enum"`);
    await queryRunner.query(`DROP TABLE "journal_entry_lines"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dbaaabeb4f909b9e438be05c9b"`,
    );
    await queryRunner.query(`DROP TABLE "ledger_accounts"`);
    await queryRunner.query(`DROP TYPE "public"."ledger_accounts_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_793d0c733787f9a849b018c0e0"`,
    );
    await queryRunner.query(`DROP TABLE "journal_entries"`);
    await queryRunner.query(
      `DROP TYPE "public"."journal_entries_reference_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."journal_entries_status_enum"`);
    await queryRunner.query(`DROP TABLE "supplier_payment_allocations"`);
    await queryRunner.query(`DROP TABLE "supplier_credit_notes"`);
    await queryRunner.query(
      `DROP TYPE "public"."supplier_credit_notes_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "supplier_payments"`);
    await queryRunner.query(
      `DROP TYPE "public"."supplier_payments_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "supplier_payment_items"`);
    await queryRunner.query(`DROP TABLE "collaborator_contract_revisions"`);
    await queryRunner.query(`DROP TABLE "collaborator_contracts"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_393db4a91133a91afa4d18a678"`,
    );
    await queryRunner.query(`DROP TABLE "time_entry_revision"`);
    await queryRunner.query(`DROP TABLE "time_entries"`);
    await queryRunner.query(`DROP TABLE "payroll_adjustments"`);
    await queryRunner.query(`DROP TABLE "payroll_tax_details"`);
    await queryRunner.query(`DROP TABLE "payroll_entries"`);
    await queryRunner.query(`DROP TABLE "payroll_runs"`);
    await queryRunner.query(`DROP TABLE "loyalty_points_locks"`);
    await queryRunner.query(
      `DROP TYPE "public"."loyalty_points_locks_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "loyalty_redemption_audit_logs"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_03ee63e1ce69953394a6f6d049"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_51c2308048fa70f5f17d7d6f02"`,
    );
    await queryRunner.query(`DROP TABLE "marketing_automation_actions"`);
    await queryRunner.query(
      `DROP TYPE "public"."marketing_automation_actions_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_016ddf524b62bfb5ba1fa4f767"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d48ec28e6ebd9044104512c5e9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a5d150de00bb29e491bdff2a02"`,
    );
    await queryRunner.query(`DROP TABLE "marketing_campaign_audience"`);
    await queryRunner.query(
      `DROP TYPE "public"."marketing_campaign_audience_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e3675f2c58d04b5e2f784630d3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5866a7df19afb0050a69a650b5"`,
    );
    await queryRunner.query(`DROP TABLE "marketing_coupon_redemptions"`);
    await queryRunner.query(
      `DROP TYPE "public"."marketing_coupon_redemptions_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4eb00938012968367ac1735a01"`,
    );
    await queryRunner.query(`DROP TABLE "marketing_coupons"`);
    await queryRunner.query(
      `DROP TYPE "public"."marketing_coupons_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e37035e65b78d0f6db03bd4988"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_87b271d52b7200db320973efd1"`,
    );
    await queryRunner.query(`DROP TABLE "marketing_message_logs"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_afcebfe3e0bd986f7a1c0ac502"`,
    );
    await queryRunner.query(`DROP TABLE "marketing_automations"`);
    await queryRunner.query(
      `DROP TYPE "public"."marketing_automations_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_717c7f243579a04867a2fb7cca"`,
    );
    await queryRunner.query(`DROP TABLE "marketing_segment_rules"`);
    await queryRunner.query(
      `DROP TYPE "public"."marketing_segment_rules_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_885754cc53f514af9d1ba740ad"`,
    );
    await queryRunner.query(`DROP TABLE "marketing_segments"`);
    await queryRunner.query(
      `DROP TYPE "public"."marketing_segments_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."marketing_segments_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8bb4d6c5fd7c1254db693823c1"`,
    );
    await queryRunner.query(`DROP TABLE "marketing_campaigns"`);
    await queryRunner.query(
      `DROP TYPE "public"."marketing_campaigns_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."marketing_campaigns_channel_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4eb13ea2702b69455803614d2a"`,
    );
    await queryRunner.query(`DROP TABLE "cash_drawer_history"`);
    await queryRunner.query(
      `DROP TYPE "public"."cash_drawer_history_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "cash_movements"`);
    await queryRunner.query(`DROP TYPE "public"."cash_movements_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c4196c9b0c53785c6ae12d5a9e"`,
    );
    await queryRunner.query(`DROP TABLE "table_transfer_log"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ba4618997503b7f44b74eb0959"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8d95b0f1824d94f78572ecbf13"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5974522fb550fdebc197e47a9b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_be606480b83ed3348eb338b355"`,
    );
    await queryRunner.query(`DROP TABLE "kitchen_display_device"`);
    await queryRunner.query(
      `DROP TYPE "public"."kitchen_display_device_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0e6e354055cfba7b8f68ae000a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_226eb0ffd5e67485b273827944"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c56bd0b443a95709758fcf0bc4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_da09beb32407846f20c032bc33"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_544d6055572ae7b8423bb841e2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6270ebacc19a7efecb38c36583"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4db0a3d8ff9cbcabf3ada7fef8"`,
    );
    await queryRunner.query(`DROP TABLE "kitchen_event_log"`);
    await queryRunner.query(
      `DROP TYPE "public"."kitchen_event_log_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "reservation_settings"`);
    await queryRunner.query(`DROP TABLE "reservation_tables"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_863365c5fc6ee2ce22f210a21d"`,
    );
    await queryRunner.query(`DROP TABLE "reservations"`);
    await queryRunner.query(
      `DROP TYPE "public"."reservations_reservationstatus_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reservation_status_history_reservation_changed_at"`,
    );
    await queryRunner.query(`DROP TABLE "reservation_status_history"`);
    await queryRunner.query(
      `DROP TYPE "public"."reservation_status_history_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "reservation_notes"`);
    await queryRunner.query(`DROP TABLE "reservation_guests"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_21f57d8769c305cfe58e2c62d8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eeb96a41b9182cd8521ae94594"`,
    );
    await queryRunner.query(`DROP TABLE "cash_tip_movements"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ae95dcc3f3d492845f3089f19c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e60d542c918b06f66a0e10de40"`,
    );
    await queryRunner.query(`DROP TABLE "tip_allocations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f412eb2286d4d3ce22f4276f24"`,
    );
    await queryRunner.query(`DROP TABLE "tip_pool_members"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ab028ac11aab3c2866a9ead5d7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1ceffbbc22b0caa7865e5ae491"`,
    );
    await queryRunner.query(`DROP TABLE "tip_pools"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e8b3a91f838ffb58a7716b8ae5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_710ecf5ec7771f633954dc9136"`,
    );
    await queryRunner.query(`DROP TABLE "tips"`);
    await queryRunner.query(`DROP TABLE "receipt_taxes"`);
    await queryRunner.query(`DROP TYPE "public"."receipt_taxes_scope_enum"`);
    await queryRunner.query(`DROP TABLE "receipt_items"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5c724a6db7cdf78a7235d6a339"`,
    );
    await queryRunner.query(`DROP TABLE "product_recipe"`);
    await queryRunner.query(`DROP TABLE "product_recipe_line"`);
    await queryRunner.query(
      `DROP TYPE "public"."product_recipe_line_quantity_unit_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."product_recipe_line_line_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1e900a51d370283d8d11270dba"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b33eb92336730d9c3a3bcaed0e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c49389e6db3f1e23a6bb3990d7"`,
    );
    await queryRunner.query(`DROP TABLE "inventory_stock_alert"`);
    await queryRunner.query(`DROP TABLE "plan_applications"`);
    await queryRunner.query(`DROP TABLE "plan_features"`);
    await queryRunner.query(`DROP TABLE "feature"`);
    await queryRunner.query(`DROP TABLE "subscription_applications"`);
    await queryRunner.query(`DROP TABLE "application"`);
    await queryRunner.query(`DROP TABLE "subscription_payments"`);
    await queryRunner.query(`DROP TABLE "company_subscription"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_scope_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "merchant"`);
    await queryRunner.query(`DROP TABLE "company"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a60597808bce764b9cd796973"`,
    );
    await queryRunner.query(`DROP TABLE "configuration"`);
    await queryRunner.query(
      `DROP TYPE "public"."configuration_ratemethod_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."configuration_calculationmethod_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."configuration_frequencypayroll_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."configuration_taxtype_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."configuration_tipdistributionmethod_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."configuration_tipcalculationmethod_enum"`,
    );
    await queryRunner.query(`DROP TABLE "customer"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7288b57fa483167f2cc9d577ba"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bdc12bd9ddcf6d8b07cdf352f0"`,
    );
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TYPE "public"."orders_kitchen_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."orders_delivery_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."orders_source_enum"`);
    await queryRunner.query(`DROP TYPE "public"."orders_logical_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f8c92b8cd8a0797abed8756b44"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ecd43386489579736dc7e19e73"`,
    );
    await queryRunner.query(`DROP TABLE "tip_settlements"`);
    await queryRunner.query(`DROP TYPE "public"."tip_settlements_status_enum"`);
    await queryRunner.query(`DROP TABLE "order_taxes"`);
    await queryRunner.query(`DROP TABLE "order_payments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cc823e0200a9a09b7a3fcc5ee7"`,
    );
    await queryRunner.query(`DROP TABLE "receipts"`);
    await queryRunner.query(`DROP TYPE "public"."receipts_type_enum"`);
    await queryRunner.query(`DROP TABLE "merchant_subscription"`);
    await queryRunner.query(`DROP TABLE "subscription_plan"`);
    await queryRunner.query(`DROP TABLE "subscription_plan_display_feature"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_51234ae099bef6793d64c307b4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2da23ed974aec101e39d1b909c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_294d2dd8a04986080135f48625"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1f8c094f83a9d3c11bbe5063af"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_96fa8118417304de16a6458855"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_278b2c010cf4928c178402c817"`,
    );
    await queryRunner.query(`DROP TABLE "kitchen_order"`);
    await queryRunner.query(
      `DROP TYPE "public"."kitchen_order_cancellation_reason_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."kitchen_order_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ff7eb1ae4fa7f21df483b6cba1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_74b1e053f86dee00fc92ac1c07"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_322dfb7de76edfce3e0cb4ee68"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_74a20e29d25f2e62a5059af4ce"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6d1a15ea144582ef18772b9611"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b70366fb051a9e8c79e4df33af"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ef06dc7dd686f2f71b947b6b01"`,
    );
    await queryRunner.query(`DROP TABLE "kitchen_order_item"`);
    await queryRunner.query(
      `DROP TYPE "public"."kitchen_order_item_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7f131604e2bf65c985be3c8e26"`,
    );
    await queryRunner.query(`DROP TABLE "kitchen_station"`);
    await queryRunner.query(`DROP TYPE "public"."kitchen_station_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."kitchen_station_display_mode_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."kitchen_station_station_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_41a844349b02e469df772f185f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f7633489fcf55fede38a2d5f5a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e0cf7088781e84ceac75a71ca8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_abdc5bcfb0728453441e8c4064"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3dd931810f2a4eb28b84bd8151"`,
    );
    await queryRunner.query(`DROP TABLE "online_order"`);
    await queryRunner.query(`DROP TYPE "public"."online_order_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_186128068aa204bba59d47024b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f2b05f3920321d575a43eb9aa3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c70fd7a84783f4fd577d26f8b8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f7f1f8b352d9f328d45b767e7f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ad9aff30045bb6bda3b533ba74"`,
    );
    await queryRunner.query(`DROP TABLE "online_order_item"`);
    await queryRunner.query(
      `DROP TYPE "public"."online_order_item_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7cbafa10d699904fb95c61dac6"`,
    );
    await queryRunner.query(`DROP TABLE "order_item"`);
    await queryRunner.query(`DROP TYPE "public"."order_item_status_enum"`);
    await queryRunner.query(`DROP TABLE "order_item_modifiers"`);
    await queryRunner.query(`DROP TABLE "product"`);
    await queryRunner.query(`DROP TABLE "modifier"`);
    await queryRunner.query(`DROP TABLE "variant"`);
    await queryRunner.query(
      `DROP TYPE "public"."variant_stock_basis_kind_enum"`,
    );
    await queryRunner.query(`DROP TABLE "stock_item"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3941af41b7cdd5178fe804b092"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_96249b84ebaa98a2a796f2eae1"`,
    );
    await queryRunner.query(`DROP TABLE "stock_movement"`);
    await queryRunner.query(`DROP TYPE "public"."stock_movement_type_enum"`);
    await queryRunner.query(`DROP TABLE "supplier_invoices"`);
    await queryRunner.query(`DROP TABLE "supplier_invoice_items"`);
    await queryRunner.query(`DROP TABLE "supplier"`);
    await queryRunner.query(`DROP TABLE "purchase_order"`);
    await queryRunner.query(`DROP TYPE "public"."purchase_order_status_enum"`);
    await queryRunner.query(`DROP TABLE "purchase_order_item"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3b1b827cc8a4073044ca743e8f"`,
    );
    await queryRunner.query(`DROP TABLE "supplies"`);
    await queryRunner.query(`DROP TYPE "public"."supplies_unit_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f72b3017acfc8a1b9d0b2fc9a4"`,
    );
    await queryRunner.query(`DROP TABLE "supply_suppliers"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_32bfd864523c486ef20c272d6f"`,
    );
    await queryRunner.query(`DROP TABLE "raw_material_categories"`);
    await queryRunner.query(`DROP TABLE "stock_location"`);
    await queryRunner.query(`DROP TABLE "category"`);
    await queryRunner.query(`DROP TABLE "loyalty_reward"`);
    await queryRunner.query(`DROP TYPE "public"."loyalty_reward_type_enum"`);
    await queryRunner.query(`DROP TABLE "loyalty_programs"`);
    await queryRunner.query(
      `DROP TYPE "public"."loyalty_programs_points_rounding_mode_enum"`,
    );
    await queryRunner.query(`DROP TABLE "loyalty_tiers"`);
    await queryRunner.query(`DROP TABLE "loyalty_customers"`);
    await queryRunner.query(`DROP TABLE "loyalty_coupons"`);
    await queryRunner.query(`DROP TYPE "public"."loyalty_coupons_status_enum"`);
    await queryRunner.query(`DROP TABLE "loyalty_rewards_redemptions"`);
    await queryRunner.query(`DROP TABLE "loyalty_point_transactions"`);
    await queryRunner.query(
      `DROP TYPE "public"."loyalty_point_transactions_source_enum"`,
    );
    await queryRunner.query(`DROP TABLE "cash_transactions"`);
    await queryRunner.query(
      `DROP TYPE "public"."cash_transactions_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."cash_transactions_type_enum"`);
    await queryRunner.query(`DROP TABLE "cash_drawer"`);
    await queryRunner.query(`DROP TABLE "cash_shifts"`);
    await queryRunner.query(`DROP TYPE "public"."cash_shifts_status_enum"`);
    await queryRunner.query(`DROP TABLE "shift"`);
    await queryRunner.query(`DROP TYPE "public"."shift_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."shift_role_enum"`);
    await queryRunner.query(`DROP TABLE "shift_assignment"`);
    await queryRunner.query(
      `DROP TYPE "public"."shift_assignment_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."shift_assignment_roleduringshift_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2b516ff163b9e85cb9adecc76c"`,
    );
    await queryRunner.query(`DROP TABLE "collaborator"`);
    await queryRunner.query(`DROP TYPE "public"."collaborator_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."collaborator_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4cd151d51611d0dddb7459c4db"`,
    );
    await queryRunner.query(`DROP TABLE "table_assignments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f09bd9855ba0e2073f33040061"`,
    );
    await queryRunner.query(`DROP TABLE "table"`);
    await queryRunner.query(`DROP TABLE "floor_zone"`);
    await queryRunner.query(`DROP TABLE "floor_plan"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dda7e2b97d9553c7240e7b91a1"`,
    );
    await queryRunner.query(`DROP TABLE "online_store"`);
    await queryRunner.query(`DROP TYPE "public"."online_store_status_enum"`);
    await queryRunner.query(`DROP TABLE "onboarding_sessions"`);
  }
}
