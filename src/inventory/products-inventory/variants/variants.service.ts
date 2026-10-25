import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import {
  OneVariantResponse,
  VariantResponseDto,
} from './dto/variant-response.dto';
import { GetVariantsQueryDto } from './dto/get-variants-query.dto';
import { AllPaginatedVariants } from './dto/all-paginated-variants.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Variant } from './entities/variant.entity';
import { ProductsService } from '../products/products.service';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { StockAvailabilityService } from '../../stock-alerts/stock-availability.service';
import { Location } from '../stocks/locations/entities/location.entity';
import { Item } from '../stocks/items/entities/item.entity';

@Injectable()
export class VariantsService {
  constructor(
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
    private readonly stockAvailabilityService: StockAvailabilityService,
  ) {}

  /**
   * Variant names are unique within their product (case-insensitive), on create and on
   * update alike. Not across the merchant: two products may both have a "Small" variant.
   */
  private async assertNameFreeInProduct(
    productId: number,
    name: string | undefined,
    exceptVariantId?: number,
  ): Promise<void> {
    if (!name) return;
    const qb = this.variantRepository
      .createQueryBuilder('variant')
      .where('variant.productId = :productId', { productId })
      .andWhere('LOWER(variant.name) = LOWER(:name)', { name: name.trim() })
      .andWhere('variant.isActive = :isActive', { isActive: true });
    if (exceptVariantId != null) {
      qb.andWhere('variant.id != :exceptVariantId', { exceptVariantId });
    }
    if (await qb.getExists()) {
      ErrorHandler.exists(ErrorMessage.VARIANT_NAME_EXISTS);
    }
  }

  async create(
    merchant_id: number,
    createVariantDto: CreateVariantDto,
  ): Promise<OneVariantResponse> {
    const { productId, ...variantData } = createVariantDto;

    // the merchant's own product only (findOne answers 404 for anyone else's)
    const product = await this.productsService.findOne(productId, merchant_id);

    if (!product) {
      ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);
    }

    await this.assertNameFreeInProduct(product.data.id, variantData.name);

    // Sin SKU no hay duplicado que buscar ni variante inactiva que reactivar. Antes se
    // buscaba igual, y con sku undefined TypeORM ignora la condición: respondía "SKU ya
    // existe" si el comercio tenía cualquier variante activa, o sobrescribía cualquier
    // variante inactiva del comercio, de otro producto incluso.
    const sku = blankToNull(variantData.sku);

    const existingVariantBySku = sku
      ? await this.variantRepository.findOne({
          where: [
            {
              sku,
              isActive: true,
              product: { merchantId: merchant_id },
            },
          ],
        })
      : null;

    if (existingVariantBySku) {
      ErrorHandler.exists(ErrorMessage.VARIANT_SKU_EXISTS);
    }
    const existingButIsNotActive = sku
      ? await this.variantRepository.findOne({
          where: [
            {
              sku,
              isActive: false,
              product: { merchantId: merchant_id },
            },
          ],
        })
      : null;

