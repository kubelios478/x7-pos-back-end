import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  AllProductsResponse,
  OneProductResponse,
  ProductResponseDto,
} from './dto/product-response.dto';
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
      categoryId
        ? this.categoryRepository.findOneBy({ id: categoryId })
        : Promise.resolve(null),
      supplierId
        ? this.supplierRepository.findOneBy({ id: supplierId })
        : Promise.resolve(null),
    ]);

    if (!merchant) ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
    if (categoryId && !category)
      ErrorHandler.notFound(ErrorMessage.CATEGORY_NOT_FOUND);
    if (supplierId && !supplier)
      ErrorHandler.notFound(ErrorMessage.SUPPLIER_NOT_FOUND);

    const existingProduct = await this.productRepository.findOne({
      where: [{ name: name, isActive: true }],
    });

    if (existingProduct) ErrorHandler.exists(ErrorMessage.PRODUCT_NAME_EXISTS);

    const existingSku = await this.productRepository.findOne({
      where: [{ sku: sku, isActive: true }],
    });

    if (existingSku) ErrorHandler.exists(ErrorMessage.PRODUCT_SKU_EXISTS);

    try {
      const existingButIsNotActive = await this.productRepository.findOne({
        where: [{ name: name, isActive: false }],
      });

      if (existingButIsNotActive) {
        existingButIsNotActive.isActive = true;
        await this.productRepository.save(existingButIsNotActive);
        return this.findOne1(existingButIsNotActive.id, undefined, 'Created');
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

        return this.findOne1(savedProduct.id, undefined, 'Created');
      }
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
      console.log(error);
    }
  }

  async findAll(merchantId: number): Promise<AllProductsResponse> {
    const products = await this.productRepository.find({
      where: { merchantId, isActive: true },
      relations: ['merchant', 'category', 'category.parent', 'supplier'],
    });

    const productsResponseDtos: ProductResponseDto[] = await Promise.all(
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
      data: productsResponseDtos,
    };
  }

  async findOne1(
    id: number,
    merchantId?: number,
    createdUpdateDelete?: string,
  ): Promise<OneProductResponse> {
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

    const product = await this.productRepository.findOne({
      where: whereCondition,
      relations: ['merchant', 'category', 'category.parent', 'supplier'],
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
      const existingProductByName = await this.productRepository.findOne({
        where: { name },
      });

      if (existingProductByName && existingProductByName.id !== id)
        ErrorHandler.exists(ErrorMessage.PRODUCT_NAME_EXISTS);
    }

    if (sku && sku !== product.sku) {
      const existingSku = await this.productRepository.findOne({
        where: { sku },
      });

      if (existingSku && existingSku.id !== id)
        ErrorHandler.exists(ErrorMessage.PRODUCT_SKU_EXISTS);
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
      return this.findOne1(id, undefined, 'Updated');
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
      return this.findOne1(id, undefined, 'Deleted');
    } catch (error) {
      console.log(error);
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findOne(id: number, merchantId?: number): Promise<ProductResponseDto> {
    const whereCondition: { id: number; merchantId?: number; isActive: true } =
      {
        id,
        isActive: true,
      };
    if (merchantId !== undefined) {
      whereCondition.merchantId = merchantId;
    }

    const product = await this.productRepository.findOne({
      where: whereCondition,
      relations: ['merchant', 'category', 'category.parent', 'supplier'],
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

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
  }
}
