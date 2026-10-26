import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PayrollTaxDetail } from './entities/payroll-tax-detail.entity';
import { PayrollEntry } from '../payroll-entries/entities/payroll-entry.entity';
import { CreatePayrollTaxDetailDto } from './dto/create-payroll-tax-detail.dto';
import { UpdatePayrollTaxDetailDto } from './dto/update-payroll-tax-detail.dto';
import {
  GetPayrollTaxDetailsQueryDto,
  PayrollTaxDetailSortBy,
} from './dto/get-payroll-tax-details-query.dto';
import {
  PayrollTaxDetailResponseDto,
  OnePayrollTaxDetailResponseDto,
} from './dto/payroll-tax-detail-response.dto';
import { PaginatedPayrollTaxDetailsResponseDto } from './dto/paginated-payroll-tax-details-response.dto';

@Injectable()
export class PayrollTaxDetailsService {
  constructor(
    @InjectRepository(PayrollTaxDetail)
    private readonly taxDetailRepo: Repository<PayrollTaxDetail>,
    @InjectRepository(PayrollEntry)
    private readonly payrollEntryRepo: Repository<PayrollEntry>,
  ) {}

  private toResponseDto(t: PayrollTaxDetail): PayrollTaxDetailResponseDto {
    return {
      id: t.id,
      payroll_entry_id: t.payroll_entry_id,
      tax_type: t.tax_type,
      percentage: Number(t.percentage),
      amount: Number(t.amount),
      created_at: t.created_at?.toISOString() ?? '',
    };
  }

  /** `where` fragment that keeps merchant users inside their merchant (none for portal users). */
  private ownedBy(scopedMerchantId?: number) {
    return scopedMerchantId != null
      ? { payrollEntry: { payrollRun: { merchant_id: scopedMerchantId } } }
      : {};
  }

  /** For merchant users, every id the DTO references must belong to their merchant. */
  private async assertReferencesOwned(
    dto: { payroll_entry_id?: number },
    scopedMerchantId?: number,
  ): Promise<void> {
    if (scopedMerchantId == null) return;
    if (dto.payroll_entry_id != null) {
      const owned = await this.payrollEntryRepo.exists({
        where: {
          id: dto.payroll_entry_id,
          payrollRun: { merchant_id: scopedMerchantId },
        },
      });
      if (!owned) {
        throw new ForbiddenException(
          'You can only access payroll data of your merchant',
        );
      }
    }
  }

  async create(
    dto: CreatePayrollTaxDetailDto,
    scopedMerchantId?: number,
  ): Promise<OnePayrollTaxDetailResponseDto> {
    await this.assertReferencesOwned(dto, scopedMerchantId);

    const payrollEntry = await this.payrollEntryRepo.findOne({
      where: { id: dto.payroll_entry_id },
    });
    if (!payrollEntry) {
      throw new NotFoundException(
        `Payroll entry with ID ${dto.payroll_entry_id} not found`,
      );
    }

    const taxDetail = this.taxDetailRepo.create({
      payroll_entry_id: dto.payroll_entry_id,
      tax_type: dto.tax_type,
      percentage: dto.percentage,
      amount: dto.amount,
    });

    const saved = await this.taxDetailRepo.save(taxDetail);
    return {
      statusCode: 201,
      message: 'Payroll tax detail created successfully',
      data: this.toResponseDto(saved),
    };
  }

  async findAll(
    query: GetPayrollTaxDetailsQueryDto,
    scopedMerchantId?: number,
  ): Promise<PaginatedPayrollTaxDetailsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? PayrollTaxDetailSortBy.CREATED_AT;
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.taxDetailRepo
      .createQueryBuilder('detail')
      .where('detail.deleted_at IS NULL');

    if (scopedMerchantId != null) {
      qb.innerJoin('detail.payrollEntry', 'scopeEntry')
        .innerJoin('scopeEntry.payrollRun', 'scopeRun')
        .andWhere('scopeRun.merchant_id = :scopedMerchantId', {
          scopedMerchantId,
        });
    }

    if (query.payroll_entry_id != null) {
      qb.andWhere('detail.payroll_entry_id = :payrollEntryId', {
        payrollEntryId: query.payroll_entry_id,
      });
    }

    const orderColumn =
      sortBy === PayrollTaxDetailSortBy.AMOUNT
        ? 'detail.amount'
        : sortBy === PayrollTaxDetailSortBy.PERCENTAGE
          ? 'detail.percentage'
          : sortBy === PayrollTaxDetailSortBy.TAX_TYPE
            ? 'detail.tax_type'
            : 'detail.created_at';
    qb.orderBy(orderColumn, sortOrder);

    const total = await qb.getCount();
    const items = await qb.skip(skip).take(limit).getMany();

    const totalPages = Math.ceil(total / limit);
    return {
      statusCode: 200,
      message: 'Payroll tax details retrieved successfully',
      data: items.map((t) => this.toResponseDto(t)),
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
  ): Promise<OnePayrollTaxDetailResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid payroll tax detail ID');
    }

    const taxDetail = await this.taxDetailRepo.findOne({
      where: { ...this.ownedBy(scopedMerchantId), id, deleted_at: IsNull() },
    });
    if (!taxDetail) {
      throw new NotFoundException(`Payroll tax detail with ID ${id} not found`);
    }

    return {
      statusCode: 200,
      message: 'Payroll tax detail retrieved successfully',
      data: this.toResponseDto(taxDetail),
    };
  }

  async update(
    id: number,
    dto: UpdatePayrollTaxDetailDto,
    scopedMerchantId?: number,
  ): Promise<OnePayrollTaxDetailResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid payroll tax detail ID');
    }

    const taxDetail = await this.taxDetailRepo.findOne({
      where: { ...this.ownedBy(scopedMerchantId), id, deleted_at: IsNull() },
    });
    if (!taxDetail) {
      throw new NotFoundException(`Payroll tax detail with ID ${id} not found`);
    }

    await this.assertReferencesOwned(dto, scopedMerchantId);

    if (dto.payroll_entry_id != null) {
      const payrollEntry = await this.payrollEntryRepo.findOne({
        where: { id: dto.payroll_entry_id },
      });
      if (!payrollEntry) {
        throw new NotFoundException(
          `Payroll entry with ID ${dto.payroll_entry_id} not found`,
        );
      }
      taxDetail.payroll_entry_id = dto.payroll_entry_id;
    }
    if (dto.tax_type != null) taxDetail.tax_type = dto.tax_type;
    if (dto.percentage != null) taxDetail.percentage = dto.percentage as any;
    if (dto.amount != null) taxDetail.amount = dto.amount as any;

    const saved = await this.taxDetailRepo.save(taxDetail);
    return {
      statusCode: 200,
      message: 'Payroll tax detail updated successfully',
      data: this.toResponseDto(saved),
    };
  }

  async remove(
    id: number,
    scopedMerchantId?: number,
  ): Promise<OnePayrollTaxDetailResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid payroll tax detail ID');
    }

    const taxDetail = await this.taxDetailRepo.findOne({
      where: { ...this.ownedBy(scopedMerchantId), id, deleted_at: IsNull() },
    });
    if (!taxDetail) {
      throw new NotFoundException(`Payroll tax detail with ID ${id} not found`);
    }

    taxDetail.deleted_at = new Date();
    await this.taxDetailRepo.save(taxDetail);

    return {
      statusCode: 200,
      message: 'Payroll tax detail deleted successfully',
      data: this.toResponseDto(taxDetail),
    };
  }
}
