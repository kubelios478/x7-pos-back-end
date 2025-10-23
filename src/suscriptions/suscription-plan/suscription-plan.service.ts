// src/sub-plan/sub-plan.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuscriptionPlan } from './entity/suscription-plan.entity';
import { CreateSuscriptionPlanDto } from './dto/create-suscription-plan.dto';
import { SuscriptionPlanResponseDto } from './dto/suscription-plan-response.dto';
import { UpdateSuscriptionPlanDto } from './dto/update-suscription-plan.dto';

@Injectable()
export class SuscriptionPlanService {
  constructor(
    @InjectRepository(SuscriptionPlan)
    private readonly suscriptionPlanRepo: Repository<SuscriptionPlan>,
  ) {}

  async create(dto: CreateSuscriptionPlanDto): Promise<SuscriptionPlan> {
    const existingPlan = await this.suscriptionPlanRepo.findOne({
      where: { name: dto.name },
    });

    if (existingPlan) {
      throw new ConflictException(
        'A subscription plan with this name already exists.',
      );
    }

    const plan = this.suscriptionPlanRepo.create({
      ...dto,
      status: dto.status || 'active', // default status
    });

    return await this.suscriptionPlanRepo.save(plan);
  }

  async findAll(filters: {
    page: number;
    limit: number;
    status?: string;
  }): Promise<{
    data: SuscriptionPlanResponseDto[];
    page: number;
    limit: number;
    total: number;
  }> {
    const { page, limit, status } = filters;

    const query = this.suscriptionPlanRepo.createQueryBuilder('plan');

    if (status) {
      query.where('plan.status = :status', { status });
    }

    query.skip((page - 1) * limit).take(limit);

    const [plans, total] = await query.getManyAndCount();

    const data = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      billingCycle: plan.billingCycle,
      status: plan.status,
    }));

    return { data, page, limit, total };
  }
  async findOne(id: number): Promise<SuscriptionPlanResponseDto> {
    const plan = await this.suscriptionPlanRepo.findOne({ where: { id } });

    if (!plan) {
      throw new NotFoundException(`Subscription plan with id ${id} not found`);
    }

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      billingCycle: plan.billingCycle,
      status: plan.status,
    };
  }

  async update(
    id: number,
    updateSubPlanDto: UpdateSuscriptionPlanDto,
  ): Promise<{ message: string }> {
    if (!id || isNaN(Number(id))) {
      throw new BadRequestException('Invalid ID parameter.');
    }
    const plan = await this.suscriptionPlanRepo.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Subscription plan with id ${id} not found`);
    }
    if (updateSubPlanDto.name) {
      const existing = await this.suscriptionPlanRepo.findOne({
        where: { name: updateSubPlanDto.name },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          'A subscription plan with this name already exists.',
        );
      }
    }

    // 4️⃣ Update Data
    const updatedPlan = this.suscriptionPlanRepo.merge(plan, updateSubPlanDto);
    await this.suscriptionPlanRepo.save(updatedPlan);

    // 5️⃣ Return response without exposing timestamps
    return {
      message: `Subscription plan with ID ${id} was successfully updated.`,
    };
  }

  async remove(id: number): Promise<void> {
    if (id <= 0) {
      throw new BadRequestException('ID must be a positive integer');
    }

    const subPlan = await this.suscriptionPlanRepo.findOne({ where: { id } });

    if (!subPlan) {
      throw new NotFoundException(`Subscription plan with id ${id} not found`);
    }

    await this.suscriptionPlanRepo.remove(subPlan);
  }
}
