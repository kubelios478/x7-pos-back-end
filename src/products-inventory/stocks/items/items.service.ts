import { Injectable } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Item } from './entities/item.entity';
import { Repository } from 'typeorm';
import { ItemResponseDto, OneItemResponse } from './dto/item-response.dto';
import { GetItemsQueryDto } from './dto/get-items-query.dto';
import { AllPaginatedItems } from './dto/all-paginated-items.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { Location } from 'src/products-inventory/stocks/locations/entities/location.entity';
import { Variant } from 'src/products-inventory/variants/entities/variant.entity';
import { ProductLittleResponseDto } from 'src/products-inventory/products/dto/product-response.dto';
import { LocationLittleResponseDto } from '../locations/dto/location-response.dto';
import { VariantLittleResponseDto } from 'src/products-inventory/variants/dto/variant-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
  ) {}

  async create(
    user: AuthenticatedUser,
    createItemDto: CreateItemDto,
  ): Promise<OneItemResponse> {
    const { productId, locationId, variantId, currentQty } = createItemDto;
    const merchantId = user.merchant.id;

    const product = await this.productRepository.findOne({
      where: { id: productId, merchantId },
    });
    if (!product) {
      ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);
    }

    const location = await this.locationRepository.findOne({
      where: { id: locationId, merchantId },
    });
    if (!location) {
      ErrorHandler.notFound(ErrorMessage.LOCATION_NOT_FOUND);
    }

    const variant = await this.variantRepository.findOne({
      where: { id: variantId, productId: product.id },
    });
    if (!variant) {
      ErrorHandler.notFound(ErrorMessage.VARIANT_NOT_FOUND);
    }

    const existingItem = await this.itemRepository.findOne({
      where: {
        product: { id: productId },
        location: { id: locationId },
        variant: { id: variant.id },
      },
    });

    if (existingItem) {
      if (existingItem.isActive) {
        ErrorHandler.exists(ErrorMessage.ITEM_NAME_EXISTS);
      } else {
        // Si el item existe pero está inactivo, lo activamos
        existingItem.isActive = true;
        const activatedItem = await this.itemRepository.save(existingItem);
        return this.findOne(activatedItem.id, merchantId, 'Created');
      }
    }

    const newItem = this.itemRepository.create({
      currentQty,
      product,
      location,
      variant,
      isActive: true,
    });

    const savedItem = await this.itemRepository.save(newItem);

    return this.findOne(savedItem.id, merchantId, 'Created');
  }

  async findAll(
    query: GetItemsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedItems> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 2. Build query with filters
    const queryBuilder = this.itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('item.variant', 'variant')
      .leftJoinAndSelect('item.location', 'location')
      .where('product.merchantId = :merchantId', { merchantId })
      .andWhere('item.isActive = :isActive', { isActive: true });

    // 3. Apply optional filters
    if (query.productName) {
      queryBuilder.andWhere('LOWER(product.name) LIKE LOWER(:productName)', {
        productName: `%${query.productName}%`,
      });
    }

    if (query.variantName) {
      queryBuilder.andWhere('LOWER(variant.name) LIKE LOWER(:variantName)', {
        variantName: `%${query.variantName}%`,
      });
    }

    // 4. Get total records
    const total = await queryBuilder.getCount();

    // 5. Apply pagination and sorting
    const items = await queryBuilder
      .orderBy('product.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 6. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 7. Map to ItemResponseDto
    const data: ItemResponseDto[] = await Promise.all(
      items.map((item) => {
        const result: ItemResponseDto = {
          id: item.id,
          currentQty: item.currentQty,
          product: item.product
            ? ({
                id: item.product.id,
                name: item.product.name,
              } as ProductLittleResponseDto)
            : null,
          variant: item.variant
            ? ({
                id: item.variant.id,
                name: item.variant.name,
              } as VariantLittleResponseDto)
            : null,
          location: item.location
            ? ({
                id: item.location.id,
                name: item.location.name,
              } as LocationLittleResponseDto)
            : null,
        };
        return result;
      }),
    );

    return {
      statusCode: 200,
      message: 'Items retrieved successfully',
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
  ): Promise<OneItemResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Product ID id incorrect');
    }
    const whereCondition: {
      id: number;
      merchantId?: number;
      isActive: boolean;
    } = {
      id,
      isActive: createdUpdateDelete === 'Deleted' ? false : true,
    };
    if (merchantId !== undefined) {
      whereCondition.merchantId = merchantId;
    }
    const item = await this.itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('item.variant', 'variant')
      .leftJoinAndSelect('item.location', 'location')
      .where('item.id = :id', { id })
      .andWhere('product.merchantId = :merchantId', { merchantId })
      .andWhere('item.isActive = :isActive', { isActive: true })
      .getOne();

    if (!item) {
      ErrorHandler.notFound(ErrorMessage.ITEM_NOT_FOUND);
    }

    const result: ItemResponseDto = {
      id: item.id,
      currentQty: item.currentQty,
      product: item.product
        ? ({
            id: item.product.id,
            name: item.product.name,
          } as ProductLittleResponseDto)
        : null,
      variant: item.variant
        ? ({
            id: item.variant.id,
            name: item.variant.name,
          } as VariantLittleResponseDto)
        : null,
      location: item.location
        ? ({
            id: item.location.id,
            name: item.location.name,
          } as LocationLittleResponseDto)
        : null,
    };

    let response: OneItemResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Item ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 201,
          message: `Item ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
          message: `Item ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Item retrieved successfully',
          data: result,
        };
        break;
    }
    return response;
  }

  async update(
    user: AuthenticatedUser,
    id: number,
    updateItemDto: UpdateItemDto,
  ): Promise<OneItemResponse> {
    const merchantId = user.merchant.id;
    const { productId, locationId, variantId, currentQty } = updateItemDto;

    const item = await this.itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('item.location', 'location')
      .leftJoinAndSelect('item.variant', 'variant')
      .where('item.id = :id', { id })
      .andWhere('product.merchantId = :merchantId', { merchantId })
      .andWhere('item.isActive = :isActive', { isActive: true })
      .getOne();

    if (!item) {
      ErrorHandler.notFound(ErrorMessage.ITEM_NOT_FOUND);
    }

    if (productId) {
      const product = await this.productRepository.findOne({
        where: { id: productId, merchantId },
      });
      if (!product) {
        ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);
      }
      item.product = product;
    }

    if (locationId) {
      const location = await this.locationRepository.findOne({
        where: { id: locationId, merchantId },
      });
      if (!location) {
        ErrorHandler.notFound(ErrorMessage.LOCATION_NOT_FOUND);
      }
      item.location = location;
    }

    if (variantId) {
      const variant = await this.variantRepository.findOne({
        where: { id: variantId, productId: item.product.id },
      });
      if (!variant) {
        ErrorHandler.notFound(ErrorMessage.VARIANT_NOT_FOUND);
      }
      item.variant = variant;
    }

    if (currentQty) {
      item.currentQty = currentQty;
    }

    const updatedItem = await this.itemRepository.save(item);

    return this.findOne(updatedItem.id, merchantId, 'Updated');
  }

  async remove(user: AuthenticatedUser, id: number): Promise<OneItemResponse> {
    const merchantId = user.merchant.id;

    const item = await this.itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .where('item.id = :id', { id })
      .andWhere('product.merchantId = :merchantId', { merchantId })
      .andWhere('item.isActive = :isActive', { isActive: true })
      .getOne();

    if (!item) {
      ErrorHandler.notFound(ErrorMessage.ITEM_NOT_FOUND);
    }

    item.isActive = false;
    const removedItem = await this.itemRepository.save(item);

    return this.findOne(removedItem.id, merchantId, 'Deleted');
  }
}
