import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Variant } from './entities/variant.entity';
import { VariantResponseDto } from './dto/variant-response.dto';
import { ProductsInventoryService } from '../products-inventory.service';

@Injectable()
export class VariantsService {
  constructor(
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
    private readonly productsInventoryService: ProductsInventoryService,
  ) {}

  create(createVariantDto: CreateVariantDto) {
    console.log(createVariantDto);
    return 'This action adds a new variant';
  }

  async findAll(merchantId: number): Promise<VariantResponseDto[]> {
    const variants = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('product.merchantId = :merchantId', { merchantId })
      .andWhere('variant.isActive = :isActive', { isActive: true })
      .getMany();

    return variants.map((variant) => {
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
    });
  }

  async findOne(id: number, merchantId?: number): Promise<VariantResponseDto> {
    const queryBuilder = this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('variant.id = :id', { id })
      .andWhere('variant.isActive = :isActive', { isActive: true });

    if (merchantId !== undefined) {
      queryBuilder.andWhere('product.merchantId = :merchantId', { merchantId });
    }

    const variant = await queryBuilder.getOne();

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
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
    return result;
  }

  update(id: number, updateVariantDto: UpdateVariantDto) {
    console.log(updateVariantDto);
    return `This action updates a #${id} variant`;
  }

  remove(id: number) {
    return `This action removes a #${id} variant`;
  }
}
