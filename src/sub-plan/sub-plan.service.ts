// src/sub-plan/sub-plan.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubPlan } from './entity/sub-plan.entity';
import { CreateSubPlanDto } from './dto/create-sub-plan.dto';
import { SubPlanResponseDto } from './dto/sub-plan-response.dto';
import { UpdateSubPlanDto } from './dto/update-sub-plan.dto';

@Injectable()
export class SubPlanService {
  constructor(
    @InjectRepository(SubPlan)
    private readonly subPlanRepo: Repository<SubPlan>,
  ) {}

  async create(dto: CreateSubPlanDto): Promise<SubPlan> {
    const existingPlan = await this.subPlanRepo.findOne({
      where: { name: dto.name },
    });

    if (existingPlan) {
      throw new ConflictException(
        'A subscription plan with this name already exists.',
      );
    }

    const plan = this.subPlanRepo.create({
      ...dto,
      status: dto.status || 'active', // default status
    });

    return await this.subPlanRepo.save(plan);
  }

  async findAll(): Promise<SubPlanResponseDto[]> {
    const plans = await this.subPlanRepo.find();
    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      billingCycle: plan.billingCycle,
      status: plan.status,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }));
  }
  async findOne(id: number): Promise<SubPlan> {
    const plan = await this.subPlanRepo.findOne({ where: { id } });

    if (!plan) {
      throw new NotFoundException(`Subscription plan with id ${id} not found`);
    }

    return plan;
  }

  async update(
    id: number,
    updateSubPlanDto: UpdateSubPlanDto,
  ): Promise<SubPlanResponseDto> {
    const plan = await this.subPlanRepo.findOne({ where: { id } });

    if (!plan) {
      throw new NotFoundException(`Subscription plan with id ${id} not found`);
    }
    const updatedPlan = this.subPlanRepo.merge(plan, updateSubPlanDto);
    const savedPlan = await this.subPlanRepo.save(updatedPlan);
    return savedPlan;
  }

  async remove(id: number): Promise<void> {
    const subPlan = await this.subPlanRepo.findOne({ where: { id } });
    if (!subPlan) {
      throw new NotFoundException('Subscription plan not found');
    }

    await this.subPlanRepo.remove(subPlan);
  }
}
