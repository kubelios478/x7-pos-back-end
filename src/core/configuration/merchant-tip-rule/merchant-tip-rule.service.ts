//src/core/configuration/merchant-tip-rule/merchant-tip-rule.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { In, Repository } from 'typeorm';
import { CreateMerchantTipRuleDto } from './dto/create-merchant-tip-rule.dto';
import { OneMerchantTipRuleResponseDto } from './dto/merchant-tip-rule-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { MerchantTipRule } from './entity/merchant-tip-rule-entity';
import { QueryMerchantTipRuleDto } from './dto/query-merchant-tip-rule.dto';
import { PaginatedMerchantTipRuleResponseDto } from './dto/paginated-merchant-tip-rule-response.dto';
import { UpdateMerchantTipRuleDto } from './dto/update-merchant-tip-rule.dto';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { TipDistributionMethod } from '../constants/tip-distribution-method.enum';
import { TipCalculationMethod } from '../constants/tip-calculation-method.enum';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import {
  resolveMerchantContext,
  assertOwnsCompany,
} from '../utils/merchant-scoping.util';

const AUDIT_USER_SELECT: (keyof User)[] = ['id', 'username', 'email'];
const TIP_RULE_SELECT_FIELDS = [
  'merchantTipRule',
  'company.id',
  'createdBy.id',
  'createdBy.username',
  'createdBy.email',
  'updatedBy.id',
  'updatedBy.username',
  'updatedBy.email',
  'merchant.id',
  'merchant.name',
];

