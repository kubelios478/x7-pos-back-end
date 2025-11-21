import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { GetReceiptsQueryDto, ReceiptSortBy } from './dto/get-receipts-query.dto';
import { Receipt } from './entities/receipt.entity';
import { ReceiptStatus } from './constants/receipt-status.enum';
import { OneReceiptResponseDto, PaginatedReceiptsResponseDto, ReceiptResponseDto } from './dto/receipt-response.dto';

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
  ) {}

  async create(dto: CreateReceiptDto, authenticatedUserMerchantId: number): Promise<OneReceiptResponseDto> {
    // 1. Validate user permissions (ForbiddenException 403)
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    // 2. Validate required fields and types (BadRequestException 400)
    // Note: Most validations are handled by class-validator in the DTO
    // Additional validations:
    if (!dto.orderId || dto.orderId <= 0) {
      throw new BadRequestException('Invalid order ID');
    }

    // Trim and validate type
    const trimmedType = dto.type?.trim() || '';
    if (trimmedType.length === 0) {
      throw new BadRequestException('Type is required and cannot be empty');
    }

    if (trimmedType.length > 50) {
      throw new BadRequestException('Type must not exceed 50 characters');
    }

    // 3. Validate existence of related entities (NotFoundException 404)
    // TODO: Validate that Order exists when Order entity is available
    // Example:
    // const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    // if (!order) {
    //   throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
    // }
    // if (order.merchant_id !== authenticatedUserMerchantId) {
    //   throw new ForbiddenException('Order does not belong to your merchant');
    // }

    // 4. Validate uniqueness of unique fields (ConflictException 409)
    // Business rule: An order cannot have duplicate receipts of the same type
    const existingReceipt = await this.receiptRepo.findOne({
      where: {
        order_id: dto.orderId,
        type: trimmedType,
        status: ReceiptStatus.ACTIVE,
      },
    });

    if (existingReceipt) {
      throw new ConflictException(
        `A receipt of type '${trimmedType}' already exists for order ${dto.orderId}`
      );
    }

    // 5. Validate business rules (BadRequestException 400 or ConflictException 409)
    // Validate fiscal_data is valid JSON if provided
    if (dto.fiscalData) {
      try {
        const parsed = JSON.parse(dto.fiscalData);
        // Ensure it's an object, not a primitive
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new BadRequestException('fiscalData must be a valid JSON object');
        }
      } catch (e) {
        if (e instanceof BadRequestException) {
          throw e;
        }
        throw new BadRequestException('fiscalData must be valid JSON');
      }
    }

    // 6. Create the receipt
    const entity = this.receiptRepo.create({
      order_id: dto.orderId,
      type: trimmedType,
      fiscal_data: dto.fiscalData ?? null,
      status: ReceiptStatus.ACTIVE,
    });

    const saved = await this.receiptRepo.save(entity);

    return {
      statusCode: 201,
      message: 'Receipt created successfully',
      data: this.format(saved),
    };
  }

  async findAll(query: GetReceiptsQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedReceiptsResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    if (page < 1) {
      throw new BadRequestException('Page must be >= 1');
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const where: any = { status: ReceiptStatus.ACTIVE };
    if (query.orderId) {
      where.order_id = query.orderId;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.status) {
      where.status = query.status;
    }

    const order: any = {};
    if (query.sortBy) {
      const map: Record<ReceiptSortBy, string> = {
        [ReceiptSortBy.CREATED_AT]: 'created_at',
        [ReceiptSortBy.TYPE]: 'type',
        [ReceiptSortBy.STATUS]: 'status',
      };
      order[map[query.sortBy]] = query.sortOrder || 'DESC';
    } else {
      order.created_at = 'DESC';
    }

    const [rows, total] = await this.receiptRepo.findAndCount({
      where,
      order,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      statusCode: 200,
      message: 'Receipts retrieved successfully',
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

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneReceiptResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid id');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const row = await this.receiptRepo.findOne({
      where: { id, status: ReceiptStatus.ACTIVE },
    });

    if (!row) {
      throw new NotFoundException('Receipt not found');
    }

    return {
      statusCode: 200,
      message: 'Receipt retrieved successfully',
      data: this.format(row),
    };
  }

  async update(id: number, dto: UpdateReceiptDto, authenticatedUserMerchantId: number): Promise<OneReceiptResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid id');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const existing = await this.receiptRepo.findOne({
      where: { id, status: ReceiptStatus.ACTIVE },
    });

    if (!existing) {
      throw new NotFoundException('Receipt not found');
    }

    const updateData: any = {};
    if (dto.orderId !== undefined) {
      if (dto.orderId <= 0) {
        throw new BadRequestException('Invalid order ID');
      }
      updateData.order_id = dto.orderId;
    }
    if (dto.type !== undefined) {
      updateData.type = dto.type;
    }
    if (dto.fiscalData !== undefined) {
      // Validate fiscal_data is valid JSON if provided
      if (dto.fiscalData) {
        try {
          JSON.parse(dto.fiscalData);
        } catch (e) {
          throw new BadRequestException('fiscalData must be valid JSON');
        }
      }
      updateData.fiscal_data = dto.fiscalData ?? null;
    }

    await this.receiptRepo.update(id, updateData);
    const updated = await this.receiptRepo.findOne({ where: { id } });

    if (!updated) {
      throw new NotFoundException('Receipt not found after update');
    }

    return {
      statusCode: 200,
      message: 'Receipt updated successfully',
      data: this.format(updated),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneReceiptResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid id');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const existing = await this.receiptRepo.findOne({
      where: { id, status: ReceiptStatus.ACTIVE },
    });

    if (!existing) {
      throw new NotFoundException('Receipt not found');
    }

    await this.receiptRepo.update(id, { status: ReceiptStatus.DELETED });

    return {
      statusCode: 200,
      message: 'Receipt deleted successfully',
      data: this.format(existing),
    };
  }

  private format(row: Receipt): ReceiptResponseDto {
    return {
      id: row.id,
      orderId: row.order_id,
      type: row.type,
      fiscalData: row.fiscal_data ?? null,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
