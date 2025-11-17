//src/subscriptions/applications/applications.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { ApplicationEntity } from './entity/application-entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AllApplicationResponseDto,
  OneApplicationResponseDto,
} from './dto/application-response.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepo: Repository<ApplicationEntity>,
  ) {}
  async create(dto: CreateApplicationDto): Promise<OneApplicationResponseDto> {
    const existing = await this.applicationRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Application with name "${dto.name}" already exists`,
      );
    }
    const application = this.applicationRepo.create(dto);
    const createdApplication = await this.applicationRepo.save(application);
    return {
      statusCode: 201,
      message: 'Application created successfully',
      data: createdApplication,
    };
  }

  async findAll(): Promise<AllApplicationResponseDto> {
    const applications = await this.applicationRepo.find({
      where: { status: In(['active', 'inactive']) },
    });
    return {
      statusCode: 200,
      message: 'Applications retrieved successfully',
      data: applications,
    };
  }
  async findOne(id: number): Promise<OneApplicationResponseDto> {
    // Validate ID parameter
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Application ID must be a positive number');
    }

    const application = await this.applicationRepo.findOne({
      where: { id, status: In(['active', 'inactive']) },
    });

    if (!application) {
      ErrorHandler.applicationNotFound();
    }

    return {
      statusCode: 200,
      message: 'Application retrieved successfully',
      data: application,
    };
  }
  async update(
    id: number,
    dto: UpdateApplicationDto,
  ): Promise<OneApplicationResponseDto> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Application ID must be a positive number');
    }

    const application = await this.applicationRepo.findOne({ where: { id } });

    if (!application) {
      ErrorHandler.applicationNotFound();
    }

    Object.assign(application, dto);

    const updatedApplication = await this.applicationRepo.save(application);
    return {
      statusCode: 200,
      message: 'Application updated successfully',
      data: updatedApplication,
    };
  }
  async remove(id: number): Promise<OneApplicationResponseDto> {
    // Validate ID parameter
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Application ID must be a positive number');
    }

    const application = await this.applicationRepo.findOne({ where: { id } });

    if (!application) {
      ErrorHandler.applicationNotFound();
    }
    application.status = 'deleted';
    await this.applicationRepo.save(application);
    return {
      statusCode: 200,
      message: `Application with ID ${id} deleted successfully`,
      data: application,
    };
  }
}
