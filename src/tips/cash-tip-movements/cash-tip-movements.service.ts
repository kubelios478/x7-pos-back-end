import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashTipMovement } from './entities/cash-tip-movement.entity';
import { CashDrawer } from '../../cash-drawers/entities/cash-drawer.entity';
import { Tip } from '../tips/entities/tip.entity';
import { CreateCashTipMovementDto } from './dto/create-cash-tip-movement.dto';
import { UpdateCashTipMovementDto } from './dto/update-cash-tip-movement.dto';
import {
  GetCashTipMovementQueryDto,
  CashTipMovementSortBy,
} from './dto/get-cash-tip-movement-query.dto';
import {
  CashTipMovementResponseDto,
  OneCashTipMovementResponseDto,
  PaginatedCashTipMovementResponseDto,
} from './dto/cash-tip-movement-response.dto';

@Injectable()
export class CashTipMovementsService {
  constructor(
    @InjectRepository(CashTipMovement)
    private readonly cashTipMovementRepository: Repository<CashTipMovement>,
    @InjectRepository(CashDrawer)
    private readonly cashDrawerRepository: Repository<CashDrawer>,
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
  ) {}

  async create(
    createCashTipMovementDto: CreateCashTipMovementDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneCashTipMovementResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create cash tip movements',
      );
    }

    const cashDrawer = await this.cashDrawerRepository.findOne({
      where: {
        id: createCashTipMovementDto.cashDrawerId,
        merchant_id: authenticatedUserMerchantId,
      },
    });
    if (!cashDrawer) {
      throw new NotFoundException(
        'Cash drawer not found or you do not have access to it',
      );
    }

    const tip = await this.tipRepository.findOne({
      where: {
        id: createCashTipMovementDto.tipId,
        merchant_id: authenticatedUserMerchantId,
      },
    });
    if (!tip) {
      throw new NotFoundException(
        'Tip not found or you do not have access to it',
      );
    }

    if (createCashTipMovementDto.amount < 0) {
      throw new BadRequestException(
        'Amount must be greater than or equal to 0',
      );
    }

    const movement = new CashTipMovement();
    movement.cash_drawer_id = createCashTipMovementDto.cashDrawerId;
    movement.tip_id = createCashTipMovementDto.tipId;
    movement.movement_type = createCashTipMovementDto.movementType;
    movement.amount = createCashTipMovementDto.amount;

    const saved = await this.cashTipMovementRepository.save(movement);
    const complete = await this.cashTipMovementRepository.findOne({
      where: { id: saved.id },
      relations: ['cashDrawer', 'tip'],
    });
    if (!complete) {
      throw new NotFoundException('Cash tip movement not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Cash tip movement created successfully',
      data: this.formatResponse(complete),
    };
  }

  async findAll(
    query: GetCashTipMovementQueryDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<PaginatedCashTipMovementResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access cash tip movements',
      );
    }

    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }
    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }
    if (query.createdDate && !/^\d{4}-\d{2}-\d{2}$/.test(query.createdDate)) {
      throw new BadRequestException(
        'Created date must be in YYYY-MM-DD format',
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.cashTipMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.cashDrawer', 'cashDrawer')
      .leftJoinAndSelect('movement.tip', 'tip')
      .where('cashDrawer.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      });

    if (query.cashDrawerId != null) {
      qb.andWhere('movement.cash_drawer_id = :cashDrawerId', {
        cashDrawerId: query.cashDrawerId,
      });
    }
    if (query.tipId != null) {
      qb.andWhere('movement.tip_id = :tipId', { tipId: query.tipId });
    }
    if (query.movementType != null) {
      qb.andWhere('movement.movement_type = :movementType', {
        movementType: query.movementType,
      });
    }
    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      qb.andWhere('movement.created_at >= :createdStart', {
        createdStart: startDate,
      });
      qb.andWhere('movement.created_at < :createdEnd', {
        createdEnd: endDate,
      });
    }

    const sortField =
      query.sortBy === CashTipMovementSortBy.AMOUNT
        ? 'movement.amount'
        : query.sortBy === CashTipMovementSortBy.MOVEMENT_TYPE
          ? 'movement.movement_type'
          : query.sortBy === CashTipMovementSortBy.CREATED_AT
            ? 'movement.created_at'
            : 'movement.id';
    qb.orderBy(sortField, query.sortOrder || 'DESC');
    qb.skip(skip).take(limit);

    const [movements, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Cash tip movements retrieved successfully',
      data: movements.map((m) => this.formatResponse(m)),
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
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneCashTipMovementResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Cash tip movement ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access cash tip movements',
      );
    }

    const movement = await this.cashTipMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.cashDrawer', 'cashDrawer')
      .leftJoinAndSelect('movement.tip', 'tip')
      .where('movement.id = :id', { id })
      .andWhere('cashDrawer.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .getOne();

    if (!movement) {
      throw new NotFoundException('Cash tip movement not found');
    }

    return {
      statusCode: 200,
      message: 'Cash tip movement retrieved successfully',
      data: this.formatResponse(movement),
    };
  }

  async update(
    id: number,
    updateCashTipMovementDto: UpdateCashTipMovementDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneCashTipMovementResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Cash tip movement ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update cash tip movements',
      );
    }

    const existing = await this.cashTipMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.cashDrawer', 'cashDrawer')
      .leftJoinAndSelect('movement.tip', 'tip')
      .where('movement.id = :id', { id })
      .andWhere('cashDrawer.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .getOne();

    if (!existing) {
      throw new NotFoundException('Cash tip movement not found');
    }

    if (
      updateCashTipMovementDto.amount !== undefined &&
      updateCashTipMovementDto.amount < 0
    ) {
      throw new BadRequestException(
        'Amount must be greater than or equal to 0',
      );
    }

    if (updateCashTipMovementDto.cashDrawerId !== undefined) {
      const cashDrawer = await this.cashDrawerRepository.findOne({
        where: {
          id: updateCashTipMovementDto.cashDrawerId,
          merchant_id: authenticatedUserMerchantId,
        },
      });
      if (!cashDrawer) {
        throw new NotFoundException(
          'Cash drawer not found or you do not have access to it',
        );
      }
    }
    if (updateCashTipMovementDto.tipId !== undefined) {
      const tip = await this.tipRepository.findOne({
        where: {
          id: updateCashTipMovementDto.tipId,
          merchant_id: authenticatedUserMerchantId,
        },
      });
      if (!tip) {
        throw new NotFoundException(
          'Tip not found or you do not have access to it',
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (updateCashTipMovementDto.cashDrawerId !== undefined)
      updateData.cash_drawer_id = updateCashTipMovementDto.cashDrawerId;
    if (updateCashTipMovementDto.tipId !== undefined)
      updateData.tip_id = updateCashTipMovementDto.tipId;
    if (updateCashTipMovementDto.movementType !== undefined)
      updateData.movement_type = updateCashTipMovementDto.movementType;
    if (updateCashTipMovementDto.amount !== undefined)
      updateData.amount = updateCashTipMovementDto.amount;

    await this.cashTipMovementRepository.update(id, updateData);

    const updated = await this.cashTipMovementRepository.findOne({
      where: { id },
      relations: ['cashDrawer', 'tip'],
    });
    if (!updated) {
      throw new NotFoundException('Cash tip movement not found after update');
    }

    return {
      statusCode: 200,
      message: 'Cash tip movement updated successfully',
      data: this.formatResponse(updated),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneCashTipMovementResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Cash tip movement ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete cash tip movements',
      );
    }

    const existing = await this.cashTipMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.cashDrawer', 'cashDrawer')
      .leftJoinAndSelect('movement.tip', 'tip')
      .where('movement.id = :id', { id })
      .andWhere('cashDrawer.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .getOne();

    if (!existing) {
      throw new NotFoundException('Cash tip movement not found');
    }

    await this.cashTipMovementRepository.remove(existing);

    return {
      statusCode: 200,
      message: 'Cash tip movement deleted successfully',
      data: this.formatResponse(existing),
    };
  }

  private formatResponse(
    movement: CashTipMovement,
  ): CashTipMovementResponseDto {
    return {
      id: movement.id,
      cashDrawerId: movement.cash_drawer_id,
      cashDrawer: {
        id: movement.cashDrawer.id,
        currentBalance: Number(movement.cashDrawer.current_balance),
      },
      tipId: movement.tip_id,
      tip: {
        id: movement.tip.id,
        amount: Number(movement.tip.amount),
      },
      movementType: movement.movement_type,
      amount: Number(movement.amount),
      createdAt: movement.created_at,
    };
  }
}
