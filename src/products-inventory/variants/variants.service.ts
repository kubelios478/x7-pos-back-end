import { Injectable } from '@nestjs/common';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import {
  AllVariantsResponse,
  OneVariantResponse,
  VariantResponseDto,
} from './dto/variant-response.dto';
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

  async findAll(merchantId: number): Promise<AllVariantsResponse> {
    const variants = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('product.merchantId = :merchantId', { merchantId })
      .andWhere('variant.isActive = :isActive', { isActive: true })
      .getMany();

    const variantsResponse: VariantResponseDto[] = await Promise.all(
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
      data: variantsResponse,
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
