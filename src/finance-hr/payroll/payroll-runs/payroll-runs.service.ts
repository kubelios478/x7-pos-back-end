import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PayrollRun } from './entities/payroll-run.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { UpdatePayrollRunDto } from './dto/update-payroll-run.dto';
import {
  GetPayrollRunsQueryDto,
  PayrollRunSortBy,
} from './dto/get-payroll-runs-query.dto';
import {
  PayrollRunResponseDto,
  OnePayrollRunResponseDto,
} from './dto/payroll-run-response.dto';
import { PaginatedPayrollRunsResponseDto } from './dto/paginated-payroll-runs-response.dto';
import { PayrollRunStatus } from './constants/payroll-run-status.enum';

@Injectable()
export class PayrollRunsService {
  constructor(
    @InjectRepository(PayrollRun)
    private readonly runRepo: Repository<PayrollRun>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  private toResponseDto(r: PayrollRun): PayrollRunResponseDto {
    return {
      id: r.id,
      company_id: r.company_id,
      merchant_id: r.merchant_id,
      period_start:
        r.period_start instanceof Date
          ? r.period_start.toISOString().split('T')[0]
          : String(r.period_start),
      period_end:
        r.period_end instanceof Date
          ? r.period_end.toISOString().split('T')[0]
          : String(r.period_end),
      status: r.status,
      created_at: r.created_at?.toISOString() ?? '',
      approved_at: r.approved_at ? r.approved_at.toISOString() : null,
    };
  }

  /** `where` fragment that keeps merchant users inside their merchant (none for portal users). */
  private ownedBy(scopedMerchantId?: number) {
    return scopedMerchantId != null ? { merchant_id: scopedMerchantId } : {};
  }

  /** For merchant users, every id the DTO references must belong to their merchant. */
  private async assertReferencesOwned(
    dto: { merchant_id?: number },
    scopedMerchantId?: number,
  ): Promise<void> {
    if (scopedMerchantId == null) return;
    if (dto.merchant_id != null && dto.merchant_id !== scopedMerchantId) {
      throw new ForbiddenException(
        'You can only access payroll data of your merchant',
      );
    }
  }

  async create(
    dto: CreatePayrollRunDto,
    scopedMerchantId?: number,
  ): Promise<OnePayrollRunResponseDto> {
    await this.assertReferencesOwned(dto, scopedMerchantId);

    const company = await this.companyRepo.findOne({
      where: { id: dto.company_id },
    });
    if (!company) {
      throw new NotFoundException(
        `Company with ID ${dto.company_id} not found`,
      );
    }

    const merchant = await this.merchantRepo.findOne({
      where: { id: dto.merchant_id },
    });
    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${dto.merchant_id} not found`,
      );
    }
    if (merchant.companyId !== dto.company_id) {
      throw new BadRequestException(
        `Merchant ${dto.merchant_id} does not belong to company ${dto.company_id}`,
      );
    }

    const periodStart = new Date(dto.period_start);
    const periodEnd = new Date(dto.period_end);
    if (periodEnd < periodStart) {
      throw new BadRequestException(
        'period_end must be on or after period_start',
      );
    }

    const run = this.runRepo.create({
      company_id: dto.company_id,
      merchant_id: dto.merchant_id,
      period_start: periodStart,
      period_end: periodEnd,
      status: dto.status ?? PayrollRunStatus.DRAFT,
    });

    const saved = await this.runRepo.save(run);
    return {
      statusCode: 201,
      message: 'Payroll run created successfully',
      data: this.toResponseDto(saved),
    };
  }

  async findAll(
    query: GetPayrollRunsQueryDto,
    scopedMerchantId?: number,
  ): Promise<PaginatedPayrollRunsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? PayrollRunSortBy.CREATED_AT;
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.runRepo
      .createQueryBuilder('run')
      .where('run.deleted_at IS NULL');

    if (scopedMerchantId != null) {
      qb.andWhere('run.merchant_id = :scopedMerchantId', { scopedMerchantId });
    }

    if (query.company_id != null) {
      qb.andWhere('run.company_id = :companyId', {
        companyId: query.company_id,
      });
    }
    if (query.merchant_id != null) {
      qb.andWhere('run.merchant_id = :merchantId', {
        merchantId: query.merchant_id,
      });
    }
    if (query.status != null) {
      qb.andWhere('run.status = :status', { status: query.status });
    }

    const orderColumn =
      sortBy === PayrollRunSortBy.PERIOD_START
        ? 'run.period_start'
        : sortBy === PayrollRunSortBy.PERIOD_END
          ? 'run.period_end'
          : sortBy === PayrollRunSortBy.STATUS
            ? 'run.status'
            : 'run.created_at';
    qb.orderBy(orderColumn, sortOrder);

    const total = await qb.getCount();
    const items = await qb.skip(skip).take(limit).getMany();

    const totalPages = Math.ceil(total / limit);
    return {
      statusCode: 200,
      message: 'Payroll runs retrieved successfully',
      data: items.map((r) => this.toResponseDto(r)),
      paginationMeta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(
    id: number,
    scopedMerchantId?: number,
  ): Promise<OnePayrollRunResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid payroll run ID');
    }

    const run = await this.runRepo.findOne({
      where: { ...this.ownedBy(scopedMerchantId), id, deleted_at: IsNull() },
    });
    if (!run) {
      throw new NotFoundException(`Payroll run with ID ${id} not found`);
    }

    return {
      statusCode: 200,
      message: 'Payroll run retrieved successfully',
      data: this.toResponseDto(run),
    };
  }

  async update(
    id: number,
    dto: UpdatePayrollRunDto,
    scopedMerchantId?: number,
  ): Promise<OnePayrollRunResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid payroll run ID');
    }

    const run = await this.runRepo.findOne({
      where: { ...this.ownedBy(scopedMerchantId), id, deleted_at: IsNull() },
    });
    if (!run) {
      throw new NotFoundException(`Payroll run with ID ${id} not found`);
    }

    await this.assertReferencesOwned(dto, scopedMerchantId);

    if (dto.company_id != null) {
      const company = await this.companyRepo.findOne({
        where: { id: dto.company_id },
      });
      if (!company) {
        throw new NotFoundException(
          `Company with ID ${dto.company_id} not found`,
        );
      }
      run.company_id = dto.company_id;
    }
    if (dto.merchant_id != null) {
      const merchant = await this.merchantRepo.findOne({
        where: { id: dto.merchant_id },
      });
      if (!merchant) {
        throw new NotFoundException(
          `Merchant with ID ${dto.merchant_id} not found`,
        );
      }
      run.merchant_id = dto.merchant_id;
    }
    if (dto.company_id != null || dto.merchant_id != null) {
      const merchant = await this.merchantRepo.findOne({
        where: { id: run.merchant_id },
      });
      if (merchant?.companyId !== run.company_id) {
        throw new BadRequestException(
          `Merchant ${run.merchant_id} does not belong to company ${run.company_id}`,
        );
      }
    }
    if (dto.period_start != null) run.period_start = new Date(dto.period_start);
    if (dto.period_end != null) run.period_end = new Date(dto.period_end);
    if (dto.status != null) {
      run.status = dto.status;
      if (
        dto.status === PayrollRunStatus.APPROVED ||
        dto.status === PayrollRunStatus.PAID
      ) {
        if (!run.approved_at) run.approved_at = new Date();
      }
    }

    if (run.period_end < run.period_start) {
      throw new BadRequestException(
        'period_end must be on or after period_start',
      );
    }

    const saved = await this.runRepo.save(run);
    return {
      statusCode: 200,
      message: 'Payroll run updated successfully',
      data: this.toResponseDto(saved),
    };
  }

  async remove(
    id: number,
    scopedMerchantId?: number,
  ): Promise<OnePayrollRunResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid payroll run ID');
    }

    const run = await this.runRepo.findOne({
      where: { ...this.ownedBy(scopedMerchantId), id, deleted_at: IsNull() },
    });
    if (!run) {
      throw new NotFoundException(`Payroll run with ID ${id} not found`);
    }

    run.deleted_at = new Date();
    await this.runRepo.save(run);

    return {
      statusCode: 200,
      message: 'Payroll run deleted successfully',
      data: this.toResponseDto(run),
    };
  }
}
