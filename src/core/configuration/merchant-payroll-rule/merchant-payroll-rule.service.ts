//src/core/configuration/merchant-payroll-rule/merchant-payroll-rule.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { Repository, In } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { MerchantPayrollRule } from './entity/merchant-payroll-rule.entity';
import { CreateMerchantPayrollRuleDto } from './dto/create-merchant-payroll-rule.dto';
import { OneMerchantPayrollRuleResponseDto } from './dto/merchant-payroll-rule-response.dto';
import { QueryMerchantPayrollRuleDto } from './dto/query-merchant-payroll-rule.dto';
import { PaginatedMerchantPayrollRuleResponseDto } from './dto/paginated-merchant-payroll-rule-response.dto';
import { UpdateMerchantPayrollRuleDto } from './dto/update-merchant-payroll-rule.dto';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';

@Injectable()
export class MerchantPayrollRuleService {
  constructor(
    @InjectRepository(MerchantPayrollRule)
    private readonly merchantPayrollRuleRepository: Repository<MerchantPayrollRule>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    dto: CreateMerchantPayrollRuleDto,
  ): Promise<OneMerchantPayrollRuleResponseDto> {
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

    const merchantPayrollRule = this.merchantPayrollRuleRepository.create({
      company: company,
      merchant: merchant,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      createdBy: createdByUser,
      updatedBy: updatedByUser,
      status: dto.status,
      name: dto.name,
      frequencyPayroll: dto.frequencyPayroll,
      payDayOfWeek: dto.payDayOfWeek,
      payDayOfMonth: dto.payDayOfMonth,
      allowNegativePayroll: dto.allowNegativePayroll,
      roundingPrecision: dto.roundingPrecision,
      currency: dto.currency,
      autoApprovePayroll: dto.autoApprovePayroll,
      requiresManagerApproval: dto.requiresManagerApproval,
    } as Partial<MerchantPayrollRule>);

    const savedMerchantPayrollRule =
      await this.merchantPayrollRuleRepository.save(merchantPayrollRule);
    return {
      statusCode: 201,
      message: 'Merchant Payroll Rule created successfully',
      data: savedMerchantPayrollRule,
    };
  }

  async findAll(
    query: QueryMerchantPayrollRuleDto,
  ): Promise<PaginatedMerchantPayrollRuleResponseDto> {
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

    const qb = this.merchantPayrollRuleRepository
      .createQueryBuilder('merchantPayrollRule')
      .leftJoin('merchantPayrollRule.company', 'company')
      .leftJoin('merchantPayrollRule.merchant', 'merchant')
      .leftJoin('merchantPayrollRule.createdBy', 'createdBy')
      .leftJoin('merchantPayrollRule.updatedBy', 'updatedBy')
      .select([
        'merchantPayrollRule',
        'company.id',
        'createdBy.id',
        'createdBy.email',
        'updatedBy.id',
        'updatedBy.email',
        'merchant.id',
        'merchant.name',
      ]);
    if (status) {
      qb.andWhere('merchantPayrollRule.status = :status', { status });
    } else {
      qb.andWhere('merchantPayrollRule.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('merchantPayrollRule.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`merchantPayrollRule.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Merchant Payroll Rules retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<OneMerchantPayrollRuleResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantPayrollRule =
      await this.merchantPayrollRuleRepository.findOne({
        where: { id, status: In(['active', 'inactive']) },
        relations: ['company', 'createdBy', 'updatedBy', 'merchant'],
      });
    if (!merchantPayrollRule) {
      ErrorHandler.merchantPayrollRuleNotFound();
    }
    return {
      statusCode: 200,
      message: 'Merchant Payroll Rule retrieved successfully',
      data: merchantPayrollRule,
    };
  }

  async update(
    id: number,
    dto: UpdateMerchantPayrollRuleDto,
  ): Promise<OneMerchantPayrollRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const merchantPayrollRule =
      await this.merchantPayrollRuleRepository.findOne({
        where: { id, status: In(['active', 'inactive']) },
        relations: ['company', 'merchant'],
      });
    if (!merchantPayrollRule) {
      ErrorHandler.merchantPayrollRuleNotFound();
    }

    if (dto.updatedById) {
      const updatedByUser = await this.userRepository.findOne({
        where: { id: dto.updatedById },
      });

      if (!updatedByUser) {
        ErrorHandler.notFound('UpdatedBy user not found');
      }

      merchantPayrollRule.updatedBy = updatedByUser;
    }

    Object.assign(merchantPayrollRule, dto);

    const updatedMerchantPayrollRule =
      await this.merchantPayrollRuleRepository.save(merchantPayrollRule);
    return {
      statusCode: 200,
      message: 'Merchant Payroll Rule updated successfully',
      data: updatedMerchantPayrollRule,
    };
  }

  async remove(id: number): Promise<OneMerchantPayrollRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantPayrollRule =
      await this.merchantPayrollRuleRepository.findOne({
        where: { id },
      });
    if (!merchantPayrollRule) {
      ErrorHandler.merchantPayrollRuleNotFound();
    }

    merchantPayrollRule.status = 'deleted';
    const deletedMerchantPayrollRule =
      await this.merchantPayrollRuleRepository.save(merchantPayrollRule);
    return {
      statusCode: 200,
      message: 'Merchant Payroll Rule deleted successfully',
      data: deletedMerchantPayrollRule,
    };
  }
}
