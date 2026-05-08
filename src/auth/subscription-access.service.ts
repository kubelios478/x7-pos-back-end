import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantSubscription } from 'src/platform-saas/subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { PlanFeature } from 'src/platform-saas/subscriptions/plan-features/entity/plan-features.entity';
import { CompanySubscription } from 'src/platform-saas/subscriptions/company-subscriptions/entities/company-subscription.entity';

/** Thrown when the merchant has no subscription rows at all. */
export const MSG_NO_MERCHANT_PLAN =
  'Merchant has no associated subscription plan; access denied';

/** Thrown when subscriptions exist but none are active and within validity dates. */
export const MSG_SUBSCRIPTION_OUTDATED =
  'Merchant subscription is not active or has expired; access denied';

/** Thrown when the company has no subscription rows at all. */
export const MSG_NO_COMPANY_PLAN =
  'Company has no associated subscription plan; access denied';

/** Thrown when company subscriptions exist but none are active and within validity dates. */
export const MSG_COMPANY_SUBSCRIPTION_OUTDATED =
  'Company subscription is not active or has expired; access denied';

export interface MerchantSubscriptionAccess {
  /** `subscription_plan.id` for the merchant’s active row. */
  planId: number;
  /** Feature row IDs allowed for that plan in `plan_features` (active rows). */
  authorizedFeatureIds: number[];
}

export interface CompanySubscriptionAccess {
  /** `subscription_plan.id` for the company’s active row. */
  planId: number;
  /** Feature row IDs allowed for that plan in `plan_features` (active rows). */
  authorizedFeatureIds: number[];
}

@Injectable()
export class SubscriptionAccessService {
  constructor(
    @InjectRepository(MerchantSubscription)
    private readonly merchantSubscriptionRepo: Repository<MerchantSubscription>,
    @InjectRepository(CompanySubscription)
    private readonly companySubscriptionRepo: Repository<CompanySubscription>,
    @InjectRepository(PlanFeature)
    private readonly planFeatureRepo: Repository<PlanFeature>,
  ) {}

  /**
   * Resolves the current merchant subscription (most recent by startDate / id) that is
   * active and not past endDate, and returns the plan id plus feature ids for that plan.
   */
  async getSubscriptionAccessForMerchant(
    merchantId: number,
  ): Promise<MerchantSubscriptionAccess> {
    const hasAny = await this.merchantSubscriptionRepo.exist({
      where: { merchant: { id: merchantId } },
    });

    if (!hasAny) {
      throw new UnauthorizedException(MSG_NO_MERCHANT_PLAN);
    }

    const current = await this.merchantSubscriptionRepo
      .createQueryBuilder('ms')
      .innerJoinAndSelect('ms.plan', 'plan')
      .where('ms.merchant_id = :merchantId', { merchantId })
      .andWhere('ms.status = :status', { status: 'active' })
      .andWhere('(ms.endDate IS NULL OR ms.endDate >= CURRENT_DATE)')
      .orderBy('ms.startDate', 'DESC')
      .addOrderBy('ms.id', 'DESC')
      .getOne();

    if (!current?.plan) {
      throw new UnauthorizedException(MSG_SUBSCRIPTION_OUTDATED);
    }

    const planId = current.plan.id;

    const rows = await this.planFeatureRepo
      .createQueryBuilder('pf')
      .select('pf.feature_id', 'featureId')
      .where('pf.subscription_plan_id = :planId', { planId })
      .andWhere('pf.status = :fs', { fs: 'active' })
      .orderBy('pf.feature_id', 'ASC')
      .getRawMany<Record<string, string>>();

    const authorizedFeatureIds = rows.map((r) => {
      const v =
        (r as { featureId?: string }).featureId ??
        (r as { featureid?: string }).featureid ??
        (r as { feature_id?: string }).feature_id;
      return parseInt(String(v), 10);
    });

    return { planId, authorizedFeatureIds };
  }

  /**
   * Resolves the current company subscription (most recent by startDate / id) that is
   * active and not past endDate, and returns the plan id plus feature ids for that plan.
   */
  async getSubscriptionAccessForCompany(
    companyId: number,
  ): Promise<CompanySubscriptionAccess> {
    const hasAny = await this.companySubscriptionRepo.exist({
      where: { company: { id: companyId } },
    });

    if (!hasAny) {
      throw new UnauthorizedException(MSG_NO_COMPANY_PLAN);
    }

    const current = await this.companySubscriptionRepo
      .createQueryBuilder('cs')
      .innerJoinAndSelect('cs.plan', 'plan')
      .where('cs.company_id = :companyId', { companyId })
      .andWhere('cs.status = :status', { status: 'active' })
      .andWhere('(cs.endDate IS NULL OR cs.endDate >= CURRENT_DATE)')
      .orderBy('cs.startDate', 'DESC')
      .addOrderBy('cs.id', 'DESC')
      .getOne();

    if (!current?.plan) {
      throw new UnauthorizedException(MSG_COMPANY_SUBSCRIPTION_OUTDATED);
    }

    const planId = current.plan.id;

    const rows = await this.planFeatureRepo
      .createQueryBuilder('pf')
      .select('pf.feature_id', 'featureId')
      .where('pf.subscription_plan_id = :planId', { planId })
      .andWhere('pf.status = :fs', { fs: 'active' })
      .orderBy('pf.feature_id', 'ASC')
      .getRawMany<Record<string, string>>();

    const authorizedFeatureIds = rows.map((r) => {
      const v =
        (r as { featureId?: string }).featureId ??
        (r as { featureid?: string }).featureid ??
        (r as { feature_id?: string }).feature_id;
      return parseInt(String(v), 10);
    });

    return { planId, authorizedFeatureIds };
  }
}
