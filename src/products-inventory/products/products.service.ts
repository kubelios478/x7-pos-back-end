import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  OneProductResponse,
  ProductResponseDto,
} from './dto/product-response.dto';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { AllPaginatedProducts } from './dto/all-paginated-purchase-orders.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { Category } from '../category/entities/category.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CategoryLittleResponseDto } from '../category/dto/category-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}
  async create(
    user: AuthenticatedUser,
    createProductDto: CreateProductDto,
  ): Promise<OneProductResponse> {
    const { name, sku, basePrice, categoryId, merchantId, supplierId } =
      createProductDto;

    if (merchantId !== user.merchant.id) ErrorHandler.differentMerchant();

    const [merchant, category, supplier] = await Promise.all([
      this.merchantRepository.findOneBy({ id: merchantId }),
      this.categoryRepository.findOneBy({ id: categoryId, merchantId }),
      this.supplierRepository.findOneBy({ id: supplierId, merchantId }),
    ]);

    if (!merchant) ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
    if (!category) ErrorHandler.notFound(ErrorMessage.CATEGORY_NOT_FOUND);
    if (!supplier) ErrorHandler.notFound(ErrorMessage.SUPPLIER_NOT_FOUND);

    const existingProduct = await this.productRepository.findOne({
      where: [
        { name: name, isActive: true },
        { sku: sku, isActive: true },
      ],
    });

    if (existingProduct) {
      if (existingProduct.name === name)
        ErrorHandler.exists(ErrorMessage.PRODUCT_NAME_EXISTS);
      if (existingProduct.sku === sku)
        ErrorHandler.exists(ErrorMessage.PRODUCT_SKU_EXISTS);
    }

    try {
      const existingButIsNotActive = await this.productRepository.findOne({
        where: [{ name: name, isActive: false }],
      });

      if (existingButIsNotActive) {
        existingButIsNotActive.isActive = true;
        await this.productRepository.save(existingButIsNotActive);
        return this.findOne(existingButIsNotActive.id, undefined, 'Created');
      } else {
        const newProduct = this.productRepository.create({
          name,
          sku,
          basePrice,
          merchantId,
          categoryId,
          supplierId,
        });

        const savedProduct = await this.productRepository.save(newProduct);

        return this.findOne(savedProduct.id, undefined, 'Created');
      }
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
      console.log(error);
    }
  }

  async findAll(
    query: GetProductsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedProducts> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 4. Build query with filters
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('category.parent', 'parentCategory')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('product.merchantId = :merchantId', { merchantId })
      .andWhere('product.isActive = :isActive', { isActive: true });

    // 5. Apply optional filters
    if (query.name) {
      queryBuilder.andWhere('LOWER(product.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    if (query.category) {
      queryBuilder.andWhere('LOWER(category.name) LIKE LOWER(:categoryName)', {
        categoryName: `%${query.category}%`,
      });
    }

    // 6. Get total records
    const total = await queryBuilder.getCount();

    // 7. Apply pagination and sorting
    const products = await queryBuilder
      .orderBy('product.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 8. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 9. Map to ProductResponseDto
    const data: ProductResponseDto[] = await Promise.all(
      products.map((product) => {
        const result: ProductResponseDto = {
          id: product.id,
          name: product.name,
          sku: product.sku,
          basePrice: product.basePrice,
          merchant: product.merchant
            ? {
                id: product.merchant.id,
                name: product.merchant.name,
              }
            : null,
          category: product.category
            ? {
                id: product.category.id,
                name: product.category.name,
                parent: product.category.parent
                  ? ({
                      id: product.category.parent.id,
                      name: product.category.parent.name,
                    } as CategoryLittleResponseDto)
                  : null,
              }
            : null,
          supplier: product.supplier
            ? {
                id: product.supplier.id,
                name: product.supplier.name,
                contactInfo: product.supplier.contactInfo,
              }
            : null,
        };
        return result;
      }),
    );

    return {
      statusCode: 200,
      message: 'Products retrieved successfully',
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
  ): Promise<OneProductResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Product ID incorrect');
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

    const product = await this.productRepository.findOne({
      where: whereCondition,
      relations: [
        'merchant',
        'category',
        'category.parent',
        'supplier',
        'supplier.merchant',
      ],
    });

    if (!product) ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);

    const result: ProductResponseDto = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      basePrice: product.basePrice,
      merchant: product.merchant
        ? {
            id: product.merchant.id,
            name: product.merchant.name,
          }
        : null,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            parent: product.category.parent
              ? ({
                  id: product.category.parent.id,
                  name: product.category.parent.name,
                } as CategoryLittleResponseDto)
              : null,
          }
        : null,
      supplier: product.supplier
        ? {
            id: product.supplier.id,
            name: product.supplier.name,
            contactInfo: product.supplier.contactInfo,
          }
        : null,
    };

    let response: OneProductResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Product ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 201,
          message: `Product ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
          message: `Product ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Product retrieved successfully',
          data: result,
        };
        break;
    }
    return response;
  }

  async update(
    user: AuthenticatedUser,
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<OneProductResponse> {
    const { name, merchantId, categoryId, supplierId, sku, ...updateData } =
      updateProductDto;

    const product = await this.productRepository.findOneBy({
      id,
      isActive: true,
    });

    if (!product) ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);

    if (product.merchantId !== user.merchant.id)
      ErrorHandler.differentMerchant();

    if (merchantId && merchantId !== product.merchantId)
      ErrorHandler.changedMerchant();

    if (categoryId && categoryId !== product.categoryId) {
      const category = await this.categoryRepository.findOneBy({
        id: categoryId,
      });
      if (!category) ErrorHandler.notFound(ErrorMessage.CATEGORY_NOT_FOUND);
    }
    if (supplierId && supplierId !== product.supplierId) {
      const supplier = await this.supplierRepository.findOneBy({
        id: supplierId,
      });
      if (!supplier) ErrorHandler.notFound(ErrorMessage.SUPPLIER_NOT_FOUND);
    }

    if (name && name !== product.name) {
      const existingProductWithName = await this.productRepository.findOne({
        where: { name, isActive: true },
      });
      if (
        existingProductWithName &&
        existingProductWithName.id !== product.id
      ) {
        ErrorHandler.exists(ErrorMessage.PRODUCT_NAME_EXISTS);
      }
    }

    if (sku && sku !== product.sku) {
      const existingProductWithSku = await this.productRepository.findOne({
        where: { sku, isActive: true },
      });
      if (existingProductWithSku && existingProductWithSku.id !== product.id) {
        ErrorHandler.exists(ErrorMessage.PRODUCT_SKU_EXISTS);
      }
    }

    Object.assign(product, {
      ...updateData,
      name,
      categoryId,
      supplierId,
      sku,
    });
    try {
      await this.productRepository.save(product);
      return this.findOne(id, undefined, 'Updated');
    } catch (error) {
      console.log(error);
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    user: AuthenticatedUser,
    id: number,
  ): Promise<OneProductResponse> {
    const product = await this.productRepository.findOneBy({
      id,
      isActive: true,
    });

    if (!product) ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);

    if (product.merchantId !== user.merchant.id)
      ErrorHandler.differentMerchant();

    try {
      product.isActive = false;
      await this.productRepository.save(product);
      return this.findOne(id, undefined, 'Deleted');
    } catch (error) {
      console.log(error);
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
