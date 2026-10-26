// src/qr-code/qr-menu-item/qr-menu-item.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QRMenuItem } from './entity/qr-menu-item.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { Variant } from 'src/inventory/products-inventory/variants/entities/variant.entity';
import { QRMenuSection } from '../qr-menu-section/entity/qr-menu-section.entity';
import { OneQRMenuItemResponseDto } from './dto/qr-menu-item-response.dto';
import { CreateQRMenuItemDto } from './dto/create-qr-menu-item.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { Repository, In } from 'typeorm';
import { QueryQRMenuItemDto } from './dto/query-qr-menu-item.dto';
import { PaginatedQRMenuItemResponseDto } from './dto/paginated-qr-menu-item-response.dto';
import { UpdateQRMenuItemDto } from './dto/update-qr-menu-item.dto';

@Injectable()
export class QRMenuItemService {
  constructor(
    @InjectRepository(QRMenuItem)
    private readonly qrMenuItemRepository: Repository<QRMenuItem>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(QRMenuSection)
    private readonly qrMenuSectionRepository: Repository<QRMenuSection>,

    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
  ) {}

  /** `where` fragment that keeps merchant users inside their merchant (none for portal users). */
  private ownedBy(scopedMerchantId?: number) {
    return scopedMerchantId != null
      ? { qrMenuSection: { qrMenu: { merchant: { id: scopedMerchantId } } } }
      : {};
  }

  /** For merchant users, every id the DTO references must belong to their merchant. */
  private async assertReferencesOwned(
    dto: {
      qrMenuSection?: number;
      qr_menu_section_id?: number;
      product?: number;
      product_id?: number;
      variant?: number;
      variant_id?: number;
    },
    scopedMerchantId?: number,
  ): Promise<void> {
    if (scopedMerchantId == null) return;
    const sectionId = dto.qrMenuSection ?? dto.qr_menu_section_id;
    const productId = dto.product ?? dto.product_id;
    const variantId = dto.variant ?? dto.variant_id;

    if (sectionId != null) {
      const owned = await this.qrMenuSectionRepository.exists({
        where: {
          id: sectionId,
          qrMenu: { merchant: { id: scopedMerchantId } },
        },
      });
      if (!owned) ErrorHandler.differentMerchant();
    }
    if (productId != null) {
      const owned = await this.productRepository.exists({
        where: { id: productId, merchantId: scopedMerchantId },
      });
      if (!owned) ErrorHandler.differentMerchant();
    }
    if (variantId != null) {
      const owned = await this.variantRepository.exists({
        where: { id: variantId, product: { merchantId: scopedMerchantId } },
      });
      if (!owned) ErrorHandler.differentMerchant();
    }
  }

  async create(
    dto: CreateQRMenuItemDto,
    scopedMerchantId?: number,
  ): Promise<OneQRMenuItemResponseDto> {
    await this.assertReferencesOwned(dto, scopedMerchantId);

    const sectionId = dto.qrMenuSection ?? dto.qr_menu_section_id;
    const productId = dto.product ?? dto.product_id;
    const variantId = dto.variant ?? dto.variant_id;

    if (sectionId && !Number.isInteger(sectionId)) {
      ErrorHandler.invalidId('QR MENU SECTION ID must be positive integer');
    }
    if (productId && !Number.isInteger(productId)) {
      ErrorHandler.invalidId('PRODUCT ID must be positive integer');
    }
    if (variantId && !Number.isInteger(variantId)) {
      ErrorHandler.invalidId('VARIANT ID must be positive integer');
    }

    let qrMenuSection: QRMenuSection | null = null;
    let product: Product | null = null;
    let variant: Variant | null = null;

    if (sectionId) {
      qrMenuSection = await this.qrMenuSectionRepository.findOne({
        where: { id: sectionId },
      });
      if (!qrMenuSection) {
        ErrorHandler.qrMenuItemNotFound();
      }
    }

    if (productId) {
      product = await this.productRepository.findOne({
        where: { id: productId },
      });
      if (!product) {
        ErrorHandler.productNotFound();
      }
    }

    if (variantId) {
      variant = await this.variantRepository.findOne({
        where: { id: variantId },
      });
      if (!variant) {
        ErrorHandler.variantNotFound();
      }
    }

    const itemName = dto.name?.trim() || product?.name || 'QR Menu Item';
    const itemPrice =
      dto.price !== undefined
        ? Number(dto.price)
        : variant?.price
          ? Number(variant.price)
          : product?.basePrice
            ? Number(product.basePrice)
            : 0.0;
    const itemDesc = dto.description?.trim() || dto.notes?.trim() || '';

    const qrMenuItem = this.qrMenuItemRepository.create({
      qrMenuSection,
      product,
      variant,
      name: itemName,
      price: itemPrice,
      description: itemDesc,
      image_url: dto.image_url?.trim() || '',
      status: dto.status || 'active',
      display_order: dto.display_order || 1,
      notes: dto.notes?.trim() || itemDesc,
      is_visible: dto.is_visible ?? dto.is_available ?? true,
    } as Partial<QRMenuItem>);

    const savedQRMenuItem = await this.qrMenuItemRepository.save(qrMenuItem);
    return {
      statusCode: 201,
      message: 'QR Menu Item created successfully',
      data: savedQRMenuItem,
    };
  }

