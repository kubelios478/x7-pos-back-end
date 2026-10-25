import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryQRLocationDto } from 'src/commerce/qr-code/qr-location/dto/query-qr-location.dto';
import { QueryQRMenuItemDto } from 'src/commerce/qr-code/qr-menu-item/dto/query-qr-menu-item.dto';
import { QueryQRMenuSectionDto } from 'src/commerce/qr-code/qr-menu-section/dto/query-qr-menu-section.dto';
import { QueryQRMenuDto } from 'src/commerce/qr-code/qr-menu/dto/query-qr-menu.dto';
import { QueryQROrderItemDto } from 'src/commerce/qr-code/qr-order-item/dto/query-qr-order-item.dto';
import { QueryQROrderDto } from 'src/commerce/qr-code/qr-order/dto/query-qr-order.dto';
import { QueryMerchantOvertimeRuleDto } from 'src/core/configuration/merchant-overtime-rule/dto/query-merchant-overtime-rule.dto';
import { QueryMerchantPayrollRuleDto } from 'src/core/configuration/merchant-payroll-rule/dto/query-merchant-payroll-rule.dto';
import { QueryMerchantTaxRuleDto } from 'src/core/configuration/merchant-tax-rule/dto/query-merchant-tax-rule.dto';
import { QueryMerchantTipRuleDto } from 'src/core/configuration/merchant-tip-rule/dto/query-merchant-tip-rule.dto';
import { GetLoyaltyProgramsQueryDto } from 'src/growth/loyalty/loyalty-programs/dto/get-loyalty-programs-query.dto';
import { GetLoyaltyRewardQueryDto } from 'src/growth/loyalty/loyalty-reward/dto/get-loyalty-reward-query.dto';
import { GetInventoryStockAlertsQueryDto } from 'src/inventory/stock-alerts/dto/get-inventory-stock-alerts-query.dto';
import { FilterRawMaterialDto } from 'src/inventory/supplies/dto/filter-raw-material.dto';
import { QueryApplicationDto } from 'src/platform-saas/subscriptions/applications/dto/query-application.dto';
import { QueryFeatureDto } from 'src/platform-saas/subscriptions/features/dto/query-feature.dto';
import { QueryMerchantSubscriptionDto } from 'src/platform-saas/subscriptions/merchant-subscriptions/dtos/query-merchant-subscription.dto';
import { QueryPlanApplicationDto } from 'src/platform-saas/subscriptions/plan-applications/dto/query-plan-application.dto';
import { QueryPlanFeatureDto } from 'src/platform-saas/subscriptions/plan-features/dto/query-plan-feature.dto';
import { QuerySubscriptionApplicationDto } from 'src/platform-saas/subscriptions/subscription-application/dto/query-subscription-application.dto';
import { QuerySubscriptionPaymentDto } from 'src/platform-saas/subscriptions/subscription-payments/dto/query-subscription-payment.dto';
import { QuerySubscriptionPlanDto } from 'src/platform-saas/subscriptions/subscription-plan/dto/query-subscription-plan.dto';
import { QueryFloorPlanDto } from 'src/restaurant-operations/dining-system/floor-plan/dto/query-floor-plan.dto';
import { QueryFloorZoneDto } from 'src/restaurant-operations/dining-system/floor-zone/dto/query-floor-zone.dto';

// Sin tope, ?limit=1000000 hacía que una sola petición leyera la tabla entera.
// raw-materials admite 500 porque el backoffice llena selectores con limit=200 y 500.
const QUERY_DTOS: [new () => object, number][] = [
  [QueryQRLocationDto, 100],
  [QueryQRMenuItemDto, 100],
  [QueryQRMenuSectionDto, 100],
  [QueryQRMenuDto, 100],
  [QueryQROrderItemDto, 100],
  [QueryQROrderDto, 100],
  [QueryMerchantOvertimeRuleDto, 100],
  [QueryMerchantPayrollRuleDto, 100],
  [QueryMerchantTaxRuleDto, 100],
  [QueryMerchantTipRuleDto, 100],
  [GetLoyaltyProgramsQueryDto, 100],
  [GetLoyaltyRewardQueryDto, 100],
  [GetInventoryStockAlertsQueryDto, 100],
  [FilterRawMaterialDto, 500],
  [QueryApplicationDto, 100],
  [QueryFeatureDto, 100],
  [QueryMerchantSubscriptionDto, 100],
  [QueryPlanApplicationDto, 100],
  [QueryPlanFeatureDto, 100],
  [QuerySubscriptionApplicationDto, 100],
  [QuerySubscriptionPaymentDto, 100],
  [QuerySubscriptionPlanDto, 100],
  [QueryFloorPlanDto, 100],
  [QueryFloorZoneDto, 100],
];

// Como el ValidationPipe global: la query llega como texto y se convierte.
async function limitErrors(dto: new () => object, limit: string) {
  const instance = plainToInstance(
    dto,
    { limit },
    { enableImplicitConversion: true },
  );
  const errors = await validate(instance);
  return errors.filter((e) => e.property === 'limit');
}

describe('Pagination limit caps', () => {
  it.each(QUERY_DTOS)('%p accepts limit up to %p', async (dto, max) => {
    expect(await limitErrors(dto, String(max))).toHaveLength(0);
  });

  it.each(QUERY_DTOS)('%p rejects limit above %p', async (dto, max) => {
    const errors = await limitErrors(dto, String(max + 1));
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('max');
  });
});
