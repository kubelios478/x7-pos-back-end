// src/merchants/merchants.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from './entities/merchant.entity';
import { CreateMerchantDto } from './dtos/create-merchant.dto';
import { UpdateMerchantDto } from './dtos/update-merchant.dto';
import { Company } from '../companies/entities/company.entity';
import {
  OneMerchantResponseDto,
  AllMerchantsResponseDto,
} from './dtos/merchant-response.dto';
import { ErrorHandler } from '../common/utils/error-handler.util';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(dto: CreateMerchantDto): Promise<OneMerchantResponseDto> {
    // Validate companyId format if provided
    if (
      dto.companyId &&
      (!Number.isInteger(dto.companyId) || dto.companyId <= 0)
    ) {
      ErrorHandler.invalidId('Company ID must be a positive integer');
    }

    try {
      // Check if company exists when companyId is provided
      let company: Company | null = null;
      if (dto.companyId) {
        company = await this.companyRepo.findOne({
          where: { id: dto.companyId },
        });
        if (!company) {
          ErrorHandler.resourceNotFound('Company', dto.companyId);
        }
      }

      const merchant = this.merchantRepo.create({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        rut: dto.rut,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        companyId: dto.companyId,
      } as Partial<Merchant>);

      const savedMerchant = await this.merchantRepo.save(merchant);

      return {
        statusCode: 201,
        message: 'Merchant created successfully',
        data: savedMerchant,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(): Promise<AllMerchantsResponseDto> {
    const merchants = await this.merchantRepo.find({
      relations: ['company', 'users'],
      select: {
        users: {
          id: true,
          username: true,
          email: true,
          role: true,
          scope: true,
        },
      },
    });

    return {
      statusCode: 200,
      message: 'Merchants retrieved successfully',
      data: merchants,
    };
  }

  async findOne(id: number): Promise<OneMerchantResponseDto> {
    // Validate ID format
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Merchant ID must be a positive integer');
    }

    const merchant = await this.merchantRepo.findOne({
      where: { id },
      relations: ['company', 'users'],
      select: {
        users: {
          id: true,
          username: true,
          email: true,
          role: true,
          scope: true,
        },
      },
    });

    if (!merchant) {
      ErrorHandler.merchantNotFound();
    }

    return {
      statusCode: 200,
      message: 'Merchant retrieved successfully',
      data: merchant,
    };
  }

  async update(
    id: number,
    dto: UpdateMerchantDto,
  ): Promise<OneMerchantResponseDto> {
    // Validate ID format
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Merchant ID must be a positive integer');
    }

    try {
      const merchant = await this.merchantRepo.findOne({
        where: { id },
        relations: ['company', 'users'],
        select: {
          users: {
            id: true,
            username: true,
            email: true,
            role: true,
            scope: true,
          },
        },
      });

      if (!merchant) {
        ErrorHandler.merchantNotFound();
      }

      Object.assign(merchant, dto);
      const updatedMerchant = await this.merchantRepo.save(merchant);

      return {
        statusCode: 200,
        message: 'Merchant updated successfully',
        data: updatedMerchant,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(id: number): Promise<OneMerchantResponseDto> {
    // Validate ID format
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Merchant ID must be a positive integer');
    }

    try {
      const merchant = await this.merchantRepo.findOne({
        where: { id },
      });

      if (!merchant) {
        ErrorHandler.merchantNotFound();
      }

      const deletedMerchant = { ...merchant };
      await this.merchantRepo.remove(merchant);

      return {
        statusCode: 200,
        message: 'Merchant deleted successfully',
        data: deletedMerchant,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
