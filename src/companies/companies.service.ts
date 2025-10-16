// src/companies/companies.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import {
  OneCompanyResponseDto,
  AllCompanyResponseDto,
} from './dtos/company-response.dto';
import { ErrorHandler } from '../common/utils/error-handler.util';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(dto: CreateCompanyDto): Promise<OneCompanyResponseDto> {
    try {
      const company = this.companyRepo.create(dto);
      const createdCompany = await this.companyRepo.save(company);

      return {
        statusCode: 201,
        message: 'Company created successfully',
        data: createdCompany,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(): Promise<AllCompanyResponseDto> {
    const companies = await this.companyRepo.find({ relations: ['merchants'] });

    return {
      statusCode: 200,
      message: 'Companies retrieved successfully',
      data: companies,
    };
  }

  async findOne(id: number): Promise<OneCompanyResponseDto> {
    // Validate ID parameter
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Company ID must be a positive number');
    }

    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ['merchants'],
    });

    if (!company) {
      ErrorHandler.companyNotFound();
    }

    return {
      statusCode: 200,
      message: 'Company retrieved successfully',
      data: company,
    };
  }

  async update(
    id: number,
    dto: UpdateCompanyDto,
  ): Promise<OneCompanyResponseDto> {
    // Validate ID parameter
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Company ID must be a positive number');
    }

    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ['merchants'],
    });

    if (!company) {
      ErrorHandler.companyNotFound();
    }

    try {
      Object.assign(company, dto);
      const updatedCompany = await this.companyRepo.save(company);

      return {
        statusCode: 200,
        message: 'Company updated successfully',
        data: updatedCompany,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(id: number): Promise<OneCompanyResponseDto> {
    // Validate ID parameter
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Company ID must be a positive number');
    }

    const company = await this.companyRepo.findOne({
      where: { id },
    });

    if (!company) {
      ErrorHandler.companyNotFound();
    }

    // We save the data before deleting
    const deletedCompany = { ...company };
    await this.companyRepo.remove(company);

    return {
      statusCode: 200,
      message: 'Company deleted successfully',
      data: deletedCompany,
    };
  }
}
