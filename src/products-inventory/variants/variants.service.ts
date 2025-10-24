import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Variant } from './entities/variant.entity';
import { VariantResponseDto } from './dto/variant-response.dto';
import { ProductsService } from '../products/products.service';
import { ProductsInventoryService } from '../products-inventory.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

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
  ): Promise<VariantResponseDto> {
    const { productId, ...variantData } = createVariantDto;

    const product = await this.productsService.findOne(productId);

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (product.merchant?.id !== user.merchant.id) {
      throw new ForbiddenException(
        'You are not allowed to create variants for this merchant',
      );
    }

    const existingVariantByName = await this.variantRepository.findOne({
      where: [{ name: variantData.name, isActive: true }],
    });

    if (existingVariantByName) {
      throw new ConflictException(
        `Variant with name "${variantData.name}" already exists.`,
      );
    }

    const existingVariantBySku = await this.variantRepository.findOne({
      where: [{ sku: variantData.sku, isActive: true }],
    });

    if (existingVariantBySku) {
      throw new ConflictException(
        `Variant with SKU "${variantData.sku}" already exists.`,
      );
    }
    const existingButIsNotActive = await this.variantRepository.findOne({
      where: [{ name: variantData.name, isActive: false }],
    });

    if (existingButIsNotActive) {
      existingButIsNotActive.isActive = true;
      await this.variantRepository.save(existingButIsNotActive);
      return this.findOne(existingButIsNotActive.id);
    } else {
      const newVariant = this.variantRepository.create({
        ...variantData,
        productId: product.id,
      });

      const savedVariant = await this.variantRepository.save(newVariant);

      return this.findOne(savedVariant.id);
    }
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

  async update(
    user: AuthenticatedUser,
    id: number,
    updateVariantDto: UpdateVariantDto,
  ): Promise<VariantResponseDto> {
    const { productId, ...variantData } = updateVariantDto;

    const variant = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .where('variant.id = :id', { id })
      .andWhere('variant.isActive = :isActive', { isActive: true })
      .getOne();

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    if (variant.product.merchant.id !== user.merchant.id) {
      throw new ForbiddenException(
        'You are not allowed to modify variants for other merchants',
      );
    }

    if (productId && productId !== variant.productId) {
      throw new ForbiddenException('Product ID cannot be changed');
    }

    if (variantData.name && variantData.name !== variant.name) {
      const existingVariantName = await this.variantRepository.findOne({
        where: { name: variantData.name },
      });

      if (existingVariantName && existingVariantName.id !== id) {
        throw new ConflictException(
          `Variant with name "${variantData.name}" already exists.`,
        );
      }
    }

    if (variantData.sku && variantData.sku !== variant.sku) {
      const existingVariantSku = await this.variantRepository.findOne({
        where: { sku: variantData.sku },
      });

      if (existingVariantSku && existingVariantSku.id !== id) {
        throw new ConflictException(
          `Variant with SKU "${variantData.sku}" already exists.`,
        );
      }
    }

    Object.assign(variant, variantData);
    await this.variantRepository.save(variant);

    return this.findOne(id);
  }

  async remove(
    user: AuthenticatedUser,
    id: number,
  ): Promise<{ message: string }> {
    const variant = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .where('variant.id = :id', { id })
      .andWhere('variant.isActive = :isActive', { isActive: true })
      .getOne();

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    if (variant.product.merchant.id !== user.merchant.id) {
      throw new ForbiddenException(
        'You are not allowed to delete variants for other merchants',
      );
    }

    variant.isActive = false;
    await this.variantRepository.save(variant);

    return {
      message: `Variant with ID ${id} was successfully deleted`,
    };
  }
}
