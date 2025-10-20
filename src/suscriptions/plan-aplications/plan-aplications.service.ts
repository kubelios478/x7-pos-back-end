import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanAplication } from './entity/plan-aplications.entity';
import { CreatePlanAplicationDto } from './dto/create-plan-aplication.dto';

@Injectable()
export class PlanAplicationsService {
  constructor(
    @InjectRepository(PlanAplication)
    private readonly planAplicationRepository: Repository<PlanAplication>,
  ) {}

  async create(dto: CreatePlanAplicationDto): Promise<PlanAplication> {
    // Verificar si ya existe la combinación plan_id + application_id
    const exists = await this.planAplicationRepository.findOne({
      where: {
        planId: dto.planId,
        applicationId: dto.applicationId,
      },
    });

    if (exists) {
      throw new ConflictException('This Plan-Aplication already exists');
    }

    // Crear la nueva entidad
    const newPlanApp = this.planAplicationRepository.create({
      planId: dto.planId,
      applicationId: dto.applicationId,
      limits: dto.limits,
    });

    return await this.planAplicationRepository.save(newPlanApp);
  }
}
