//src/configuration/merchant-tip-rule/merchant-tip-rule.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { In, Repository } from 'typeorm';
import { CreateMerchantTipRuleDto } from './dto/create-merchant-tip-rule.dto';
import { OneMerchantTipRuleResponseDto } from './dto/merchant-tip-rule-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { MerchantTipRule } from './entity/merchant-tip-rule-entity';
import { QueryMerchantTipRuleDto } from './dto/query-merchant-tip-rule.dto';
import { PaginatedMerchantTipRuleResponseDto } from './dto/paginated-merchant-tip-rule-response.dto';
import { UpdateMerchantTipRuleDto } from './dto/update-merchant-tip-rule.dto';

@Injectable()
export class MerchantTipRuleService {
  constructor(
    @InjectRepository(MerchantTipRule)
    private readonly merchantTipRuleRepository: Repository<MerchantTipRule>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async create(
    dto: CreateMerchantTipRuleDto,
  ): Promise<OneMerchantTipRuleResponseDto> {
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

    const merchantTipRule = this.merchantTipRuleRepository.create({
      company: company,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      createdBy: dto.createdBy,
      updatedBy: dto.updatedBy,
      status: dto.status,
      name: dto.name,
      tipCalculationMethod: dto.tipCalculationMethod,
      tipDistributionMethod: dto.tipDistributionMethod,
      suggestedPercentages: dto.suggestedPercentages,
      fixedAmountOptions: dto.fixedAmountOptions,
      allowCustomTip: dto.allowCustomTip,
      maximumTipPercentage: dto.maximumTipPercentage,
      includeKitchenStaff: dto.includeKitchenStaff,
      includeManagers: dto.includeManagers,
      autoDistribute: dto.autoDistribute,
    } as Partial<MerchantTipRule>);

    const savedMerchantTipRule =
      await this.merchantTipRuleRepository.save(merchantTipRule);
    return {
      statusCode: 201,
      message: 'Merchant Tip Rule created successfully',
      data: savedMerchantTipRule,
    };
  }

  async findAll(
    query: QueryMerchantTipRuleDto,
  ): Promise<PaginatedMerchantTipRuleResponseDto> {
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

    const qb = this.merchantTipRuleRepository
      .createQueryBuilder('merchantTipRule')
      .leftJoin('merchantTipRule.company', 'company')
      .select(['merchantTipRule', 'company.id']);
    if (status) {
      qb.andWhere('merchantTipRule.status = :status', { status });
    } else {
      qb.andWhere('merchantTipRule.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('merchantTipRule.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`merchantTipRule.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Merchant Tip Rules retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: number): Promise<OneMerchantTipRuleResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantTipRule = await this.merchantTipRuleRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['company'],
    });
    if (!merchantTipRule) {
      ErrorHandler.notFound('Merchant Tip Rule not found');
    }
    return {
      statusCode: 200,
      message: 'Merchant Tip Rule retrieved successfully',
      data: merchantTipRule,
    };
  }

  async update(
    id: number,
    dto: UpdateMerchantTipRuleDto,
  ): Promise<OneMerchantTipRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const merchantTipRule = await this.merchantTipRuleRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['company'],
    });
    if (!merchantTipRule) {
      ErrorHandler.notFound('Merchant Tip Rule not found');
    }

    Object.assign(merchantTipRule, dto);

    const updatedMerchantTipRule =
      await this.merchantTipRuleRepository.save(merchantTipRule);
    return {
      statusCode: 200,
      message: 'Merchant Tip Rule updated successfully',
      data: updatedMerchantTipRule,
    };
  }

  async remove(id: number): Promise<OneMerchantTipRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantTipRule = await this.merchantTipRuleRepository.findOne({
      where: { id },
    });
    if (!merchantTipRule) {
      ErrorHandler.notFound('Merchant Tip Rule not found');
    }

    merchantTipRule.status = 'deleted';
    const deletedMerchantTipRule =
      await this.merchantTipRuleRepository.save(merchantTipRule);
    return {
      statusCode: 200,
      message: 'Merchant Tip Rule deleted successfully',
      data: deletedMerchantTipRule,
    };
  }
}