@Injectable()
export class MerchantTipRuleService {
  constructor(
    @InjectRepository(MerchantTipRule)
    private readonly merchantTipRuleRepository: Repository<MerchantTipRule>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private validateRoleBasedSum(
    tipDistributionMethod: TipDistributionMethod,
    staffPercentage?: number,
    kitchenPercentage?: number,
    managerPercentage?: number,
  ): void {
    if (tipDistributionMethod !== TipDistributionMethod.ROLE_BASED) {
      return;
    }

    if (
      staffPercentage == null ||
      kitchenPercentage == null ||
      managerPercentage == null
    ) {
      ErrorHandler.invalidInput(
        'Role based distribution requires all percentage fields',
      );
    }

    const pctTotal =
      Number(staffPercentage) + Number(kitchenPercentage) + Number(managerPercentage);

    if (Math.abs(pctTotal - 1) > 0.01) {
      ErrorHandler.invalidInput('Tip distribution percentages must total 1');
    }
  }

  private validateSuggestedPercentagesSum(
    tipCalculationMethod: TipCalculationMethod,
    suggestedPercentages?: number[],
  ): void {
    if (tipCalculationMethod !== TipCalculationMethod.PERCENTAGE) {
      return;
    }

    const sum = (suggestedPercentages ?? []).reduce(
      (acc, n) => acc + Number(n),
      0,
    );

    if (Math.abs(sum - 1) > 0.01) {
      ErrorHandler.invalidInput('Suggested percentages must sum to 100%');
    }
  }

  async create(
    dto: CreateMerchantTipRuleDto,
    user: AuthenticatedUser,
  ): Promise<OneMerchantTipRuleResponseDto> {
    this.validateRoleBasedSum(
      dto.tipDistributionMethod,
      dto.staffPercentage,
      dto.kitchenPercentage,
      dto.managerPercentage,
    );
    this.validateSuggestedPercentagesSum(
      dto.tipCalculationMethod,
      dto.suggestedPercentages,
    );

    const { merchant, companyId } = await resolveMerchantContext(
      this.merchantRepository,
      user,
    );

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) {
      ErrorHandler.notFound('Company not found');
    }

    const createdByUser = await this.userRepository.findOne({
      where: { id: user.id },
      select: AUDIT_USER_SELECT,
    });
    if (!createdByUser) {
      ErrorHandler.userNotFound();
    }

    const now = new Date();

    const merchantTipRule = this.merchantTipRuleRepository.create({
      company,
      merchant,
      createdAt: now,
      updatedAt: now,
      createdBy: createdByUser,
      updatedBy: createdByUser,
      status: 'active',
      name: dto.name,
      tipCalculationMethod: dto.tipCalculationMethod,
      tipDistributionMethod: dto.tipDistributionMethod,
      suggestedPercentages: dto.suggestedPercentages,
      fixedAmountOptions: dto.fixedAmountOptions,
      allowCustomTip: dto.allowCustomTip,
      maximumTipPercentage: dto.maximumTipPercentage,
      autoDistribute: dto.autoDistribute,

      staffPercentage: dto.staffPercentage,
      kitchenPercentage: dto.kitchenPercentage,
      managerPercentage: dto.managerPercentage,
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
    user: AuthenticatedUser,
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
      .leftJoin('merchantTipRule.createdBy', 'createdBy')
      .leftJoin('merchantTipRule.updatedBy', 'updatedBy')
      .leftJoin('merchantTipRule.merchant', 'merchant')
      .select(TIP_RULE_SELECT_FIELDS);

    if (user.role !== UserRole.PORTAL_ADMIN) {
      const { companyId } = await resolveMerchantContext(
        this.merchantRepository,
        user,
      );
      qb.andWhere('company.id = :companyId', { companyId });
    }

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
  async findOne(
    id: number,
    user: AuthenticatedUser,
  ): Promise<OneMerchantTipRuleResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantTipRule = await this.merchantTipRuleRepository
      .createQueryBuilder('merchantTipRule')
      .leftJoin('merchantTipRule.company', 'company')
      .leftJoin('merchantTipRule.createdBy', 'createdBy')
      .leftJoin('merchantTipRule.updatedBy', 'updatedBy')
      .leftJoin('merchantTipRule.merchant', 'merchant')
      .select(TIP_RULE_SELECT_FIELDS)
      .where('merchantTipRule.id = :id', { id })
      .andWhere('merchantTipRule.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      })
      .getOne();

    if (!merchantTipRule) {
      ErrorHandler.merchantTipRuleNotFound();
    }

    await assertOwnsCompany(
      this.merchantRepository,
      user,
      merchantTipRule.company.id,
    );

    return {
      statusCode: 200,
      message: 'Merchant Tip Rule retrieved successfully',
      data: merchantTipRule,
    };
  }

  async update(
    id: number,
    dto: UpdateMerchantTipRuleDto,
    user: AuthenticatedUser,
  ): Promise<OneMerchantTipRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const merchantTipRule = await this.merchantTipRuleRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['company', 'merchant'],
    });
    if (!merchantTipRule) {
      ErrorHandler.merchantTipRuleNotFound();
    }

    await assertOwnsCompany(
      this.merchantRepository,
      user,
      merchantTipRule.company.id,
    );

    if (
      dto.tipDistributionMethod !== undefined ||
      dto.staffPercentage !== undefined ||
      dto.kitchenPercentage !== undefined ||
      dto.managerPercentage !== undefined
    ) {
      this.validateRoleBasedSum(
        dto.tipDistributionMethod ?? merchantTipRule.tipDistributionMethod,
        dto.staffPercentage ?? merchantTipRule.staffPercentage,
        dto.kitchenPercentage ?? merchantTipRule.kitchenPercentage,
        dto.managerPercentage ?? merchantTipRule.managerPercentage,
      );
    }
    if (
      dto.tipCalculationMethod !== undefined ||
      dto.suggestedPercentages !== undefined
    ) {
      this.validateSuggestedPercentagesSum(
        dto.tipCalculationMethod ?? merchantTipRule.tipCalculationMethod,
        dto.suggestedPercentages ?? merchantTipRule.suggestedPercentages,
      );
    }

    const updatedByUser = await this.userRepository.findOne({
      where: { id: user.id },
      select: AUDIT_USER_SELECT,
    });
    if (!updatedByUser) {
      ErrorHandler.notFound('UpdatedBy user not found');
    }
    merchantTipRule.updatedBy = updatedByUser;
    merchantTipRule.updatedAt = new Date();

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
      ErrorHandler.merchantTipRuleNotFound();
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
