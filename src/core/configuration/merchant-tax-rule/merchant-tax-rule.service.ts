//src/core/configuration/merchant-overtime-rule/merchant-overtime-rule.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { Repository, In } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { MerchantTaxRule } from './entity/merchant-tax-rule.entity';
import { CreateMerchantTaxRuleDto } from './dto/create-merchant-tax-rule.dto';
import { OneMerchantTaxRuleResponseDto } from './dto/merchant-tax-rule-response.dto';
import { QueryMerchantTaxRuleDto } from './dto/query-merchant-tax-rule.dto';
import { PaginatedMerchantTaxRuleResponseDto } from './dto/paginated-merchant-tax-rule-response.dto';
import { UpdateMerchantTaxRuleDto } from './dto/update-merchant-tax-rule.dto';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';

@Injectable()
export class MerchantTaxRuleService {
  constructor(
    @InjectRepository(MerchantTaxRule)
    private readonly merchantTaxRuleRepository: Repository<MerchantTaxRule>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    dto: CreateMerchantTaxRuleDto,
  ): Promise<OneMerchantTaxRuleResponseDto> {
    if (dto.companyId && !Number.isInteger(dto.companyId)) {
      ErrorHandler.invalidId('Company ID must be a positive integer');
    }

    let company: Company | null = null;
    if (dto.companyId) {
      company = await this.companyRepository.findOne({
        where: { id: dto.companyId },
      });
      if (!company) {
        ErrorHandler.notFound('Company not found');
      }
    }

    let merchant: Merchant | null = null;
    if (dto.merchantId) {
      merchant = await this.merchantRepository.findOne({
        where: { id: dto.merchantId },
      });
      if (!merchant) {
        ErrorHandler.notFound('Merchant not found');
      }
    }

    const createdByUser = await this.userRepository.findOne({
      where: { id: dto.createdById },
    });

    if (!createdByUser) {
      ErrorHandler.notFound('CreatedBy user not found');
    }

    const updatedByUser = await this.userRepository.findOne({
      where: { id: dto.updatedById },
    });

    if (!updatedByUser) {
      ErrorHandler.notFound('UpdatedBy user not found');
    }

    const merchantTaxRule = this.merchantTaxRuleRepository.create({
      company: company,
      merchant: merchant,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      createdBy: createdByUser,
      updatedBy: updatedByUser,
      status: dto.status,
      name: dto.name,
      description: dto.description,
      taxType: dto.taxType,
      rate: dto.rate,
      appliesToTips: dto.appliesToTips,
      appliesToOvertime: dto.appliesToOvertime,
      isCompound: dto.isCompound,
      externalTaxCode: dto.externalTaxCode,
    } as Partial<MerchantTaxRule>);

    const savedMerchantTaxRule =
      await this.merchantTaxRuleRepository.save(merchantTaxRule);
    return {
      statusCode: 201,
      message: 'Merchant Tax Rule created successfully',
      data: savedMerchantTaxRule,
    };
  }

  async findAll(
    query: QueryMerchantTaxRuleDto,
  ): Promise<PaginatedMerchantTaxRuleResponseDto> {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.merchantTaxRuleRepository
      .createQueryBuilder('merchantTaxRule')
      .leftJoin('merchantTaxRule.company', 'company')
      .leftJoin('merchantTaxRule.createdBy', 'createdBy')
      .leftJoin('merchantTaxRule.updatedBy', 'updatedBy')
      .leftJoin('merchantTaxRule.merchant', 'merchant')
      .select([
        'merchantTaxRule',
        'company.id',
        'createdBy.id',
        'createdBy.email',
        'updatedBy.id',
        'updatedBy.email',
        'merchant.id',
        'merchant.name',
      ]);
    if (status) {
      qb.andWhere('merchantTaxRule.status = :status', { status });
    } else {
      qb.andWhere('merchantTaxRule.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('merchantTaxRule.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`merchantTaxRule.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Merchant Tax Rules retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<OneMerchantTaxRuleResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantTaxRule = await this.merchantTaxRuleRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['company', 'createdBy', 'updatedBy', 'merchant'],
    });
    if (!merchantTaxRule) {
      ErrorHandler.merchantTaxRuleNotFound();
    }
    return {
      statusCode: 200,
      message: 'Merchant Tax Rule retrieved successfully',
      data: merchantTaxRule,
    };
  }

  async update(
    id: number,
    dto: UpdateMerchantTaxRuleDto,
  ): Promise<OneMerchantTaxRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const merchantTaxRule = await this.merchantTaxRuleRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['company', 'merchant'],
    });
    if (!merchantTaxRule) {
      ErrorHandler.merchantTaxRuleNotFound();
    }

    if (dto.updatedById) {
      const updatedByUser = await this.userRepository.findOne({
        where: { id: dto.updatedById },
      });

      if (!updatedByUser) {
        ErrorHandler.notFound('UpdatedBy user not found');
      }

      merchantTaxRule.updatedBy = updatedByUser;
    }

    Object.assign(merchantTaxRule, dto);

    const updatedMerchantTaxRule =
      await this.merchantTaxRuleRepository.save(merchantTaxRule);
    return {
      statusCode: 200,
      message: 'Merchant Tax Rule updated successfully',
      data: updatedMerchantTaxRule,
    };
  }

  async remove(id: number): Promise<OneMerchantTaxRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantTaxRule = await this.merchantTaxRuleRepository.findOne({
      where: { id },
    });
    if (!merchantTaxRule) {
      ErrorHandler.merchantTaxRuleNotFound();
    }

    merchantTaxRule.status = 'deleted';
    const deletedMerchantTaxRule =
      await this.merchantTaxRuleRepository.save(merchantTaxRule);
    return {
      statusCode: 200,
      message: 'Merchant Tax Rule deleted successfully',
      data: deletedMerchantTaxRule,
    };
  }
}
