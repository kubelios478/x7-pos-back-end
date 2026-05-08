// src/subscriptions/subscription-payments/subscription-payments.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MerchantSubscription } from '../merchant-subscriptions/entities/merchant-subscription.entity';
import { DataSource, Repository, In } from 'typeorm';
import { SubscriptionPayment } from './entity/subscription-payments.entity';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payments.dto';
import {
  SubscriptionPaymentResponseDto,
  OneSubscriptionPaymentResponseDto,
} from './dto/subscription-payments-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { UpdateSubscriptionPaymentDto } from './dto/update-subscription-payment.dto';
import { QuerySubscriptionPaymentDto } from './dto/query-subscription-payment.dto';
import { PaginatedSubscriptionPaymentResponseDto } from './dto/paginated-subscription-payment-response.dto';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { CompanySubscription } from '../company-subscriptions/entities/company-subscription.entity';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { SubscriptionPaymentWebhookDto } from './dto/subscription-payment-webhook.dto';

function webhookPayloadRecord(
  dto: SubscriptionPaymentWebhookDto,
): Record<string, unknown> {
  return {
    paymentId: dto.paymentId,
    externalTransactionId: dto.externalTransactionId,
    status: dto.status,
    amount: dto.amount,
    currency: dto.currency,
  };
}

