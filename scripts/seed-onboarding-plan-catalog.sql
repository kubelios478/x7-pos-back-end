-- Onboarding catalog: plan names, prices, slugs, and marketing display features.
-- Safe to re-run (idempotent for plans 1–3).
-- Run after backend sync or: psql -U postgres -d x7_pos -f scripts/seed-onboarding-plan-catalog.sql

BEGIN;

ALTER TABLE subscription_plan
  ADD COLUMN IF NOT EXISTS slug varchar(50),
  ADD COLUMN IF NOT EXISTS badge varchar(100),
  ADD COLUMN IF NOT EXISTS recommended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_custom_pricing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_label varchar(100),
  ADD COLUMN IF NOT EXISTS image_url varchar(500);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_plan_slug
  ON subscription_plan (slug)
  WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS subscription_plan_display_feature (
  id bigserial PRIMARY KEY,
  subscription_plan_id bigint NOT NULL REFERENCES subscription_plan(id) ON DELETE CASCADE,
  label varchar(255) NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_plan_display_feature_plan
  ON subscription_plan_display_feature (subscription_plan_id);

-- Plan 1: Essential
UPDATE subscription_plan SET
  name = 'Essential',
  description = 'Quick service operations with core POS tooling for lean teams.',
  price = 69.00,
  "billingCycle" = 'monthly',
  status = 'active',
  slug = 'essential',
  badge = 'Quick Service',
  recommended = false,
  is_custom_pricing = false,
  price_label = NULL,
  image_url = NULL
WHERE id = 1;

-- Plan 2: Professional
UPDATE subscription_plan SET
  name = 'Professional',
  description = 'Full restaurant operations with advanced service and analytics.',
  price = 149.00,
  "billingCycle" = 'monthly',
  status = 'active',
  slug = 'professional',
  badge = 'Full Restaurant',
  recommended = true,
  is_custom_pricing = false,
  price_label = NULL,
  image_url = NULL
WHERE id = 2;

-- Plan 3: Executive (custom pricing per client — price NULL until negotiated)
UPDATE subscription_plan SET
  name = 'Executive',
  description = 'Enterprise-grade platform with custom commercial terms per client.',
  price = NULL,
  "billingCycle" = 'annual',
  status = 'active',
  slug = 'executive',
  badge = 'Enterprise',
  recommended = false,
  is_custom_pricing = true,
  price_label = 'ANNUAL BILLING',
  image_url = NULL
WHERE id = 3;

DELETE FROM subscription_plan_display_feature
WHERE subscription_plan_id IN (1, 2, 3);

INSERT INTO subscription_plan_display_feature (subscription_plan_id, label, sort_order) VALUES
  (1, 'Up to 2 Standard Terminals', 1),
  (1, 'Basic Inventory Tracking', 2),
  (1, 'Standard Email Support', 3),
  (1, 'Daily Sales Reporting', 4),
  (2, 'Unlimited Terminals', 1),
  (2, 'Advanced Table Management', 2),
  (2, '24/7 Priority Phone Support', 3),
  (2, 'Real-time Cloud Analytics', 4),
  (3, 'Multi-Location Global Sync', 1),
  (3, 'Dedicated Account Manager', 2),
  (3, 'Custom API & ERP Integrations', 3),
  (3, 'White-label Guest Interface', 4);

COMMIT;
