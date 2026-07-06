// src/platform-saas/companies/companies.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { UpdateCompanyProfileDto } from './dtos/update-company-profile.dto';
import {
  OneCompanyResponseDto,
  AllCompanyResponseDto,
} from './dtos/company-response.dto';
import {
  CompanyProfileDto,
  CompanyProfileResponseDto,
} from './dtos/company-profile.dto';
import { ErrorHandler } from '../../common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Customer } from 'src/core/business-partners/customers/entities/customer.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../users/constants/role.enum';
import { MerchantStatus } from '../merchants/constants/merchant-status.enum';
import { Configuration } from 'src/core/configuration/entity/configuration-entity';
import {
  CompanyConfigurationsResponseDto,
  CompanyConfigurationItemDto,
} from './dtos/company-configurations.dto';

const CONFIGURATION_TYPE_LABELS: Record<string, string> = {
  merchant_tax_rule: 'Tax Rules',
  merchant_tip_rule: 'Tip Rules',
  merchant_payroll_rule: 'Payroll Rules',
  merchant_overtime_rule: 'Overtime Rules',
};

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,

    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,

    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,

    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,

    @InjectRepository(Configuration)
    private readonly configurationRepo: Repository<Configuration>,
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

  async getProfileForUser(
    user: AuthenticatedUser,
  ): Promise<CompanyProfileResponseDto> {
    const companyId = await this.resolveUserCompanyId(user);
    const profile = await this.buildCompanyProfile(companyId);

    return {
      statusCode: 200,
      message: 'Company profile retrieved successfully',
      data: profile,
    };
  }

  async updateProfileForUser(
    user: AuthenticatedUser,
    dto: UpdateCompanyProfileDto,
  ): Promise<CompanyProfileResponseDto> {
    const companyId = await this.resolveUserCompanyId(user);

    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });

    if (!company) {
      ErrorHandler.notFound(ErrorMessage.COMPANY_NOT_FOUND);
    }

    try {
      Object.assign(company, dto);
      await this.companyRepo.save(company);
      const profile = await this.buildCompanyProfile(companyId);

      return {
        statusCode: 200,
        message: 'Company profile updated successfully',
        data: profile,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async getConfigurationsForUser(
    user: AuthenticatedUser,
  ): Promise<CompanyConfigurationsResponseDto> {
    const companyId = await this.resolveUserCompanyId(user);

    const configurations = await this.configurationRepo.find({
      where: { company: { id: companyId } },
      relations: ['merchant'],
      order: { updatedAt: 'DESC' },
    });

    const items: CompanyConfigurationItemDto[] = configurations.map(
      (configuration) => {
        const configType = (configuration as Configuration & { type?: string })
          .type;
        const configurationType = configType ?? 'configuration';

        return {
          id: configuration.id,
          configurationType,
          configurationLabel: this.getConfigurationLabel(configurationType),
          status: configuration.status,
          merchantId: configuration.merchant_id,
          merchantName: configuration.merchant?.name ?? `Branch ${configuration.merchant_id}`,
          updatedAt: this.formatConfigurationDate(configuration.updatedAt),
        };
      },
    );

    const activeConfigurations = items.filter(
      (item) => item.status.toLowerCase() === 'active',
    ).length;
    const configurationTypes = new Set(
      items.map((item) => item.configurationType),
    ).size;

    return {
      statusCode: 200,
      message: 'Company configurations retrieved successfully',
      data: {
        summary: {
          totalConfigurations: items.length,
          activeConfigurations,
          configurationTypes,
        },
        items,
      },
    };
  }

  async findOne(
    id: number,
    user?: AuthenticatedUser,
  ): Promise<OneCompanyResponseDto> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Company ID must be a positive number');
    }

    if (user) {
      await this.assertUserOwnsCompany(id, user);
    }

    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ['merchants'],
    });

    if (!company) {
      ErrorHandler.notFound(ErrorMessage.COMPANY_NOT_FOUND);
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
    user?: AuthenticatedUser,
  ): Promise<OneCompanyResponseDto> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Company ID must be a positive number');
    }

    if (user) {
      await this.assertUserOwnsCompany(id, user);
    }

    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ['merchants'],
    });

    if (!company) {
      ErrorHandler.notFound(ErrorMessage.COMPANY_NOT_FOUND);
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

  async remove(
    id: number,
    user?: AuthenticatedUser,
  ): Promise<OneCompanyResponseDto> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Company ID must be a positive number');
    }

    if (user) {
      await this.assertUserOwnsCompany(id, user);
    }

    const company = await this.companyRepo.findOne({
      where: { id },
    });

    if (!company) {
      ErrorHandler.notFound(ErrorMessage.COMPANY_NOT_FOUND);
    }

    const deletedCompany = { ...company };
    await this.companyRepo.remove(company);

    return {
      statusCode: 200,
      message: 'Company deleted successfully',
      data: deletedCompany,
    };
  }

  private formatConfigurationDate(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    return String(value).slice(0, 10);
  }

  private getConfigurationLabel(type: string): string {
    return (
      CONFIGURATION_TYPE_LABELS[type] ??
      type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    );
  }

  private async buildCompanyProfile(
    companyId: number,
  ): Promise<CompanyProfileDto> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });

    if (!company) {
      ErrorHandler.notFound(ErrorMessage.COMPANY_NOT_FOUND);
    }

    const [activeMerchantBranches, globalCorporateCustomers, authorizedMasterSuppliers] =
      await Promise.all([
        this.merchantRepo.count({
          where: { companyId, status: MerchantStatus.ACTIVE },
        }),
        this.customerRepo.count({ where: { companyId } }),
        this.supplierRepo.count({ where: { company_id: companyId } }),
      ]);

    return {
      id: company.id,
      name: company.name,
      rut: company.rut,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      state: company.state,
      country: company.country,
      metrics: {
        activeMerchantBranches,
        globalCorporateCustomers,
        authorizedMasterSuppliers,
      },
    };
  }

  private async resolveUserCompanyId(user: AuthenticatedUser): Promise<number> {
    if (user.role === UserRole.PORTAL_ADMIN) {
      ErrorHandler.forbidden(
        'Portal administrators must use company endpoints by ID.',
      );
    }

    const userMerchant = await this.merchantRepo.findOne({
      where: { id: user.merchant.id },
      select: ['id', 'companyId'],
    });

    if (!userMerchant?.companyId) {
      ErrorHandler.forbidden('Unable to resolve company for the current user.');
    }

    return userMerchant.companyId;
  }

  private async assertUserOwnsCompany(
    companyId: number,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (user.role === UserRole.PORTAL_ADMIN) {
      return;
    }

    const userCompanyId = await this.resolveUserCompanyId(user);
    if (companyId !== userCompanyId) {
      ErrorHandler.forbidden(
        'You do not have access to companies outside your organization.',
      );
    }
  }
}
