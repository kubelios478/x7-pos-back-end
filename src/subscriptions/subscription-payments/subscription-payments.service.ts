// src/subscriptions/subscription-payments/subscription-payments.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MerchantSubscription } from '../merchant-subscriptions/entities/merchant-subscription.entity';
import { Repository, In } from 'typeorm';
import { SubscriptionPayment } from './entity/subscription-payments.entity';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payments.dto';
import {
  ALlSubscriptionPaymentsResponseDto,
  OneSubscriptionPaymentResponseDto,
} from './dto/subscription-payments-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { UpdateSubscriptionPaymentDto } from './dto/update-subscription-payment.dto';

@Injectable()
export class SubscriptionPaymentsService {
  constructor(
    @InjectRepository(SubscriptionPayment)
    private readonly subscriptionPaymentRepo: Repository<SubscriptionPayment>,

    @InjectRepository(MerchantSubscription)
    private readonly merchantSubscriptionRepo: Repository<MerchantSubscription>,
  ) {}
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
  async findAll(): Promise<ALlSubscriptionPaymentsResponseDto> {
    const subscriptionPayments = await this.subscriptionPaymentRepo.find({
      where: { status: In(['active', 'inactive']) },
      relations: ['merchantSubscription'],
      select: {
        merchantSubscription: { id: true, plan: true },
        amount: true,
        currency: true,
        status: true,
        paymentDate: true,
        paymentMethod: true,
      },
    });
    return {
      statusCode: 200,
      message: 'Subscription Payments retrieved successfully',
      data: subscriptionPayments,
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
      ErrorHandler.subscriptionApplicationNotFound();
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
      ErrorHandler.subscriptionApplicationNotFound();
    }

    if (dto.status !== undefined) {
      subscriptionPayment.status = dto.status;
    }

    const updatedPayment =
      await this.subscriptionPaymentRepo.save(subscriptionPayment);

    return {
      statusCode: 200,
      message: `Subscription Payment with ID ${id} updated successfully`,
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
      ErrorHandler.subscriptionApplicationNotFound();
    }
    subscriptionPayment.status = 'deleted';
    await this.subscriptionPaymentRepo.save(subscriptionPayment);

    return {
      statusCode: 200,
      message: `Subscription Application with ID ${id} deleted successfully`,
      data: subscriptionPayment,
    };
  }
}
