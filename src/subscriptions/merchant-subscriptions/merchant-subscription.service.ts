//src/subscriptions/merchant-subscriptions/merchant-subscription.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantSubscription } from './entities/merchant-subscription.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { CreateMerchantSubscriptionDto } from './dtos/create-merchant-subscription.dto';
import {
  AllMerchantSubscriptionSummaryDto,
  OneMerchantSubscriptionSummaryDto,
} from './dtos/merchant-subscription-summary.dto';
import { UpdateMerchantSubscriptionDto } from './dtos/update-merchant-subscription.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';

@Injectable()
export class MerchantSubscriptionService {
  constructor(
    @InjectRepository(MerchantSubscription)
    private readonly merchantSubscriptionRepository: Repository<MerchantSubscription>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,

    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlan>,
  ) {}
  async create(
    dto: CreateMerchantSubscriptionDto,
  ): Promise<OneMerchantSubscriptionSummaryDto> {
    // Validate merchantId and planId
    if (
      (dto.merchantId &&
        (!Number.isInteger(dto.merchantId) || dto.merchantId <= 0)) ||
      (dto.planId && (!Number.isInteger(dto.planId) || dto.planId <= 0))
    ) {
      ErrorHandler.invalidId(
        'Merchant ID and Plan ID must be positive integers',
      );
    }
    let merchant: Merchant | null = null;
    let plan: SubscriptionPlan | null = null;

    if (dto.merchantId || dto.planId) {
      if (dto.merchantId) {
        merchant = await this.merchantRepository.findOne({
          where: { id: dto.merchantId },
        });
        if (!merchant) {
          ErrorHandler.merchantSubscriptionNotFound();
        }
      }
      if (dto.planId) {
        plan = await this.subscriptionPlanRepository.findOne({
          where: { id: dto.planId },
        });
        if (!plan) {
          ErrorHandler.subscriptionPlanNotFound();
        }
      }
    }
    const merchantSubscription = this.merchantSubscriptionRepository.create({
      merchant: merchant,
      plan: plan,
      startDate: dto.startDate,
      endDate: dto.endDate,
      renewalDate: dto.renewalDate,
      status: dto.status,
      paymentMethod: dto.paymentMethod,
    } as Partial<MerchantSubscription>);

    const savedMerchantSubscription =
      await this.merchantSubscriptionRepository.save(merchantSubscription);
    return {
      statusCode: 201,
      message: 'Merchant Subscription created successfully',
      data: savedMerchantSubscription,
    };
  }
  async findAll(): Promise<AllMerchantSubscriptionSummaryDto> {
    const merchantSubscriptions =
      await this.merchantSubscriptionRepository.find({
        relations: ['merchant', 'plan'],
        select: {
          merchant: {
            id: true,
            name: true,
          },
          plan: {
            id: true,
            name: true,
          },
        },
      });
    return {
      statusCode: 200,
      message: 'Merchant Subscriptions retrieved successfully',
      data: merchantSubscriptions,
    };
  }
  async findOne(id: number): Promise<OneMerchantSubscriptionSummaryDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Merchant Subscription ID must be a positive integer',
      );
    }
    const merchantSubscription =
      await this.merchantSubscriptionRepository.findOne({
        where: { id },
        relations: ['merchant', 'plan'],
        select: {
          merchant: {
            id: true,
            name: true,
          },
          plan: {
            id: true,
            name: true,
          },
        },
      });
    if (!merchantSubscription) {
      ErrorHandler.merchantSubscriptionNotFound();
    }
    return {
      statusCode: 200,
      message: 'Merchant Subscription retrieved successfully',
      data: merchantSubscription,
    };
  }
  async update(
    id: number,
    dto: UpdateMerchantSubscriptionDto,
  ): Promise<OneMerchantSubscriptionSummaryDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Merchant Subscription ID must be a positive integer',
      );
    }
    const merchantSubscription =
      await this.merchantSubscriptionRepository.findOne({
        where: { id },
        relations: ['merchant', 'plan'],
        select: {
          merchant: {
            id: true,
            name: true,
          },
          plan: {
            id: true,
            name: true,
          },
        },
      });
    if (!merchantSubscription) {
      ErrorHandler.merchantSubscriptionNotFound();
    }

    Object.assign(merchantSubscription, dto);

    const updatedMerchantSubscription =
      await this.merchantSubscriptionRepository.save(merchantSubscription);
    return {
      statusCode: 200,
      message: 'Merchant Subscription updated successfully',
      data: updatedMerchantSubscription,
    };
  }

  async remove(id: number): Promise<OneMerchantSubscriptionSummaryDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Merchant Subscription ID must be a positive integer',
      );
    }

    const merchantSubscription =
      await this.merchantSubscriptionRepository.findOne({
        where: { id },
      });
    if (!merchantSubscription) {
      ErrorHandler.merchantSubscriptionNotFound();
    }

    await this.merchantSubscriptionRepository.remove(merchantSubscription);
    return {
      statusCode: 200,
      message: 'Merchant Subscription deleted successfully',
      data: merchantSubscription,
    };
  }
}
