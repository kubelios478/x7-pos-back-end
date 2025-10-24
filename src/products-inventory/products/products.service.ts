import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    if (merchantId !== user.merchant.id) {
      throw new ForbiddenException(
        'You are not allowed to create products for this merchant',
      );
    }

    const [merchant, category, supplier] = await Promise.all([
      this.merchantRepository.findOneBy({ id: merchantId }),
      categoryId
        ? this.categoryRepository.findOneBy({ id: categoryId })
        : Promise.resolve(null),
      supplierId
        ? this.supplierRepository.findOneBy({ id: supplierId })
        : Promise.resolve(null),
    ]);

    const notFound = [];
    if (!merchant)
      notFound.push(`Merchant with ID ${merchantId} not found` as never);
    if (!category)
      notFound.push(`Category with ID ${categoryId} not found` as never);
    if (!supplier)
      notFound.push(`Supplier with ID ${supplierId} not found` as never);

    if (notFound.length > 0) {
      throw new NotFoundException({
        message: notFound,
        error: 'Not Found',
        status: 404,
      });
    }

    const existingProduct = await this.productRepository.findOne({
      where: [{ name: name, isActive: true }],
    });

    if (existingProduct) {
      throw new ConflictException(
        `Product with name "${name}" already exists.`,
      );
    }

    const existingSku = await this.productRepository.findOne({
      where: [{ sku: sku, isActive: true }],
    });

    if (existingSku) {
      throw new ConflictException(`Product with sku "${sku}" already exists.`);
    }

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
          message: `Category ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 201,
          message: `Category ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
          message: `Category ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Category retrieved successfully',
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

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (product.merchantId !== user.merchant.id) {
      throw new ForbiddenException(
        'You are not allowed to modify products for other merchants',
      );
    }

    if (merchantId && merchantId !== product.merchantId) {
      throw new ForbiddenException('Merchant ID cannot be changed');
    }

    const notFound = [];
    if (categoryId && categoryId !== product.categoryId) {
      const category = await this.categoryRepository.findOneBy({
        id: categoryId,
      });
      if (!category) {
        notFound.push(`Category with ID ${categoryId} not found` as never);
      }
    }
    if (supplierId && supplierId !== product.supplierId) {
      const supplier = await this.supplierRepository.findOneBy({
        id: supplierId,
      });
      if (!supplier) {
        notFound.push(`Supplier with ID ${supplierId} not found` as never);
      }
    }

    if (notFound.length > 0) {
      throw new NotFoundException({
        message: notFound,
        error: 'Not Found',
        status: 404,
      });
    }

    if (name && name !== product.name) {
      const existingProductByName = await this.productRepository.findOne({
        where: { name },
      });

      if (existingProductByName && existingProductByName.id !== id) {
        throw new ConflictException(
          `Product with name "${name}" already exists.`,
        );
      }
    }

    if (sku && sku !== product.sku) {
      const existingSku = await this.productRepository.findOne({
        where: { sku },
      });

      if (existingSku && existingSku.id !== id) {
        throw new ConflictException(
          `Product with SKU "${sku}" already exists.`,
        );
      }
    }

    Object.assign(product, {
      ...updateData,
      name,
      categoryId,
      supplierId,
      sku,
    });
    await this.productRepository.save(product);

    return this.findOne1(id, undefined, 'Updated');
  }

  async remove(
    user: AuthenticatedUser,
    id: number,
  ): Promise<{ message: string }> {
    const product = await this.productRepository.findOneBy({
      id,
      isActive: true,
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (product.merchantId !== user.merchant.id) {
      throw new ForbiddenException(
        'You are not allowed to delete products for other merchants',
      );
    }

    product.isActive = false;
    await this.productRepository.save(product);

    return {
      message: `Product with ID ${id} was successfully deleted`,
    };
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
