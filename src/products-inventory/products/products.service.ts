import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { Category } from '../category/entities/category.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CategoryLittleResponseDto } from '../category/dto/category-little-response.dto';

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
  ): Promise<ProductResponseDto> {
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
      where: [
        { sku, merchantId },
        { sku, categoryId },
      ],
    });

    if (existingProduct) {
      throw new ConflictException(
        `Product with SKU "${sku}" already exists for this category.`,
      );
    }

    const newProduct = this.productRepository.create({
      name,
      sku,
      basePrice,
      merchantId,
      categoryId,
      supplierId,
    });

    const savedProduct = await this.productRepository.save(newProduct);

    console.log(createProductDto);
    return this.findOne(savedProduct.id);
  }

  async findAll(merchantId: number): Promise<ProductResponseDto[]> {
    const products = await this.productRepository.find({
      where: { merchantId, isActive: true },
      relations: ['merchant', 'category', 'category.parent', 'supplier'],
    });

    return products.map((product) => {
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
      //console.log(result.supplier);
      return result;
    });
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

  async update(
    user: AuthenticatedUser,
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const { merchantId, categoryId, supplierId, sku, ...updateData } =
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

    if (sku && sku !== product.sku) {
      const existingProduct = await this.productRepository.findOne({
        where: [
          { sku, merchantId: product.merchantId },
          { sku, categoryId: product.categoryId },
        ],
      });
      if (existingProduct && existingProduct.id !== id) {
        throw new ConflictException(
          `Product with SKU "${sku}" already exists for this merchant or category.`,
        );
      }
    }

    Object.assign(product, { ...updateData, categoryId, supplierId, sku });
    await this.productRepository.save(product);

    return this.findOne(id);
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
}
