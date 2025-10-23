//src/suscriptions/aplications/aplications.service.ts
import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { AplicationEntity } from './entity/aplication-entity';
import { CreateAplicationDto } from './dto/create-aplication.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AplicationResponseDto } from './dto/aplication-response.dto';
import { UpdateAplicationDto } from './dto/update-aplication.dto';

@Injectable()
export class AplicationsService {
  constructor(
    @InjectRepository(AplicationEntity)
    private readonly aplicationRepo: Repository<AplicationEntity>,
  ) {}
  async create(dto: CreateAplicationDto): Promise<AplicationEntity> {
    const existingApp = await this.aplicationRepo.findOne({
      where: { name: dto.name },
    });
    if (existingApp) {
      throw new ConflictException(
        'An application with this name already exists.',
      );
    }
    if (!dto.name || !dto.description || !dto.category || !dto.status) {
      throw new BadRequestException('All fields are required.');
    }
    if (
      dto.name.trim() === '' ||
      dto.description.trim() === '' ||
      dto.category.trim() === '' ||
      dto.status.trim() === ''
    ) {
      throw new BadRequestException('Fields cannot be empty.');
    }
    if (!['active', 'inactive'].includes(dto.status.toLowerCase())) {
      throw new BadRequestException(
        "Status must be either 'active' or 'inactive'.",
      );
    }
    const application = this.aplicationRepo.create(dto);
    return await this.aplicationRepo.save(application);
  }

  async findAll(filters: {
    page: number;
    limit: number;
    status?: string;
  }): Promise<{
    data: AplicationResponseDto[];
    page: number;
    limit: number;
    total: number;
  }> {
    const { page, limit, status } = filters;

    const query = this.aplicationRepo.createQueryBuilder('app');

    if (status) {
      query.where('app.status = :status', { status });
    }

    query.skip((page - 1) * limit).take(limit);

    const [apps, total] = await query.getManyAndCount();

    const data = apps.map((apps) => ({
      id: apps.id,
      name: apps.name,
      description: apps.description,
      category: apps.category,
      status: apps.status,
    }));

    return { data, page, limit, total };
  }
  async findOne(id: number): Promise<AplicationResponseDto> {
    const apps = await this.aplicationRepo.findOne({ where: { id } });

    if (!apps) {
      throw new NotFoundException(`Aplication with id ${id} not found`);
    }

    return {
      id: apps.id,
      name: apps.name,
      description: apps.description,
      category: apps.category,
      status: apps.status,
    };
  }
  async update(
    id: number,
    updateAplicationDto: UpdateAplicationDto,
  ): Promise<{ message: string }> {
    if (!id || isNaN(Number(id))) {
      throw new BadRequestException('Invalid ID parameter.');
    }
    const plan = await this.aplicationRepo.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Aplication with id ${id} not found`);
    }
    if (updateAplicationDto.name) {
      const existing = await this.aplicationRepo.findOne({
        where: { name: updateAplicationDto.name },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          'A aplication with this name already exists.',
        );
      }
    }

    // 4️⃣ Update Data
    const updatedApp = this.aplicationRepo.merge(plan, updateAplicationDto);
    await this.aplicationRepo.save(updatedApp);

    // 5️⃣ Return response without exposing timestamps
    return {
      message: `Aplication with ID ${id} was successfully updated.`,
    };
  }

  async remove(id: number): Promise<void> {
    if (id <= 0) {
      throw new BadRequestException('ID must be a positive integer');
    }

    const app = await this.aplicationRepo.findOne({ where: { id } });

    if (!app) {
      throw new NotFoundException(`APlication with id ${id} not found`);
    }

    await this.aplicationRepo.remove(app);
  }
}
