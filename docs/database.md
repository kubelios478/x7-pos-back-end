# Database: schema, migrations and data

How the database schema is created and changed, and what has to happen before the
first production deploy. Status as of 2026-10-25.

## Current state

- The schema changes **only through TypeORM migrations** in `src/database/migrations`.
  `synchronize` is off in `app.module.ts` and `data-source.ts`, and the app never
  migrates on startup.
- **`InitialSchema1793031148222` creates the whole schema from an empty database**
  (124 tables, enums, indexes and foreign keys). It replaced the 8 earlier migrations,
  which assumed a database created before migrations existed.
- Three partial unique indexes are written by hand at the end of `InitialSchema`: one
  open cash shift per drawer, and one active stock row per product/variant/location
  and per supply/location. The entities declare them with
  `@Index(..., { synchronize: false })`, so neither `synchronize` nor
  `migration:generate` creates them.
- The e2e tests (`npm run test:e2e`) still build their disposable database with
  `synchronize`, so they run without those three indexes (pending).

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
- Write a short comment at the top of each migration: what changes and why, and what
  `down()` does with existing data.
- Partial or expression indexes are not generated: write them by hand in the
  migration and declare them on the entity with `synchronize: false`.

## Existing databases: one-time step

A database that already ran the 8 earlier migrations (the shared development database,
any local one) has the full schema; it only needs `InitialSchema` recorded as applied,
**without running it**:

```bash
npm run migration:show   # only InitialSchema1793031148222 may be pending
npm run build && npm run typeorm -- migration:run --fake
npm run migration:show   # nothing pending
```

`--fake` inserts the row in the `migrations` table and changes nothing else. The rows
of the 8 earlier migrations stay as history; TypeORM ignores executed migrations whose
files no longer exist. A database that misses part of the schema must not use
`--fake`: create it again from empty with `migration:run`.

Before rebasing a branch that adds a migration, check its timestamp: a migration
generated before `1793031148222` would sort before `InitialSchema` and fail on a new
database. Generate it again after rebasing.

## Creating a new database

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
  `InitialSchema`; do not run them on a migrated database.

## Production checklist

- [ ] A new database, not the shared development database (it holds test data).
- [ ] `migration:run` on the empty database, and before each deploy.
- [ ] Reference data loaded with the fixed ids.
- [ ] Environment: `NODE_ENV=production`, `DB_*` and `DB_SSL=true`, real
      `JWT_SECRET` and `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, `FRONTEND_URL`,
      `TRUST_PROXY`, `CONTRACT_DOCUMENT_SECRET`, SMTP. Secrets live in the platform's
      secret store, never in the repository. The app refuses to start when a required
      variable is missing or, in production, when a secret is shorter than 32
      characters or still the `.env.example` value (`src/config/environment.ts`).
- [ ] Health check: the platform probes `GET /api/health` (200 when the database
      answers, 503 otherwise).
- [ ] Automatic backups enabled on the database.

## Applied migrations

| Migration | Change |
| --- | --- |
| `InitialSchema1793031148222` | The whole schema, including the three partial unique indexes |

It replaced these, whose changes it contains: `AlignSharedSchema1761170000000`,
`OrderTableOptional1761250000000`, `CustomerDocumentId1761300000000`,
`CompanyMerchantTaxId1761350000000`, `UniqueOpenShiftAndStockRows1761400000000`,
`MerchantTimezone1761450000000`, `VariantSkuNullable1761500000000` and
`QrOrderItemNotesNullable1761510000000`.