    if (existingButIsNotActive) {
      Object.assign(existingButIsNotActive, {
        ...variantData,
        sku,
        productId: product.data.id,
        isActive: true,
      });
      const savedVariant = await this.variantRepository.save(
        existingButIsNotActive,
      );
      return this.findOne(savedVariant.id, merchant_id, 'Created');
    } else {
      const newVariant = this.variantRepository.create({
        ...variantData,
        sku,
        productId: product.data.id,
      });

      const savedVariant = await this.variantRepository.save(newVariant);

      return this.findOne(savedVariant.id, merchant_id, 'Created');
    }
  }

  async findAll(
    query: GetVariantsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedVariants> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 2. Build query with filters
    const queryBuilder = this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('product.merchantId = :merchantId', { merchantId });

    // 3. Apply optional filters
    if (query.name) {
      queryBuilder.andWhere('LOWER(variant.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    // 4. Get total records
    const total = await queryBuilder.getCount();

    // 5. Apply pagination and sorting
    const variants = await queryBuilder
      .orderBy('variant.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 6. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const availabilityMap =
      await this.stockAvailabilityService.getVariantAvailabilityMap(
        merchantId,
        variants.map((v) => v.id),
      );

    // 7. Map to VariantResponseDto
    const data: VariantResponseDto[] = await Promise.all(
      variants.map(async (variant) => {
        const flags = availabilityMap.get(variant.id) ?? {
          isOutOfStock: false,
          isLowStock: false,
        };
        const result: VariantResponseDto = {
          id: variant.id,
          name: variant.name,
          price: variant.price,
          sku: variant.sku,
          isOutOfStock: flags.isOutOfStock,
          isLowStock: flags.isLowStock,
          product: variant.product
            ? (
                await this.productsService.findOne(
                  variant.product.id,
                  merchantId,
                )
              ).data
            : null,
          isActive: variant.isActive,
        };
        return result;
      }),
    );

    return {
      statusCode: 200,
      message: 'Variants retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(
    id: number,
    merchantId?: number,
    createdUpdateDelete?: string,
  ): Promise<OneVariantResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Variant ID is incorrect');
    }

    const queryBuilder = this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('variant.id = :id', { id });

    if (merchantId !== undefined) {
      queryBuilder.andWhere('product.merchantId = :merchantId', { merchantId });
    }

    const variant = await queryBuilder.getOne();

    if (!variant) {
      ErrorHandler.notFound(ErrorMessage.VARIANT_NOT_FOUND);
    }

    const flags =
      merchantId != null
        ? ((await this.stockAvailabilityService.getVariantAvailability(
            merchantId,
            variant.id,
          )) ?? { isOutOfStock: false, isLowStock: false })
        : { isOutOfStock: false, isLowStock: false };

    const result: VariantResponseDto = {
      id: variant.id,
      name: variant.name,
      price: variant.price,
      sku: variant.sku,
      isOutOfStock: flags.isOutOfStock,
      isLowStock: flags.isLowStock,
      product: variant.product
        ? (await this.productsService.findOne(variant.product.id, merchantId))
            .data
        : null,
      isActive: variant.isActive,
    };

    let response: OneVariantResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Variant ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 200,
          message: `Variant ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 200,
          message: `Variant ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Variant retrieved successfully',
          data: result,
        };
        break;
    }
    return response;
  }

  async update(
    id: number,
    merchant_id: number,
    updateVariantDto: UpdateVariantDto,
  ): Promise<OneVariantResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Variant ID is incorrect');
    }

    const { ...variantData } = updateVariantDto;

    const variant = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .where('variant.id = :id', { id })
      .andWhere('product.merchantId = :merchantId', { merchantId: merchant_id })
      .getOne();

    if (!variant) {
      ErrorHandler.notFound(ErrorMessage.VARIANT_NOT_FOUND);
    }

    if (variantData.name && variantData.name !== variant.name) {
      await this.assertNameFreeInProduct(
        variant.productId,
        variantData.name,
        id,
      );
    }

    // Un SKU vacío lo borra; sólo uno con valor puede chocar con otra variante.
    const sku =
      variantData.sku === undefined ? undefined : blankToNull(variantData.sku);
    if (sku && sku !== variant.sku) {
      const existingVariantSku = await this.variantRepository.findOne({
        where: {
          sku,
          isActive: true,
          product: { merchantId: merchant_id },
        },
      });

      if (existingVariantSku && existingVariantSku.id !== id) {
        ErrorHandler.exists(ErrorMessage.VARIANT_SKU_EXISTS);
      }
    }

    Object.assign(variant, variantData, sku === undefined ? {} : { sku });
    await this.variantRepository.save(variant);

    return this.findOne(id, merchant_id, 'Updated');
  }

  async remove(id: number, merchant_id: number): Promise<OneVariantResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Variant ID is incorrect');
    }

    const variant = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .where('variant.id = :id', { id })
      .andWhere('variant.isActive = :isActive', { isActive: true })
      .andWhere('product.merchantId = :merchantId', { merchantId: merchant_id })
      .getOne();

    if (!variant) {
      ErrorHandler.notFound(ErrorMessage.VARIANT_NOT_FOUND);
    }

    try {
      variant.isActive = false;
      await this.variantRepository.save(variant);

      return this.findOne(id, merchant_id, 'Deleted');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async softRemoveByProductId(
    productId: number,
    merchant_id: number,
    manager?: EntityManager,
  ): Promise<void> {
    const repository =
      manager?.getRepository(Variant) ?? this.variantRepository;
    const variants = await repository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .where('variant.productId = :productId', { productId })
      .andWhere('variant.isActive = :isActive', { isActive: true })
      .andWhere('product.merchantId = :merchant_id', { merchant_id })
      .getMany();

    if (variants.length > 0) {
      for (const variant of variants) {
        variant.isActive = false;
      }
      await repository.save(variants);
    }
  }
}

/** Un texto vacío o solo con espacios cuenta como ausente. */
function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
