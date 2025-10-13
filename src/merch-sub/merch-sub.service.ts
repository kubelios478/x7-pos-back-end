import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchSub } from './entities/merch-sub.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { SubPlan } from '../sub-plan/entity/sub-plan.entity';
import { CreateMerchSubDto } from './dtos/create-merch-sub.dto';
import { MerchantSubscriptionSummaryDto } from './dtos/merchant-subscription-summary.dto';
import { UpdateMerchSubDto } from './dtos/update-merchant-subscription.dto';

@Injectable()
export class MerchSubService {
  constructor(
    @InjectRepository(MerchSub)
    private readonly merchSubRepository: Repository<MerchSub>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,

    @InjectRepository(SubPlan)
    private readonly subPlanRepository: Repository<SubPlan>,
  ) {}

  async create(
    createDto: CreateMerchSubDto,
  ): Promise<MerchantSubscriptionSummaryDto> {
    // 🔹 Validación de fechas
    if (createDto.startDate >= createDto.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    if (createDto.renewalDate && createDto.renewalDate < createDto.startDate) {
      throw new BadRequestException('Renewal date must be after start date');
    }

    // 🔹 Validar existencia de Merchant
    const merchant = await this.merchantRepository.findOne({
      where: { id: createDto.merchantId },
    });
    if (!merchant) {
      throw new NotFoundException(
        `Merchant with id ${createDto.merchantId} not found`,
      );
    }

    // 🔹 Validar existencia de Plan
    const plan = await this.subPlanRepository.findOne({
      where: { id: createDto.planId },
    });
    if (!plan) {
      throw new NotFoundException(
        `SubPlan with id ${createDto.planId} not found`,
      );
    }

    // 🔹 Validar duplicidad (Merchant ya tiene ese plan activo)
    const existingSubscription = await this.merchSubRepository.findOne({
      where: {
        merchant: { id: merchant.id },
        plan: { id: plan.id },
        status: 'active',
      },
    });
    if (existingSubscription) {
      throw new ConflictException(
        `Merchant ${merchant.name} already has an active subscription for this plan.`,
      );
    }

    // 🔹 Crear y guardar
    const merchSub = this.merchSubRepository.create({
      merchant,
      plan,
      startDate: createDto.startDate,
      endDate: createDto.endDate,
      renewalDate: createDto.renewalDate,
      status: createDto.status || 'active',
      paymentMethod: createDto.paymentMethod,
    });

    const saved = await this.merchSubRepository.save(merchSub);

    // 🔹 Retornar sin fechas de auditoría
    return {
      id: saved.id,
      merchant: { id: merchant.id, name: merchant.name },
      plan: { id: plan.id, name: plan.name },
      startDate: saved.startDate,
      endDate: saved.endDate,
      renewalDate: saved.renewalDate,
      status: saved.status,
      paymentMethod: saved.paymentMethod,
    };
  }

  async findAll(): Promise<MerchantSubscriptionSummaryDto[]> {
    try {
      const subscriptions = await this.merchSubRepository.find({
        relations: ['merchant', 'plan'],
        order: { createdAt: 'DESC' },
      });

      if (!subscriptions || subscriptions.length === 0) {
        throw new NotFoundException('No merchant subscriptions found');
      }

      return subscriptions.map((sub) => ({
        id: sub.id,
        merchant: {
          id: sub.merchant.id,
          name: sub.merchant.name,
        },
        plan: {
          id: sub.plan.id,
          name: sub.plan.name,
        },
        startDate: sub.startDate,
        endDate: sub.endDate,
        renewalDate: sub.renewalDate,
        status: sub.status,
        paymentMethod: sub.paymentMethod,
      }));
    } catch (error) {
      console.error('Error fetching merchant subscriptions:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve merchant subscriptions',
      );
    }
  }

  async findOne(id: number): Promise<MerchantSubscriptionSummaryDto> {
    const subscription = await this.merchSubRepository.findOne({
      where: { id },
      relations: ['merchant', 'plan'],
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with id ${id} not found`);
    }

    return {
      id: subscription.id,
      merchant: {
        id: subscription.merchant.id,
        name: subscription.merchant.name,
      },
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
      },
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      renewalDate: subscription.renewalDate,
      status: subscription.status,
      paymentMethod: subscription.paymentMethod,
    };
  }

  async update(
    id: number,
    dto: UpdateMerchSubDto,
  ): Promise<{ message: string }> {
    const subscription = await this.merchSubRepository.findOne({
      where: { id },
      relations: ['merchant', 'plan'],
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    // Validar merchantId
    if (dto.merchantId) {
      const merchant = await this.merchantRepository.findOneBy({
        id: dto.merchantId,
      });
      if (!merchant) {
        throw new NotFoundException(
          `Merchant with ID ${dto.merchantId} not found`,
        );
      }
      subscription.merchant = merchant;
    }

    // Validar planId
    if (dto.planId) {
      const plan = await this.subPlanRepository.findOneBy({ id: dto.planId });
      if (!plan) {
        throw new NotFoundException(`Plan with ID ${dto.planId} not found`);
      }
      subscription.plan = plan;
    }

    // Actualizar otros campos directamente
    Object.assign(subscription, dto);

    await this.merchSubRepository.save(subscription);

    return {
      message: `Merchant Subscription with ID ${id} updated successfully`,
    };
  }

  async remove(id: number): Promise<{ message: string }> {
    const merchSub = await this.merchSubRepository.findOne({ where: { id } });

    if (!merchSub) {
      throw new NotFoundException(
        `Merchant Subscription with ID ${id} not found`,
      );
    }

    await this.merchSubRepository.remove(merchSub);

    return {
      message: `Merchant Subscription with ID ${id} deleted successfully`,
    };
  }
}
