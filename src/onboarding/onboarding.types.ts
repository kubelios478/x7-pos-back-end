export interface SubscriptionTierDefinition {
  id: string;
  planId: number;
  name: string;
  badge: string;
  price: string;
  priceLabel?: string;
  recommended?: boolean;
  isCustom?: boolean;
  imageUrl?: string;
  features: string[];
}
