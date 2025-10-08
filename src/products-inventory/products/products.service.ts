import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}
  create(createProductDto: CreateProductDto) {
    console.log(createProductDto);
    return 'This action adds a new product';
  }

  async findAll(): Promise<ProductResponseDto[]> {
    const products = await this.productRepository.find({
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

  update(id: number, updateProductDto: UpdateProductDto) {
    console.log(updateProductDto);
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
