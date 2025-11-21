import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCashTransactionDto } from './dto/create-cash-transaction.dto';
import { UpdateCashTransactionDto } from './dto/update-cash-transaction.dto';
import { GetCashTransactionsQueryDto, CashTransactionSortBy } from './dto/get-cash-transactions-query.dto';
import { CashTransaction, CashTransactionStatus } from './entities/cash-transaction.entity';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { Collaborator } from '../collaborators/entities/collaborator.entity';
import { OneCashTransactionResponseDto, PaginatedCashTransactionsResponseDto, CashTransactionResponseDto } from './dto/cash-transaction-response.dto';

@Injectable()
export class CashTransactionsService {
  constructor(
    @InjectRepository(CashTransaction)
    private readonly cashTransactionRepo: Repository<CashTransaction>,
    @InjectRepository(CashDrawer)
    private readonly cashDrawerRepo: Repository<CashDrawer>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,
  ) {}

  async create(dto: CreateCashTransactionDto, authenticatedUserMerchantId: number): Promise<OneCashTransactionResponseDto> {
    if (!authenticatedUserMerchantId) throw new ForbiddenException('You must be associated with a merchant');

    // Validate cash drawer exists and belongs to user merchant
    const cashDrawer = await this.cashDrawerRepo.findOne({ where: { id: dto.cashDrawerId } });
    if (!cashDrawer) throw new NotFoundException('Cash drawer not found');
    if (cashDrawer.merchant_id !== authenticatedUserMerchantId) throw new ForbiddenException('Cash drawer does not belong to your merchant');

    // Validate collaborator exists and belongs to user merchant
    const collaborator = await this.collaboratorRepo.findOne({ where: { id: dto.collaboratorId } });
    if (!collaborator) throw new NotFoundException('Collaborator not found');
    if (collaborator.merchant_id !== authenticatedUserMerchantId) throw new ForbiddenException('Collaborator does not belong to your merchant');

    if (dto.amount < 0) throw new BadRequestException('Amount must be non-negative');

    const entity = this.cashTransactionRepo.create({
      cash_drawer_id: dto.cashDrawerId,
      order_id: dto.orderId,
      type: dto.type,
      amount: dto.amount,
      collaborator_id: dto.collaboratorId,
      notes: dto.notes ?? null,
      status: CashTransactionStatus.ACTIVE,
    });

    const saved = await this.cashTransactionRepo.save(entity);

    return {
      statusCode: 201,
      message: 'Cash transaction created successfully',
      data: this.format(saved),
    };
  }

  async findAll(query: GetCashTransactionsQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedCashTransactionsResponseDto> {
    if (!authenticatedUserMerchantId) throw new ForbiddenException('You must be associated with a merchant');

    const page = query.page || 1;
    const limit = query.limit || 10;
    if (page < 1) throw new BadRequestException('Page must be >= 1');
    if (limit < 1 || limit > 100) throw new BadRequestException('Limit must be between 1 and 100');

    const where: any = { status: CashTransactionStatus.ACTIVE };
    if (query.cashDrawerId) where.cash_drawer_id = query.cashDrawerId;
    if (query.orderId) where.order_id = query.orderId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const order: any = {};
    if (query.sortBy) {
      const map: Record<CashTransactionSortBy, string> = {
        [CashTransactionSortBy.CREATED_AT]: 'created_at',
        [CashTransactionSortBy.AMOUNT]: 'amount',
        [CashTransactionSortBy.TYPE]: 'type',
        [CashTransactionSortBy.STATUS]: 'status',
      };
      order[map[query.sortBy]] = query.sortOrder || 'DESC';
    } else {
      order.created_at = 'DESC';
    }

    const [rows, total] = await this.cashTransactionRepo.findAndCount({ where, order, skip: (page - 1) * limit, take: limit });

    return {
      statusCode: 200,
      message: 'Cash transactions retrieved successfully',
      data: rows.map(r => this.format(r)),
      paginationMeta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneCashTransactionResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid id');
    if (!authenticatedUserMerchantId) throw new ForbiddenException('You must be associated with a merchant');

    const row = await this.cashTransactionRepo.findOne({ where: { id, status: CashTransactionStatus.ACTIVE } });
    if (!row) throw new NotFoundException('Cash transaction not found');

    // Ensure ownership via cash drawer
    const cashDrawer = await this.cashDrawerRepo.findOne({ where: { id: row.cash_drawer_id } });
    if (!cashDrawer || cashDrawer.merchant_id !== authenticatedUserMerchantId) throw new ForbiddenException('You can only access transactions from your merchant');

    return { statusCode: 200, message: 'Cash transaction retrieved successfully', data: this.format(row) };
  }

  async update(id: number, dto: UpdateCashTransactionDto, authenticatedUserMerchantId: number): Promise<OneCashTransactionResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid id');
    if (!authenticatedUserMerchantId) throw new ForbiddenException('You must be associated with a merchant');

    const existing = await this.cashTransactionRepo.findOne({ where: { id, status: CashTransactionStatus.ACTIVE } });
    if (!existing) throw new NotFoundException('Cash transaction not found');

    const cashDrawer = await this.cashDrawerRepo.findOne({ where: { id: existing.cash_drawer_id } });
    if (!cashDrawer || cashDrawer.merchant_id !== authenticatedUserMerchantId) throw new ForbiddenException('You can only update transactions from your merchant');

    const updateData: any = {};
    if (dto.orderId !== undefined) updateData.order_id = dto.orderId;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.amount !== undefined) {
      if (dto.amount < 0) throw new BadRequestException('Amount must be non-negative');
      updateData.amount = dto.amount;
    }
    if (dto.notes !== undefined) updateData.notes = dto.notes ?? null;

    await this.cashTransactionRepo.update(id, updateData);
    const updated = await this.cashTransactionRepo.findOne({ where: { id } });
    if (!updated) throw new NotFoundException('Cash transaction not found after update');

    return { statusCode: 200, message: 'Cash transaction updated successfully', data: this.format(updated) };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneCashTransactionResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid id');
    if (!authenticatedUserMerchantId) throw new ForbiddenException('You must be associated with a merchant');

    const existing = await this.cashTransactionRepo.findOne({ where: { id, status: CashTransactionStatus.ACTIVE } });
    if (!existing) throw new NotFoundException('Cash transaction not found');

    const cashDrawer = await this.cashDrawerRepo.findOne({ where: { id: existing.cash_drawer_id } });
    if (!cashDrawer || cashDrawer.merchant_id !== authenticatedUserMerchantId) throw new ForbiddenException('You can only delete transactions from your merchant');

    await this.cashTransactionRepo.update(id, { status: CashTransactionStatus.DELETED });

    return { statusCode: 200, message: 'Cash transaction deleted successfully', data: this.format(existing) };
  }

  private format(row: CashTransaction): CashTransactionResponseDto {
    return {
      id: row.id,
      cashDrawerId: row.cash_drawer_id,
      orderId: row.order_id,
      type: row.type,
      amount: Number(row.amount),
      collaboratorId: row.collaborator_id,
      status: row.status,
      notes: row.notes ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