  async findAll(
    query: QueryQRMenuItemDto,
    scopedMerchantId?: number,
  ): Promise<PaginatedQRMenuItemResponseDto> {
    const {
      merchant_id,
      qr_menu_section_id,
      status,
      page = 1,
      limit = 100,
      sortBy = 'display_order',
      sortOrder = 'ASC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.qrMenuItemRepository
      .createQueryBuilder('qrMenuItem')
      .leftJoin('qrMenuItem.qrMenuSection', 'qrMenuSection')
      .leftJoin('qrMenuSection.qrMenu', 'qrMenu')
      .leftJoin('qrMenu.merchant', 'menuMerchant')
      .leftJoin('qrMenuItem.product', 'product')
      .leftJoin('qrMenuItem.variant', 'variant')
      .select([
        'qrMenuItem',
        'qrMenuSection.id',
        'qrMenuSection.name',
        'qrMenu.id',
        'qrMenu.name',
        'product.id',
        'product.name',
        'product.basePrice',
        'product.sku',
        'variant.id',
        'variant.name',
        'variant.price',
        'variant.sku',
      ]);

    if (scopedMerchantId != null) {
      qb.innerJoin('qrMenuSection.qrMenu', 'scopeMenu')
        .innerJoin('scopeMenu.merchant', 'scopeMerchant')
        .andWhere('scopeMerchant.id = :scopedMerchantId', { scopedMerchantId });
    }

    if (status) {
      qb.andWhere('qrMenuItem.status = :status', { status });
    } else {
      qb.andWhere('qrMenuItem.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    if (qr_menu_section_id) {
      qb.andWhere('qrMenuSection.id = :sectionId', {
        sectionId: qr_menu_section_id,
      });
    }

    if (merchant_id) {
      qb.andWhere(
        '(menuMerchant.id = :merchantId OR product.merchantId = :merchantId)',
        {
          merchantId: merchant_id,
        },
      );
    }

    qb.andWhere('qrMenuItem.status != :deleted', {
      deleted: 'deleted',
    });

    const safeSortBy = [
      'id',
      'display_order',
      'name',
      'price',
      'status',
    ].includes(sortBy)
      ? sortBy
      : 'display_order';
    qb.orderBy(`qrMenuItem.${safeSortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: 'QR Menu Item retrieved successfully',
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
  ): Promise<OneQRMenuItemResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Item ID must be a positive integer');
    }
    const qrMenuItem = await this.qrMenuItemRepository.findOne({
      where: {
        ...this.ownedBy(scopedMerchantId),
        id,
        status: In(['active', 'inactive']),
      },
      relations: ['qrMenuSection', 'product', 'variant'],
    });
    if (!qrMenuItem) {
      ErrorHandler.qrMenuItemNotFound();
    }
    return {
      statusCode: 200,
      message: 'QR Menu Item retrieved successfully',
      data: qrMenuItem,
    };
  }

  async update(
    id: number,
    dto: UpdateQRMenuItemDto,
    scopedMerchantId?: number,
  ): Promise<OneQRMenuItemResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Item ID must be a positive integer');
    }
    const qrMenuItem = await this.qrMenuItemRepository.findOne({
      where: { ...this.ownedBy(scopedMerchantId), id },
      relations: ['qrMenuSection', 'product', 'variant'],
    });
    if (!qrMenuItem) {
      ErrorHandler.qrMenuItemNotFound();
    }

    await this.assertReferencesOwned(dto, scopedMerchantId);

    Object.assign(qrMenuItem, dto);

    const updatedQrMenuItem = await this.qrMenuItemRepository.save(qrMenuItem);
    return {
      statusCode: 200,
      message: 'QR Menu Item updated successfully',
      data: updatedQrMenuItem,
    };
  }

  async remove(
    id: number,
    scopedMerchantId?: number,
  ): Promise<OneQRMenuItemResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Item ID must be a positive integer');
    }

    const qrMenuItem = await this.qrMenuItemRepository.findOne({
      where: { ...this.ownedBy(scopedMerchantId), id },
      relations: ['qrMenuSection', 'product', 'variant'],
    });
    if (!qrMenuItem) {
      ErrorHandler.qrMenuItemNotFound();
    }
    qrMenuItem.status = 'deleted';
    await this.qrMenuItemRepository.save(qrMenuItem);
    return {
      statusCode: 200,
      message: 'QR Menu Item removed successfully',
      data: qrMenuItem,
    };
  }
}
