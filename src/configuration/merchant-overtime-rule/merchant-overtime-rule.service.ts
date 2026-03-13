//src/configuration/merchant-overtime-rule/merchant-overtime-rule.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository, In } from 'typeorm';
import { CreateMerchantOvertimeRuleDto } from './dto/create-merchant-overtime-rule.dto';
import { OneMerchantOvertimeRuleResponseDto } from './dto/merchant-overtime-rule-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { MerchantOvertimeRule } from './entity/merchant-overtime-rule.entity';
import { QueryMerchantOvertimeRuleDto } from './dto/query-merchant-overtime-rule.dto';
import { PaginatedMerchantOvertimeRuleResponseDto } from './dto/paginated-merchant-overtime-rule-response.dto';
import { UpdateMerchantOvertimeRuleDto } from './dto/update-merchant-overtime-rule.dto';

@Injectable()
export class MerchantOvertimeRuleService {
  constructor(
    @InjectRepository(MerchantOvertimeRule)
    private readonly merchantOvertimeRuleRepository: Repository<MerchantOvertimeRule>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    dto: CreateMerchantOvertimeRuleDto,
  ): Promise<OneMerchantOvertimeRuleResponseDto> {
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

    const merchantOvertimeRule = this.merchantOvertimeRuleRepository.create({
      company: company,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      createdBy: createdByUser,
      updatedBy: updatedByUser,
      status: dto.status,
      name: dto.name,
      description: dto.description,
      calculationMethod: dto.calculationMethod,
      thresholdHours: dto.thresholdHours,
      maxHours: dto.maxHours,
      rateMethod: dto.rateMethod,
      rateValue: dto.rateValue,
      appliesOnHolidays: dto.appliesOnHolidays,
      appliesOnWeekends: dto.appliesOnWeekends,
      priority: dto.priority,
    } as Partial<MerchantOvertimeRule>);

    const savedMerchantOvertimeRule =
      await this.merchantOvertimeRuleRepository.save(merchantOvertimeRule);
    return {
      statusCode: 201,
      message: 'Merchant Overtime Rule created successfully',
      data: savedMerchantOvertimeRule,
    };
  }

  async findAll(
    query: QueryMerchantOvertimeRuleDto,
  ): Promise<PaginatedMerchantOvertimeRuleResponseDto> {
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

    const qb = this.merchantOvertimeRuleRepository
      .createQueryBuilder('merchantOvertimeRule')
      .leftJoin('merchantOvertimeRule.company', 'company')
      .leftJoin('merchantOvertimeRule.createdBy', 'createdBy')
      .leftJoin('merchantOvertimeRule.updatedBy', 'updatedBy')
      .select([
        'merchantOvertimeRule',
        'company.id',
        'createdBy.id',
        'createdBy.email',
        'updatedBy.id',
        'updatedBy.email',
      ]);
    if (status) {
      qb.andWhere('merchantOvertimeRule.status = :status', { status });
    } else {
      qb.andWhere('merchantOvertimeRule.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('merchantOvertimeRule.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`merchantOvertimeRule.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Merchant Overtime Rules retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<OneMerchantOvertimeRuleResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantOvertimeRule =
      await this.merchantOvertimeRuleRepository.findOne({
        where: { id, status: In(['active', 'inactive']) },
        relations: ['company', 'createdBy', 'updatedBy'],
      });
    if (!merchantOvertimeRule) {
      ErrorHandler.merchantOvertimeRuleNotFound();
    }
    return {
      statusCode: 200,
      message: 'Merchant Overtime Rule retrieved successfully',
      data: merchantOvertimeRule,
    };
  }

  async update(
    id: number,
    dto: UpdateMerchantOvertimeRuleDto,
  ): Promise<OneMerchantOvertimeRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const merchantOvertimeRule =
      await this.merchantOvertimeRuleRepository.findOne({
        where: { id, status: In(['active', 'inactive']) },
        relations: ['company'],
      });
    if (!merchantOvertimeRule) {
      ErrorHandler.merchantOvertimeRuleNotFound();
    }

    if (dto.updatedById) {
      const updatedByUser = await this.userRepository.findOne({
        where: { id: dto.updatedById },
      });

      if (!updatedByUser) {
        ErrorHandler.notFound('UpdatedBy user not found');
      }

      merchantOvertimeRule.updatedBy = updatedByUser;
    }

    Object.assign(merchantOvertimeRule, dto);

    const updatedMerchantOvertimeRule =
      await this.merchantOvertimeRuleRepository.save(merchantOvertimeRule);
    return {
      statusCode: 200,
      message: 'Merchant Overtime Rule updated successfully',
      data: updatedMerchantOvertimeRule,
    };
  }

  async remove(id: number): Promise<OneMerchantOvertimeRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantOvertimeRule =
      await this.merchantOvertimeRuleRepository.findOne({
        where: { id },
      });
    if (!merchantOvertimeRule) {
      ErrorHandler.merchantOvertimeRuleNotFound();
    }

    merchantOvertimeRule.status = 'deleted';
    const deletedMerchantOvertimeRule =
      await this.merchantOvertimeRuleRepository.save(merchantOvertimeRule);
    return {
      statusCode: 200,
      message: 'Merchant Overtime Rule deleted successfully',
      data: deletedMerchantOvertimeRule,
    };
  }
}
