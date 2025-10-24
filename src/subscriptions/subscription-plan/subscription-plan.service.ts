// src/sub-plan/sub-plan.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './entity/subscription-plan.entity';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import {
  AllSubscriptionPlanResponseDto,
  OneSubscriptionPlanResponseDto,
} from './dto/subscription-plan-response.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepo: Repository<SubscriptionPlan>,
  ) {}

  async create(
    dto: CreateSubscriptionPlanDto,
  ): Promise<OneSubscriptionPlanResponseDto> {
    try {
      const subscriptionPlan = this.subscriptionPlanRepo.create(dto);
      const createdPlan =
        await this.subscriptionPlanRepo.save(subscriptionPlan);
      return {
        statusCode: 201,
        message: 'Subscription Plan created successfully',
        data: createdPlan,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(): Promise<AllSubscriptionPlanResponseDto> {
    const plans = await this.subscriptionPlanRepo.find();
    return {
      statusCode: 200,
      message: 'Subscription Plans retrieved successfully',
      data: plans,
    };
  }
  async findOne(id: number): Promise<OneSubscriptionPlanResponseDto> {
    if (!id || isNaN(Number(id))) {
      ErrorHandler.invalidId('Subscription Plan ID must be a positive number');
    }
    const plan = await this.subscriptionPlanRepo.findOne({ where: { id } });
    if (!plan) {
      ErrorHandler.subscriptionPlanNotFound();
    }
    return {
      statusCode: 200,
      message: 'Subscription Plan retrieved successfully',
      data: plan,
    };
  }

  async update(
    id: number,
    dto: UpdateSubscriptionPlanDto,
  ): Promise<OneSubscriptionPlanResponseDto> {
    if (!id || isNaN(Number(id))) {
      ErrorHandler.invalidId('Subscription Plan ID must be a positive number');
    }
    const plan = await this.subscriptionPlanRepo.findOne({ where: { id } });
    if (!plan) {
      ErrorHandler.subscriptionPlanNotFound();
    }
    Object.assign(plan, dto);
    try {
      const updatedPlan = await this.subscriptionPlanRepo.save(plan);
      return {
        statusCode: 200,
        message: 'Subscription Plan updated successfully',
        data: updatedPlan,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
  async remove(id: number): Promise<OneSubscriptionPlanResponseDto> {
    if (!id || isNaN(Number(id))) {
      ErrorHandler.invalidId('Subscription Plan ID must be a positive number');
    }
    const plan = await this.subscriptionPlanRepo.findOne({ where: { id } });
    if (!plan) {
      ErrorHandler.subscriptionPlanNotFound();
    }
    try {
      await this.subscriptionPlanRepo.remove(plan);
      return {
        statusCode: 200,
        message: 'Subscription Plan deleted successfully',
        data: plan,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
