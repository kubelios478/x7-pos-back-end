import { SubscriptionPlan } from '../platform-saas/subscriptions/subscription-plan/entity/subscription-plan.entity';
import type { SubscriptionTierDefinition } from './onboarding.types';

export function mapPlanToSubscriptionTier(
  plan: SubscriptionPlan,
): SubscriptionTierDefinition {
  const features = [...(plan.displayFeatures ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((feature) => feature.label);

  return {
    id: plan.slug!,
    planId: Number(plan.id),
    name: plan.name,
    badge: plan.badge ?? plan.name,
    price: formatPlanPrice(plan),
    priceLabel: plan.priceLabel ?? undefined,
    recommended: plan.recommended,
    isCustom: plan.isCustomPricing,
    imageUrl: plan.imageUrl ?? undefined,
    features,
  };
}

export function formatPlanPrice(plan: SubscriptionPlan): string {
  if (plan.isCustomPricing) {
    if (plan.price == null || Number(plan.price) <= 0) {
      return 'Custom';
    }
    return `$${Number(plan.price).toFixed(0)} / ${formatBillingCycle(plan.billingCycle)}`;
  }

  const priceValue = Number(plan.price ?? 0);
  return `$${priceValue.toFixed(0)} / ${formatBillingCycle(plan.billingCycle)}`;
}

function formatBillingCycle(billingCycle: string): string {
  const normalized = billingCycle.trim().toLowerCase();
  if (normalized === 'monthly') return 'MONTH';
  if (normalized === 'yearly' || normalized === 'annual') return 'YEAR';
  return billingCycle.toUpperCase();
}
