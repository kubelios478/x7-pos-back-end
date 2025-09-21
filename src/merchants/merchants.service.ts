// src/companies/companies.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from './entities/merchant.entity';
import { CreateMerchantDto } from './dtos/create-merchant.dto';
import { UpdateMerchantDto } from './dtos/update-merchant.dto';
import { Company } from '../companies/entities/company.entity';
import { console } from 'inspector';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(dto: CreateMerchantDto) {
    const company = dto.companyId
      ? await this.companyRepo.findOne({ where: { id: dto.companyId } })
      : undefined;

    console.log('Company:', company);

    if (dto.companyId && !company) {
      throw new NotFoundException('Company not found');
    }
    console.log('Creating merchant with company:', company);
    const merchant = this.merchantRepo.create({
      name: dto.name,
      email: dto.email,
      address: dto.address,
      companyId: dto.companyId,
    } as Partial<Merchant>);
    console.log('Merchant entity before save:', merchant);
    await this.merchantRepo.save(merchant);
    console.log('Merchant saved:', merchant);
    return { merchant };
  }

  async findAll() {
    const merchants = await this.merchantRepo.find({
      relations: ['company', 'users'],
    });
    return merchants.map((m) => ({
      ...m,
      company: m.company ? { id: m.company.id, name: m.company.name } : null,
      users: m.users
        ? m.users.map((user) => ({ id: user.id, username: user.username }))
        : null,
    }));
  }

  async findOne(id: number) {
    const merchant = await this.merchantRepo.findOne({
      where: { id },
      relations: ['company', 'users'],
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return {
      ...merchant,
      company: merchant.company
        ? { id: merchant.company.id, name: merchant.company.name }
        : null,
      users: merchant.users
        ? merchant.users.map((user) => ({
            id: user.id,
            username: user.username,
          }))
        : null,
    };
  }

  async update(id: number, dto: UpdateMerchantDto) {
    const merchant = await this.merchantRepo.findOne({
      where: { id },
      relations: ['company', 'users'],
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    Object.assign(merchant, dto);
    const updatedMerchant = await this.merchantRepo.save(merchant);
    return {
      id: updatedMerchant.id,
      name: updatedMerchant.name,
      email: updatedMerchant.email,
      address: updatedMerchant.address,
      company: updatedMerchant.company
        ? { id: updatedMerchant.company.id, name: updatedMerchant.company.name }
        : null,
      users: updatedMerchant.users
        ? updatedMerchant.users.map((user) => ({
            id: user.id,
            username: user.username,
          }))
        : null,
    };
  }

  async remove(id: number) {
    const merchant = await this.merchantRepo.findOne({
      where: { id },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return this.merchantRepo.remove(merchant);
  }
}
