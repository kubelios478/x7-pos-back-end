// src/sub-plan/sub-plan.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
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

    if (dto.price <= 0) {
      throw new BadRequestException(
        'The plan price must be greater than zero.',
      );
    }

    const plan = this.subPlanRepo.create({
      ...dto,
      status: dto.status || 'active', // default status
    });

    return await this.subPlanRepo.save(plan);
  }

  async findAll(filters: {
    page: number;
    limit: number;
    status?: string;
  }): Promise<{
    data: SubPlanResponseDto[];
    page: number;
    limit: number;
    total: number;
  }> {
    const { page, limit, status } = filters;

    const query = this.subPlanRepo.createQueryBuilder('plan');

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
  async findOne(id: number): Promise<SubPlanResponseDto> {
    const plan = await this.subPlanRepo.findOne({ where: { id } });

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
    updateSubPlanDto: UpdateSubPlanDto,
  ): Promise<{ message: string }> {
    if (!id || isNaN(Number(id))) {
      throw new BadRequestException('Invalid ID parameter.');
    }
    const plan = await this.subPlanRepo.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Subscription plan with id ${id} not found`);
    }
    if (updateSubPlanDto.name) {
      const existing = await this.subPlanRepo.findOne({
        where: { name: updateSubPlanDto.name },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          'A subscription plan with this name already exists.',
        );
      }
    }

    // 4️⃣ Actualizar los datos
    const updatedPlan = this.subPlanRepo.merge(plan, updateSubPlanDto);
    await this.subPlanRepo.save(updatedPlan);

    // 5️⃣ Devolver respuesta sin exponer timestamps
    return {
      message: `Subscription plan with ID ${id} was successfully updated.`,
    };
  }

  async remove(id: number): Promise<void> {
    if (id <= 0) {
      throw new BadRequestException('ID must be a positive integer');
    }

    const subPlan = await this.subPlanRepo.findOne({ where: { id } });

    if (!subPlan) {
      throw new NotFoundException(`Subscription plan with id ${id} not found`);
    }

    await this.subPlanRepo.remove(subPlan);
  }
}
