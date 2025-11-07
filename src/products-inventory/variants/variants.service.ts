import { Injectable } from '@nestjs/common';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import {
  OneVariantResponse,
  VariantResponseDto,
} from './dto/variant-response.dto';
import { GetVariantsQueryDto } from './dto/get-variants-query.dto';
import { AllPaginatedVariants } from './dto/all-paginated-variants.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Variant } from './entities/variant.entity';
import { ProductsService } from '../products/products.service';
import { ProductsInventoryService } from '../products-inventory.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';

@Injectable()
export class VariantsService {
  constructor(
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
    private readonly productsService: ProductsService,
    private readonly productsInventoryService: ProductsInventoryService,
  ) {}

  async create(
    user: AuthenticatedUser,
    createVariantDto: CreateVariantDto,
  ): Promise<OneVariantResponse> {
    const { productId, ...variantData } = createVariantDto;

    const product = await this.productsService.findOne(productId);

    if (!product) {
      ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);
    }

    if (product.data.merchant?.id !== user.merchant.id) {
      ErrorHandler.differentMerchant();
    }

    const existingVariantByName = await this.variantRepository.findOne({
      where: [{ name: variantData.name, isActive: true }],
    });

    if (existingVariantByName) {
      ErrorHandler.exists(ErrorMessage.VARIANT_NAME_EXISTS);
    }

    const existingVariantBySku = await this.variantRepository.findOne({
      where: [{ sku: variantData.sku, isActive: true }],
    });

    if (existingVariantBySku) {
      ErrorHandler.exists(ErrorMessage.VARIANT_SKU_EXISTS);
    }
    const existingButIsNotActive = await this.variantRepository.findOne({
      where: [{ name: variantData.name, isActive: false }],
    });

    if (existingButIsNotActive) {
      existingButIsNotActive.isActive = true;
      await this.variantRepository.save(existingButIsNotActive);
      return this.findOne(existingButIsNotActive.id, undefined, 'Created');
    } else {
      const newVariant = this.variantRepository.create({
        ...variantData,
        productId: product.data.id,
      });

      const savedVariant = await this.variantRepository.save(newVariant);

      return this.findOne(savedVariant.id, undefined, 'Created');
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
      .where('product.merchantId = :merchantId', { merchantId })
      .andWhere('variant.isActive = :isActive', { isActive: true });

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

    // 7. Map to VariantResponseDto
    const data: VariantResponseDto[] = await Promise.all(
      variants.map((variant) => {
        const result: VariantResponseDto = {
          id: variant.id,
          name: variant.name,
          price: variant.price,
          sku: variant.sku,
          product: variant.product
            ? this.productsInventoryService.mapProductToProductResponseDto(
                variant.product,
              )
            : null,
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
      ErrorHandler.invalidId('Variant ID incorrect');
    }

    const queryBuilder = this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('variant.id = :id', { id });

    if (createdUpdateDelete !== 'Deleted') {
      queryBuilder.andWhere('variant.isActive = :isActive', { isActive: true });
    }

    if (merchantId !== undefined) {
      queryBuilder.andWhere('product.merchantId = :merchantId', { merchantId });
    }

    const variant = await queryBuilder.getOne();

    if (!variant) {
      ErrorHandler.notFound(ErrorMessage.VARIANT_NOT_FOUND);
    }

    const result: VariantResponseDto = {
      id: variant.id,
      name: variant.name,
      price: variant.price,
      sku: variant.sku,
      product: variant.product
        ? this.productsInventoryService.mapProductToProductResponseDto(
            variant.product,
          )
        : null,
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
          statusCode: 201,
          message: `Variant ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
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
    user: AuthenticatedUser,
    id: number,
    updateVariantDto: UpdateVariantDto,
  ): Promise<OneVariantResponse> {
    const { productId, ...variantData } = updateVariantDto;

    const variant = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .where('variant.id = :id', { id })
      .andWhere('variant.isActive = :isActive', { isActive: true })
      .getOne();

    if (!variant) {
      ErrorHandler.notFound(ErrorMessage.VARIANT_NOT_FOUND);
    }

    if (variant.product.merchant.id !== user.merchant.id) {
      ErrorHandler.differentMerchant();
    }

    if (productId && productId !== variant.productId) {
      ErrorHandler.forbidden(ErrorMessage.PRODUCT_ID_NOT_CHANGED);
    }

    if (variantData.name && variantData.name !== variant.name) {
      const existingVariantName = await this.variantRepository.findOne({
        where: { name: variantData.name },
      });

      if (existingVariantName && existingVariantName.id !== id) {
        ErrorHandler.exists(ErrorMessage.VARIANT_NAME_EXISTS);
      }
    }

    if (variantData.sku && variantData.sku !== variant.sku) {
      const existingVariantSku = await this.variantRepository.findOne({
        where: { sku: variantData.sku },
      });

      if (existingVariantSku && existingVariantSku.id !== id) {
        ErrorHandler.exists(ErrorMessage.VARIANT_SKU_EXISTS);
      }
    }

    Object.assign(variant, variantData);
    await this.variantRepository.save(variant);

    return this.findOne(id, undefined, 'Updated');
  }

  async remove(
    user: AuthenticatedUser,
    id: number,
  ): Promise<OneVariantResponse> {
    const variant = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .where('variant.id = :id', { id })
      .andWhere('variant.isActive = :isActive', { isActive: true })
      .getOne();

    if (!variant) {
      ErrorHandler.notFound(ErrorMessage.VARIANT_NOT_FOUND);
    }

    if (variant.product.merchant.id !== user.merchant.id) {
      ErrorHandler.differentMerchant();
    }

    try {
      variant.isActive = false;
      await this.variantRepository.save(variant);

      return this.findOne(id, undefined, 'Deleted');
    } catch (error) {
      console.log(error);
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
