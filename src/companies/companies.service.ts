// src/companies/companies.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  create(dto: CreateCompanyDto) {
    const company = this.companyRepo.create(dto);
    return this.companyRepo.save(company);
  }

  async findAll() {
    const companies = await this.companyRepo.find({ relations: ['merchants'] });
    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      email: company.email,
      address: company.address,
      phone: company.phone,
      rut: company.rut,
      city: company.city,
      state: company.state,
      country: company.country,
      merchants:
        company.merchants?.map((m) => ({
          id: m.id,
          name: m.name,
        })) || [],
    }));
  }

  async findOne(id: number) {
    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ['merchants'],
    });
    if (!company) throw new NotFoundException('Company not found');
    return {
      id: company.id,
      name: company.name,
      email: company.email,
      address: company.address,
      phone: company.phone,
      rut: company.rut,
      city: company.city,
      state: company.state,
      country: company.country,
      merchants:
        company.merchants?.map((m) => ({
          id: m.id,
          name: m.name,
        })) || [],
    };
  }

  async update(id: number, dto: UpdateCompanyDto) {
    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ['merchants'],
    });
    if (!company) throw new NotFoundException('Company not found');
    Object.assign(company, dto);
    const updatedCompany = await this.companyRepo.save(company);
    return {
      id: updatedCompany.id,
      name: updatedCompany.name,
      email: updatedCompany.email,
      address: updatedCompany.address,
      phone: updatedCompany.phone,
      rut: updatedCompany.rut,
      city: updatedCompany.city,
      state: updatedCompany.state,
      country: updatedCompany.country,
      merchants:
        updatedCompany.merchants?.map((m) => ({
          id: m.id,
          name: m.name,
        })) || [],
    };
  }

  async remove(id: number) {
    const company = await this.companyRepo.findOne({
      where: { id },
    });
    if (!company) throw new NotFoundException('Company not found');
    const deletedCompany = await this.companyRepo.remove(company);
    return deletedCompany;
  }
}
