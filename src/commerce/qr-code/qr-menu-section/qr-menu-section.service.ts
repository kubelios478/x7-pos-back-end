//src/qr-code/qr-menu-section/qr-menu-section.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QRMenu } from 'src/commerce/qr-code/qr-menu/entity/qr-menu.entity';
import { Repository, In } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { QRMenuSection } from './entity/qr-menu-section.entity';
import { CreateQRMenuSectionDto } from './dto/create-qr-menu-section.dto';
import { OneQRMenuSectionResponseDto } from './dto/qr-menu-section-response.dto';
import { QueryQRMenuSectionDto } from './dto/query-qr-menu-section.dto';
import { PaginatedQRMenuSectionResponseDto } from './dto/paginated-qr-menu-section-response.dto';
import { UpdateQRMenuSectionDto } from './dto/update-qr-menu-section.dto';

@Injectable()
export class QRMenuSectionService {
  constructor(
    @InjectRepository(QRMenuSection)
    private readonly qrMenuSectionRepository: Repository<QRMenuSection>,

    @InjectRepository(QRMenu)
    private readonly qrMenuRepository: Repository<QRMenu>,
  ) {}

  /** `where` fragment that keeps merchant users inside their merchant (none for portal users). */
  private ownedBy(scopedMerchantId?: number) {
    return scopedMerchantId != null
      ? { qrMenu: { merchant: { id: scopedMerchantId } } }
      : {};
  }

  /** For merchant users, every id the DTO references must belong to their merchant. */
  private async assertReferencesOwned(
    dto: { qrMenu?: number; qr_menu_id?: number },
    scopedMerchantId?: number,
  ): Promise<void> {
    if (scopedMerchantId == null) return;
    const menuId = dto.qrMenu ?? dto.qr_menu_id;
    if (menuId != null) {
      const owned = await this.qrMenuRepository.exists({
        where: { id: menuId, merchant: { id: scopedMerchantId } },
      });
      if (!owned) ErrorHandler.differentMerchant();
    }
  }

  async create(
    dto: CreateQRMenuSectionDto,
    scopedMerchantId?: number,
  ): Promise<OneQRMenuSectionResponseDto> {
    await this.assertReferencesOwned(dto, scopedMerchantId);
    const menuId = dto.qrMenu ?? dto.qr_menu_id;
    if (menuId && !Number.isInteger(menuId)) {
      ErrorHandler.invalidId('QR MENU ID must be positive integer');
    }
    let qRMenu: QRMenu | null = null;

    if (menuId) {
      qRMenu = await this.qrMenuRepository.findOne({
        where: { id: menuId },
      });
      if (!qRMenu) {
        ErrorHandler.qrMenuNotFound();
      }
    }
    const qrMenuSection = this.qrMenuSectionRepository.create({
      qrMenu: qRMenu,
      name: dto.name.trim(),
      description: dto.description?.trim() || '',
      display_order: dto.display_order || 1,
      status: dto.status || 'active',
    } as Partial<QRMenuSection>);

    const savedQRMenuSection =
      await this.qrMenuSectionRepository.save(qrMenuSection);
    return {
      statusCode: 201,
      message: 'QR Menu Section created successfully',
      data: savedQRMenuSection,
    };
  }

  async findAll(
    query: QueryQRMenuSectionDto,
    scopedMerchantId?: number,
  ): Promise<PaginatedQRMenuSectionResponseDto> {
    const {
      status,
      qr_menu_id,
      merchant_id,
      page = 1,
      limit = 100,
      sortBy = 'display_order',
      sortOrder = 'ASC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.qrMenuSectionRepository
      .createQueryBuilder('qrMenuSection')
      .leftJoin('qrMenuSection.qrMenu', 'qrMenu')
      .leftJoin('qrMenu.merchant', 'merchant')
      .select([
        'qrMenuSection',
        'qrMenu.id',
        'qrMenu.name',
        'merchant.id',
        'merchant.name',
      ]);

    if (scopedMerchantId != null) {
      qb.innerJoin('qrMenu.merchant', 'scopeMerchant').andWhere(
        'scopeMerchant.id = :scopedMerchantId',
        { scopedMerchantId },
      );
    }

    if (status) {
      qb.andWhere('qrMenuSection.status = :status', { status });
    } else {
      qb.andWhere('qrMenuSection.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    if (qr_menu_id) {
      qb.andWhere('qrMenu.id = :qrMenuId', { qrMenuId: qr_menu_id });
    }

    if (merchant_id) {
      qb.andWhere('merchant.id = :merchantId', { merchantId: merchant_id });
    }

    qb.andWhere('qrMenuSection.status != :deleted', {
      deleted: 'deleted',
    });

    const safeSortBy = ['id', 'display_order', 'name', 'status'].includes(
      sortBy,
    )
      ? sortBy
      : 'display_order';
    qb.orderBy(`qrMenuSection.${safeSortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: 'QR Menu Section retrieved successfully',
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
  ): Promise<OneQRMenuSectionResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Section ID must be a positive integer');
    }
    const qrMenuSection = await this.qrMenuSectionRepository.findOne({
      where: {
        ...this.ownedBy(scopedMerchantId),
        id,
        status: In(['active', 'inactive']),
      },
      relations: ['qrMenu'],
    });
    if (!qrMenuSection) {
      ErrorHandler.qrMenuSectionNotFound();
    }
    return {
      statusCode: 200,
      message: 'QR Menu Section retrieved successfully',
      data: qrMenuSection,
    };
  }

  async update(
    id: number,
    dto: UpdateQRMenuSectionDto,
    scopedMerchantId?: number,
  ): Promise<OneQRMenuSectionResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Section ID must be a positive integer');
    }
    const qrMenuSection = await this.qrMenuSectionRepository.findOne({
      where: { ...this.ownedBy(scopedMerchantId), id },
      relations: ['qrMenu'],
    });
    if (!qrMenuSection) {
      ErrorHandler.qrMenuSectionNotFound();
    }

    await this.assertReferencesOwned(dto, scopedMerchantId);

    Object.assign(qrMenuSection, dto);

    const updatedQrMenuSection =
      await this.qrMenuSectionRepository.save(qrMenuSection);
    return {
      statusCode: 200,
      message: 'QR Menu Section updated successfully',
      data: updatedQrMenuSection,
    };
  }

  async remove(
    id: number,
    scopedMerchantId?: number,
  ): Promise<OneQRMenuSectionResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Section ID must be a positive integer');
    }

    const qrMenuSection = await this.qrMenuSectionRepository.findOne({
      where: { ...this.ownedBy(scopedMerchantId), id },
      relations: ['qrMenu'],
    });
    if (!qrMenuSection) {
      ErrorHandler.qrMenuSectionNotFound();
    }
    qrMenuSection.status = 'deleted';
    await this.qrMenuSectionRepository.save(qrMenuSection);
    return {
      statusCode: 200,
      message: 'QR Menu Section removed successfully',
      data: qrMenuSection,
    };
  }
}
