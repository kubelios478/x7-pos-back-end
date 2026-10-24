//src/platform-saas/subscriptions/subscriptions.service.ts
//
// Self-service for the merchant's own company subscription. Changing or renewing the plan
// is not done here: the merchant creates a payment intent (POST /subscription-payments/intent)
// and only the payment webhook activates the plan, so nothing is granted without paying.
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySubscription } from './company-subscriptions/entities/company-subscription.entity';
import { SubscriptionPayment } from './subscription-payments/entity/subscription-payments.entity';
import {
  MyCompanySubscriptionDto,
  MySubscriptionPaymentDto,
  MySubscriptionPaymentsResponseDto,
  MySubscriptionResponseDto,
  QueryMySubscriptionPaymentsDto,
} from './dto/my-subscription.dto';

/** Calendar day of a `date` column, which pg may hand back as a string or a Date. */
function isoDay(value: Date | string): string {
  return typeof value === 'string'
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10);
}

function toPaymentDto(payment: SubscriptionPayment): MySubscriptionPaymentDto {
  return {
    id: Number(payment.id),
    planId: payment.plan_id != null ? Number(payment.plan_id) : null,
    planName: payment.plan?.name ?? null,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: payment.status,
    paymentMethod: payment.paymentMethod,
    paymentDate: payment.paymentDate,
  };
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(CompanySubscription)
    private readonly companySubscriptionRepo: Repository<CompanySubscription>,
    @InjectRepository(SubscriptionPayment)
    private readonly subscriptionPaymentRepo: Repository<SubscriptionPayment>,
  ) {}

  async getMySubscription(
    companyId: number,
  ): Promise<MySubscriptionResponseDto> {
    // Same "current" row the payment webhook renews: the most recent one.
    const current = await this.companySubscriptionRepo.findOne({
      where: { company: { id: companyId } },
      order: { startDate: 'DESC', id: 'DESC' },
    });
    const pending = await this.subscriptionPaymentRepo.findOne({
      where: { company_id: companyId, status: 'pending' },
      order: { paymentDate: 'DESC', id: 'DESC' },
    });

    let subscription: MyCompanySubscriptionDto | null = null;
    if (current) {
      const today = isoDay(new Date());
      const endDate = current.endDate ? isoDay(current.endDate) : null;
      subscription = {
        id: current.id,
        status: current.status,
        isActive:
          current.status === 'active' && (endDate === null || endDate >= today),
        startDate: isoDay(current.startDate),
        endDate,
        renewalDate: current.renewalDate ? isoDay(current.renewalDate) : null,
        paymentMethod: current.paymentMethod,
        plan: {
          id: current.plan.id,
          name: current.plan.name,
          slug: current.plan.slug ?? null,
          price: current.plan.price != null ? Number(current.plan.price) : null,
          billingCycle: current.plan.billingCycle,
        },
      };
    }

    return {
      statusCode: 200,
      message: 'Subscription retrieved successfully',
      data: {
        subscription,
        pendingPayment: pending ? toPaymentDto(pending) : null,
      },
    };
  }

  async getMyPayments(
    companyId: number,
    query: QueryMySubscriptionPaymentsDto,
  ): Promise<MySubscriptionPaymentsResponseDto> {
    const { page = 1, limit = 10 } = query;
    const [payments, total] = await this.subscriptionPaymentRepo.findAndCount({
      where: { company_id: companyId },
      order: { paymentDate: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      statusCode: 200,
      message: 'Subscription payments retrieved successfully',
      data: payments.map(toPaymentDto),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
