# Subscriptions (company-level)

## Source of truth

Subscriptions and entitlements are **company-level**. The authoritative record is `company_subscription` (`CompanySubscription`).

Authorization (feature gating) is based on:

- `companyId` (derived from the user’s merchant/company association)
- `planId` and `authorizedFeatureIds` resolved via `SubscriptionAccessService.getSubscriptionAccessForCompany(companyId)`

## Legacy merchant subscriptions

The `merchant-subscriptions` area is considered **legacy** and should not be used as the source of truth for authorization.

It may still exist for backward compatibility with older APIs, but new functionality should:

- reference **company subscriptions**
- avoid introducing new dependencies on `merchantSubscriptionId`

## Portal staff

Users with roles `PORTAL_ADMIN` and `PORTAL_USER` keep **full feature access** and are not constrained by company subscription.

