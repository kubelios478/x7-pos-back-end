//src/qr-code/qr-menu/qr-menu.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QRMenu } from './entity/qr-menu.entity';
import { Repository, In } from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { CreateQRMenuDto } from './dto/create-qr-menu.dto';
import { OneQRMenuResponseDto } from './dto/qr-menu-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { QueryQRMenuDto } from './dto/query-qr-menu.dto';
import { PaginatedQRMenuResponseDto } from './dto/paginated-qr-menu-response.dto';
import { UpdateQRMenuDto } from './dto/update-qr-menu.dto';

@Injectable()
export class QrMenuService {
  constructor(
    @InjectRepository(QRMenu)
    private readonly qrMenuRepository: Repository<QRMenu>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  /** `where` fragment that keeps merchant users inside their merchant (none for portal users). */
  private ownedBy(scopedMerchantId?: number) {
    return scopedMerchantId != null
      ? { merchant: { id: scopedMerchantId } }
      : {};
  }

  /** For merchant users, every id the DTO references must belong to their merchant. */
  private async assertReferencesOwned(
    dto: { merchant?: number },
    scopedMerchantId?: number,
  ): Promise<void> {
    if (scopedMerchantId == null) return;
    if (dto.merchant != null && dto.merchant !== scopedMerchantId) {
      ErrorHandler.differentMerchant();
    }
    dto.merchant = scopedMerchantId;
  }

  async create(
    dto: CreateQRMenuDto,
    scopedMerchantId?: number,
  ): Promise<OneQRMenuResponseDto> {
    await this.assertReferencesOwned(dto, scopedMerchantId);
    if (dto.merchant && !Number.isInteger(dto.merchant)) {
      ErrorHandler.invalidId('Merchant ID must be positive integer');
    }
    let merchant: Merchant | null = null;

    if (dto.merchant) {
      if (dto.merchant) {
        merchant = await this.merchantRepository.findOne({
          where: { id: dto.merchant },
        });
        if (!merchant) {
          ErrorHandler.differentMerchant();
        }
      }
    }
    const qrMenu = this.qrMenuRepository.create({
      merchant: merchant,
      name: dto.name,
      description: dto.description,
      status: dto.status,
      design_theme: dto.design_theme,
      qr_type: dto.qr_type,
    } as Partial<QRMenu>);

    const savedQRMenu = await this.qrMenuRepository.save(qrMenu);
    return {
      statusCode: 201,
      message: 'QR Menu created successfully',
      data: savedQRMenu,
    };
  }
  async findAll(
    query: QueryQRMenuDto,
    scopedMerchantId?: number,
  ): Promise<PaginatedQRMenuResponseDto> {
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

    const qb = this.qrMenuRepository
      .createQueryBuilder('qrMenu')
      .leftJoin('qrMenu.merchant', 'merchant')
      .select(['qrMenu', 'merchant.id', 'merchant.name']);

    if (scopedMerchantId != null) {
      qb.andWhere('merchant.id = :scopedMerchantId', { scopedMerchantId });
    }

    if (status) {
      qb.andWhere('qrMenu.status = :status', { status });
    } else {
      qb.andWhere('qrMenu.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('qrMenu.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`qrMenu.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: 'QR Menu retrieved successfully',
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
    scopedMerchantId?: number,
  ): Promise<OneQRMenuResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu ID must be a positive integer');
    }
    const qrMenu = await this.qrMenuRepository.findOne({
      where: {
        ...this.ownedBy(scopedMerchantId),
        id,
        status: In(['active', 'inactive']),
      },
      relations: ['merchant'],
    });
    if (!qrMenu) {
      ErrorHandler.qrMenuNotFound();
    }
    return {
      statusCode: 200,
      message: 'QR Menu retrieved successfully',
      data: qrMenu,
    };
  }
  async update(
    id: number,
    dto: UpdateQRMenuDto,
    scopedMerchantId?: number,
  ): Promise<OneQRMenuResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu ID must be a positive integer');
    }
    const qrMenu = await this.qrMenuRepository.findOne({
      where: { ...this.ownedBy(scopedMerchantId), id },
      relations: ['merchant'],
    });
    if (!qrMenu) {
      ErrorHandler.qrMenuNotFound();
    }

    await this.assertReferencesOwned(dto, scopedMerchantId);

    Object.assign(qrMenu, dto);

    const updatedQrMenu = await this.qrMenuRepository.save(qrMenu);
    return {
      statusCode: 200,
      message: 'QR Menu updated successfully',
      data: updatedQrMenu,
    };
  }

  async remove(
    id: number,
    scopedMerchantId?: number,
  ): Promise<OneQRMenuResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu ID must be a positive integer');
    }

    const qrMenu = await this.qrMenuRepository.findOne({
      where: { ...this.ownedBy(scopedMerchantId), id },
      relations: ['merchant'],
    });
    if (!qrMenu) {
      ErrorHandler.qrMenuNotFound();
    }
    qrMenu.status = 'deleted';
    await this.qrMenuRepository.save(qrMenu);
    return {
      statusCode: 200,
      message: 'QR Menu removed successfully',
      data: qrMenu,
    };
  }
}
