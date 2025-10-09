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
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const { name, sku, basePrice, categoryId, merchantId, supplierId } =
      createProductDto;

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
      where: { merchantId },
      relations: ['merchant', 'category', 'category.merchant', 'supplier'],
    });

    return products.map((product) => {
      const result: ProductResponseDto = {
        id: product.id,
        name: product.name,
        sku: product.sku,
        basePrice: product.basePrice,
        merchant: product.merchant
          ? {
              name: product.merchant.name,
              email: product.merchant.email,
            }
          : null,
        category: product.category
          ? {
              id: product.category.id,
              name: product.category.name,
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

  async findOne(id: number): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['merchant', 'category', 'category.merchant', 'supplier'],
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
            name: product.merchant.name,
            email: product.merchant.email,
          }
        : null,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
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
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<UpdateProductDto> {
    const { merchantId, categoryId, supplierId, ...updateData } =
      updateProductDto;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, sku, basePrice } = updateData;

    const product = await this.productRepository.findOneBy({ id });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const forbidden = [];
    if (merchantId) {
      forbidden.push('Merchant ID cannot be changed' as never);
    }
    if (categoryId) {
      forbidden.push('Category ID cannot be changed' as never);
    }
    if (supplierId) {
      forbidden.push('Supplier ID cannot be changed' as never);
    }

    if (forbidden.length > 0) {
      throw new ForbiddenException({
        message: forbidden,
        error: 'Forbidden',
        status: 403,
      });
    }

    if (name && name !== product.name) {
      const existingProduct = await this.productRepository.findOne({
        where: {
          name,
          merchantId: product.merchantId,
          supplierId: product.supplierId,
        },
      });
      if (existingProduct) {
        throw new ConflictException(
          `Product with name "${name}" already exists`,
        );
      }
    }

    Object.assign(product, updateData);
    await this.productRepository.save(product);

    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.productRepository.remove(product);

    return {
      message: `Product with ID ${id} were successfully deleted`,
    };
  }
}