@Injectable()
export class SubscriptionPaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SubscriptionPayment)
    private readonly subscriptionPaymentRepo: Repository<SubscriptionPayment>,

    @InjectRepository(MerchantSubscription)
    private readonly merchantSubscriptionRepo: Repository<MerchantSubscription>,

    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,

    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepo: Repository<SubscriptionPlan>,

    @InjectRepository(CompanySubscription)
    private readonly companySubscriptionRepo: Repository<CompanySubscription>,
  ) {}

  async createIntent(
    merchantId: number,
    dto: CreatePaymentIntentDto,
  ): Promise<{
    statusCode: 201;
    message: string;
    data: { paymentId: number; provider: 'dummy' };
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let saved: SubscriptionPayment;
    try {
      const merchant = await queryRunner.manager.findOne(Merchant, {
        where: { id: merchantId },
        select: ['id', 'companyId'],
      });
      if (!merchant?.companyId) {
        throw new BadRequestException(
          'Merchant is not associated with a company',
        );
      }

      const plan = await queryRunner.manager.findOne(SubscriptionPlan, {
        where: { id: dto.planId },
      });
      if (!plan) {
        throw new NotFoundException(
          `Subscription plan ${dto.planId} not found`,
        );
      }

      const currency = dto.currency ?? 'CLP';
      const paymentMethod = dto.paymentMethod ?? 'dummy_gateway';

      const payment = queryRunner.manager.create(SubscriptionPayment, {
        company_id: merchant.companyId,
        plan_id: dto.planId,
        amount: Number(plan.price),
        currency,
        status: 'pending',
        paymentMethod,
        raw_payload: { intent: true, provider: 'dummy' },
      });

      saved = await queryRunner.manager.save(SubscriptionPayment, payment);
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    return {
      statusCode: 201,
      message: 'Payment intent created successfully',
      data: { paymentId: Number(saved.id), provider: 'dummy' },
    };
  }

  async handleWebhook(dto: SubscriptionPaymentWebhookDto): Promise<{
    statusCode: 200;
    message: string;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock only subscription_payments. Using findOne() would eager-load
      // merchantSubscription/plan with LEFT JOINs, which breaks PostgreSQL
      // FOR UPDATE on nullable outer joins.
      const payment = await queryRunner.manager
        .createQueryBuilder(SubscriptionPayment, 'payment')
        .where('payment.id = :id', { id: dto.paymentId })
        .setLock('pessimistic_write')
        .getOne();
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }
      if (!payment.company_id) {
        throw new BadRequestException('Payment is missing company context');
      }
      if (!payment.plan_id) {
        throw new BadRequestException('Payment is missing plan context');
      }
      const plan = await queryRunner.manager.findOne(SubscriptionPlan, {
        where: { id: payment.plan_id },
      });
      if (!plan) {
        throw new BadRequestException('Payment is missing plan context');
      }
      payment.plan = plan;

      const expectedAmount = Number(payment.plan.price);
      const paidAmount = Number(dto.amount);
      const sameAmount = Math.abs(expectedAmount - paidAmount) < 0.00001;
      if (!sameAmount) {
        payment.status = 'rejected';
        payment.external_transaction_id = dto.externalTransactionId;
        payment.raw_payload = webhookPayloadRecord(dto);
        await queryRunner.manager.save(SubscriptionPayment, payment);
        throw new BadRequestException('Paid amount does not match plan price');
      }

      payment.external_transaction_id = dto.externalTransactionId;
      payment.currency = dto.currency;
      payment.amount = paidAmount;
      payment.raw_payload = webhookPayloadRecord(dto);

      if (dto.status === 'rejected') {
        payment.status = 'rejected';
        await queryRunner.manager.save(SubscriptionPayment, payment);
        await queryRunner.commitTransaction();
        return { statusCode: 200, message: 'Payment rejected' };
      }

      payment.status = 'paid';
      await queryRunner.manager.save(SubscriptionPayment, payment);

      // Activate/extend company subscription.
      const today = new Date();
      const existing = await queryRunner.manager.findOne(CompanySubscription, {
        where: { company: { id: payment.company_id } },
        order: { startDate: 'DESC' as const, id: 'DESC' as const },
      });

      const baseDate =
        existing?.endDate && existing.endDate >= today
          ? existing.endDate
          : today;

      const nextEndDate = new Date(baseDate);
      const cycle = (payment.plan.billingCycle ?? 'monthly').toLowerCase();
      if (cycle === 'monthly') {
        nextEndDate.setMonth(nextEndDate.getMonth() + 1);
      } else if (cycle === 'yearly' || cycle === 'annual') {
        nextEndDate.setFullYear(nextEndDate.getFullYear() + 1);
      } else {
        nextEndDate.setMonth(nextEndDate.getMonth() + 1);
      }

      const subscription = queryRunner.manager.create(CompanySubscription, {
        id: existing?.id,
        company_id: payment.company_id,
        company: { id: payment.company_id } as Company,
        plan: { id: payment.plan_id } as SubscriptionPlan,
        startDate: existing?.startDate ?? today,
        endDate: nextEndDate,
        renewalDate: nextEndDate,
        status: 'active',
        paymentMethod: payment.paymentMethod,
      });
      await queryRunner.manager.save(CompanySubscription, subscription);

      await queryRunner.commitTransaction();
      return { statusCode: 200, message: 'Payment processed successfully' };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }
  async create(
    dto: CreateSubscriptionPaymentDto,
  ): Promise<OneSubscriptionPaymentResponseDto> {
    if (
      dto.merchantSubscriptionId &&
      (!Number.isInteger(dto.merchantSubscriptionId) ||
        dto.merchantSubscriptionId <= 0)
    ) {
      ErrorHandler.invalidId(
        'Merchant Subscription ID must be positive integer',
      );
    }
    let merchantSubscription: MerchantSubscription | null = null;

    if (dto.merchantSubscriptionId) {
      if (dto.merchantSubscriptionId) {
        merchantSubscription = await this.merchantSubscriptionRepo.findOne({
          where: { id: dto.merchantSubscriptionId },
        });
        if (!merchantSubscription) {
          ErrorHandler.merchantSubscriptionNotFound();
        }
      }
    }

    const subscriptionPayment = this.subscriptionPaymentRepo.create({
      merchantSubscription: merchantSubscription,
      amount: dto.amount,
      currency: dto.currency,
      status: dto.status,
      paymentDate: dto.paymentDate,
      paymentMethod: dto.paymentMethod,
    } as Partial<SubscriptionPayment>);

    const savedSubscriptionPayment =
      await this.subscriptionPaymentRepo.save(subscriptionPayment);

    return {
      statusCode: 201,
      message: 'Subscription Payment created successfully',
      data: savedSubscriptionPayment,
    };
  }
  async findAll(
    query: QuerySubscriptionPaymentDto,
  ): Promise<PaginatedSubscriptionPaymentResponseDto> {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.subscriptionPaymentRepo
      .createQueryBuilder('subscriptionPayment')
      .leftJoin(
        'subscriptionPayment.merchantSubscription',
        'merchantSubscription',
      )
      .select([
        'subscriptionPayment',
        'merchantSubscription.id',
        'merchantSubscription.status',
        'merchantSubscription.merchant',
        'merchantSubscription.plan',
      ]);

    if (status) {
      qb.andWhere('subscriptionPayment.status = :status', { status });
    } else {
      qb.andWhere('subscriptionPayment.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('subscriptionPayment.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`subscriptionPayment.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    const mapped: SubscriptionPaymentResponseDto[] = data.map((item) => ({
      id: item.id,
      merchantSubscription: item.merchantSubscription
        ? { id: item.merchantSubscription.id }
        : null,
      company_id: item.company_id ?? null,
      plan_id: item.plan_id ?? null,
      external_transaction_id: item.external_transaction_id ?? null,
      amount: Number(item.amount),
      currency: item.currency,
      status: item.status,
      paymentDate: item.paymentDate,
      paymentMethod: item.paymentMethod,
    }));

    return {
      statusCode: 200,
      message: 'Subscription Payment retrieved successfully',
      data: mapped,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: number): Promise<OneSubscriptionPaymentResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Subscription Payment ID must be a positive integer',
      );
    }
    const subscriptionPayment = await this.subscriptionPaymentRepo.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['merchantSubscription'],
    });
    if (!subscriptionPayment) {
      ErrorHandler.subscriptionPaymentNotFound();
    }
    return {
      statusCode: 200,
      message: 'Subscription Payment retrieved successfully',
      data: subscriptionPayment,
    };
  }
  async update(
    id: number,
    dto: UpdateSubscriptionPaymentDto,
  ): Promise<OneSubscriptionPaymentResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Subscription Payment ID must be a positive integer',
      );
    }
    const subscriptionPayment = await this.subscriptionPaymentRepo.findOne({
      where: { id: id },
    });
    if (!subscriptionPayment) {
      ErrorHandler.subscriptionPaymentNotFound();
    }

    if (dto.status !== undefined) {
      subscriptionPayment.status = dto.status;
    }

    const updatedPayment =
      await this.subscriptionPaymentRepo.save(subscriptionPayment);

    return {
      statusCode: 200,
      message: 'Subscription Payment updated successfully',
      data: updatedPayment,
    };
  }
  async remove(id: number): Promise<OneSubscriptionPaymentResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Subscription Payment ID must be a positive integer',
      );
    }
    const subscriptionPayment = await this.subscriptionPaymentRepo.findOne({
      where: { id: id },
    });
    if (!subscriptionPayment) {
      ErrorHandler.subscriptionPaymentNotFound();
    }
    subscriptionPayment.status = 'deleted';
    await this.subscriptionPaymentRepo.save(subscriptionPayment);

    return {
      statusCode: 200,
      message: 'Subscription Payment removed successfully',
      data: subscriptionPayment,
    };
  }
}
