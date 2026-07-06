import { mapPlanToSubscriptionTier } from './onboarding-plan.mapper';
import { SubscriptionPlan } from '../platform-saas/subscriptions/subscription-plan/entity/subscription-plan.entity';

describe('mapPlanToSubscriptionTier', () => {
  it('maps priced monthly plan', () => {
    const tier = mapPlanToSubscriptionTier({
      id: 2,
      name: 'Professional',
      slug: 'professional',
      badge: 'Full Restaurant',
      description: 'desc',
      price: 149,
      billingCycle: 'monthly',
      status: 'active',
      recommended: true,
      isCustomPricing: false,
      displayFeatures: [
        { id: 1, subscriptionPlanId: 2, label: 'Unlimited Terminals', sortOrder: 1 },
      ],
    } as SubscriptionPlan);

    expect(tier.price).toBe('$149 / MONTH');
    expect(tier.recommended).toBe(true);
    expect(tier.features).toEqual(['Unlimited Terminals']);
  });

  it('maps custom enterprise plan without list price', () => {
    const tier = mapPlanToSubscriptionTier({
      id: 3,
      name: 'Executive',
      slug: 'executive',
      badge: 'Enterprise',
      description: 'desc',
      price: null,
      priceLabel: 'ANNUAL BILLING',
      billingCycle: 'annual',
      status: 'active',
      recommended: false,
      isCustomPricing: true,
      displayFeatures: [],
    } as SubscriptionPlan);

    expect(tier.price).toBe('Custom');
    expect(tier.priceLabel).toBe('ANNUAL BILLING');
    expect(tier.isCustom).toBe(true);
  });
});
