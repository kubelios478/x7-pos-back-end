# Database: schema, migrations and data

How the database schema is created and changed, and what has to happen before the
first production deploy. Status as of 2026-10-25.

## Current state

- The schema changes **only through TypeORM migrations** in `src/database/migrations`.
  `synchronize` is off in `app.module.ts` and `data-source.ts`, and the app never
  migrates on startup.
- **An empty database cannot be built with migrations yet.** The migration history
  starts with `AlignSharedSchema1761170000000`, which aligns a database that existed
  before migrations. The 8 migrations create 1 of the 124 tables.
- Three partial unique indexes exist **only in a migration**
  (`UniqueOpenShiftAndStockRows1761400000000`): one open cash shift per drawer, and
  one active stock row per product/variant/location and per supply/location. The
  entities declare them with `@Index(..., { synchronize: false })`, so neither
  `synchronize` nor `migration:generate` creates them.
- The e2e tests (`npm run test:e2e`) build their disposable database with
  `synchronize`, so they run without those three indexes.

Fixing the second point is the main task before production: see
[Before production: baseline migration](#before-production-baseline-migration).

## Rules

1. Every schema change is a migration, committed together with the entity change.
2. Never enable `synchronize` against a shared or production database. It drops and
   re-adds a renamed column (losing its data), changes the schema without review or
   rollback, and races when several instances start at once. Only the disposable e2e
   database uses it.
3. Never edit a migration that has run anywhere; write a new one.
4. Deploy order: `npm run migration:run`, then start the new version of the app.
5. A migration on the shared development database is run by one person, after the
   team agrees, and announced in the PR.

## Changing the schema

```bash
# 1. change the entity, then generate the migration from the difference
npm run migration:generate -- src/database/migrations/DescribeTheChange

# 2. review the generated SQL (see the note below), then apply it
npm run migration:show
npm run migration:run

# undo the last migration
npm run migration:revert
```

- `migration:generate` compares the entities with the database in `.env`. Point
  `DB_*` at a database that is up to date, or the migration will include unrelated
  changes.
- TypeORM always reports `collaborator_contracts.overtime_multiplier`'s default as
  changed (numeric default comparison). Drop that statement if it appears.
- Write a short comment at the top of each migration: what changes and why, and what
  `down()` does with existing data.
- Partial or expression indexes are not generated: write them by hand in the
  migration and declare them on the entity with `synchronize: false`.

## Before production: baseline migration

Goal: `npm run migration:run` on an **empty** database creates the whole schema. Do
it on a branch, and only once.

1. **Generate the baseline against an empty database.** Start a disposable Postgres
   (for example `docker compose -f docker-compose.e2e.yml -p x7-baseline up -d --wait`),
   point `DB_*` at it (`127.0.0.1:54329`, user, password and database `x7_e2e`), then:

   ```bash
   npm run migration:generate -- src/database/migrations/InitialSchema
   ```

   Against an empty database the result creates every table, constraint and index the
   entities declare.
2. **Add the hand-written indexes** to `InitialSchema`: copy the three
   `CREATE UNIQUE INDEX` statements from `UniqueOpenShiftAndStockRows1761400000000`.
3. **Remove the 8 previous migrations.** Their changes are already part of the
   baseline.
4. **Check the baseline.** On a new empty database, `npm run migration:run` must
   succeed. Then `npm run typeorm -- migration:generate --check src/database/migrations/Check`
   against that database must report no changes. Compare it with the shared
   development database the same way: run `--check` with `DB_*` pointing there.
5. **Mark the baseline as applied in every existing database** (the shared
   development database and any local one), without running it:

   ```bash
   npm run build && npm run typeorm -- migration:run --fake
   ```

   `--fake` records the pending migrations as executed. Run `migration:show` before
   and after: only `InitialSchema` may be pending before.
6. **Build the e2e database with migrations** instead of `synchronize`, so the tests
   also cover the three indexes.
7. **Guard it in CI:** run the migrations on an empty database and then
   `migration:generate --check`. The job fails when an entity changed without a
   migration.

## Creating a new database (once the baseline exists)

1. Create an empty Postgres database and set `DB_*` (and `DB_SSL=true` for a hosted
   database).
2. `npm run migration:run`.
3. Load the reference data.
4. Development only: load demo data.

## Reference data and demo data

- **Reference data** is required in every environment, production included:
  subscription plans, features and applications. The code depends on their **fixed
  ids**: `SUBSCRIPTION_FEATURE_IDS` in
  `src/common/subscription/subscription-feature-ids.ts` hard-codes them (orders = 63),
  so a database with different ids answers 403 on every feature-gated route. Today it
  is loaded with `scripts/seed-subscriptions-reference-data.sql`; the plan is an
  idempotent, versioned seed command.
- **Demo data** (merchants, products, orders) must never reach production. The app no
  longer inserts sample data on startup (removed on 2026-10-25: it created 4 active
  taxes for merchant 1). A demo-data command, if added, must refuse to run when
  `NODE_ENV=production`.
- The other files in `scripts/` predate migrations. Their schema changes are already in
  `AlignSharedSchema1761170000000`; do not run them on a migrated database.

## Production checklist

- [ ] A new database, not the shared development database (it holds test data).
- [ ] Baseline migration done (see above); `migration:run` before each deploy.
- [ ] Reference data loaded with the fixed ids.
- [ ] Environment: `NODE_ENV=production`, `DB_*` and `DB_SSL=true`, real
      `JWT_SECRET` and `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, `TRUST_PROXY`,
      `CONTRACT_DOCUMENT_SECRET`, SMTP. Secrets live in the platform's secret store,
      never in the repository.
- [ ] Health check: the platform probes `GET /api/health` (200 when the database
      answers, 503 otherwise).
- [ ] Automatic backups enabled on the database.

## Applied migrations

| Migration | Change |
| --- | --- |
| `AlignSharedSchema1761170000000` | Aligns a database created before migrations (KDS rerouting, reservation capacity, external delivery, indexes) |
| `OrderTableOptional1761250000000` | `orders.table_id` accepts NULL (take-out and delivery orders) |
| `CustomerDocumentId1761300000000` | `customer.rut` becomes `customer.document_id` |
| `CompanyMerchantTaxId1761350000000` | `company.rut` and `merchant.rut` become `tax_id` |
| `UniqueOpenShiftAndStockRows1761400000000` | The three partial unique indexes |
| `MerchantTimezone1761450000000` | `merchant.timezone` (IANA, default UTC) |
| `VariantSkuNullable1761500000000` | `variant.sku` accepts NULL |
| `QrOrderItemNotesNullable1761510000000` | `qr_order_item.notes` accepts NULL |
