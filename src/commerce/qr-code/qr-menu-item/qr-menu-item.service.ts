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

  async create(dto: CreateQRMenuItemDto): Promise<OneQRMenuItemResponseDto> {
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
    const itemPrice = dto.price !== undefined
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
      is_visible: dto.is_visible ?? (dto.is_available ?? true),
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

    if (status) {
      qb.andWhere('qrMenuItem.status = :status', { status });
    } else {
      qb.andWhere('qrMenuItem.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    if (qr_menu_section_id) {
      qb.andWhere('qrMenuSection.id = :sectionId', { sectionId: qr_menu_section_id });
    }

    if (merchant_id) {
      qb.andWhere('(menuMerchant.id = :merchantId OR product.merchantId = :merchantId)', {
        merchantId: merchant_id,
      });
    }

    qb.andWhere('qrMenuItem.status != :deleted', {
      deleted: 'deleted',
    });

    const safeSortBy = ['id', 'display_order', 'name', 'price', 'status'].includes(sortBy)
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

  async findOne(id: number): Promise<OneQRMenuItemResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Item ID must be a positive integer');
    }
    const qrMenuItem = await this.qrMenuItemRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
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
  ): Promise<OneQRMenuItemResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Item ID must be a positive integer');
    }
    const qrMenuItem = await this.qrMenuItemRepository.findOne({
      where: { id },
      relations: ['qrMenuSection', 'product', 'variant'],
    });
    if (!qrMenuItem) {
      ErrorHandler.qrMenuItemNotFound();
    }

    const sectionId = dto.qrMenuSection ?? dto.qr_menu_section_id;
    const productId = dto.product ?? dto.product_id;
    const variantId = dto.variant ?? dto.variant_id;

    if (sectionId !== undefined) {
      if (sectionId === null) {
        qrMenuItem.qrMenuSection = null as any;
      } else {
        const sec = await this.qrMenuSectionRepository.findOne({ where: { id: sectionId } });
        if (sec) qrMenuItem.qrMenuSection = sec;
      }
    }

    if (productId !== undefined) {
      if (productId === null) {
        qrMenuItem.product = null as any;
      } else {
        const prod = await this.productRepository.findOne({ where: { id: productId } });
        if (prod) qrMenuItem.product = prod;
      }
    }

    if (variantId !== undefined) {
      if (variantId === null) {
        qrMenuItem.variant = null as any;
      } else {
        const v = await this.variantRepository.findOne({ where: { id: variantId } });
        if (v) qrMenuItem.variant = v;
      }
    }

    if (dto.name !== undefined) qrMenuItem.name = dto.name.trim();
    if (dto.price !== undefined) qrMenuItem.price = Number(dto.price);
    if (dto.description !== undefined) qrMenuItem.description = dto.description.trim();
    if (dto.image_url !== undefined) qrMenuItem.image_url = dto.image_url.trim();
    if (dto.status !== undefined) qrMenuItem.status = dto.status;
    if (dto.display_order !== undefined) qrMenuItem.display_order = dto.display_order;
    if (dto.notes !== undefined) qrMenuItem.notes = dto.notes;
    if (dto.is_visible !== undefined) qrMenuItem.is_visible = dto.is_visible;
    if (dto.is_available !== undefined) qrMenuItem.is_visible = dto.is_available;

    const updatedQrMenuItem = await this.qrMenuItemRepository.save(qrMenuItem);
    return {
      statusCode: 200,
      message: 'QR Menu Item updated successfully',
      data: updatedQrMenuItem,
    };
  }

  async remove(id: number): Promise<OneQRMenuItemResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Item ID must be a positive integer');
    }

    const qrMenuItem = await this.qrMenuItemRepository.findOne({
      where: { id },
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
