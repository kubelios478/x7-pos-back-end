import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import { ModifierResponseDto } from './dto/modifier-response.dto';
import { Modifier } from './entities/modifier.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { ProductsInventoryService } from '../products-inventory.service';

@Injectable()
export class ModifiersService {
  constructor(
    @InjectRepository(Modifier)
    private readonly modifierRepository: Repository<Modifier>,
    private readonly productsService: ProductsService,
    private readonly productsInventoryService: ProductsInventoryService,
  ) {}

  create(createModifierDto: CreateModifierDto) {
    console.log(createModifierDto);
    return 'This action adds a new modifier';
  }

  async findAll(merchantId: number): Promise<ModifierResponseDto[]> {
    const modifiers = await this.modifierRepository
      .createQueryBuilder('modifier')
      .leftJoinAndSelect('modifier.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('product.merchantId = :merchantId', { merchantId })
      .andWhere('modifier.isActive = :isActive', { isActive: true })
      .getMany();
    return modifiers.map((modifier) => {
      const result: ModifierResponseDto = {
        id: modifier.id,
        name: modifier.name,
        priceDelta: modifier.priceDelta,
        product: modifier.product
          ? this.productsInventoryService.mapProductToProductResponseDto(
              modifier.product,
            )
          : null,
      };
      return result;
    });
  }

  async findOne(id: number, merchantId?: number): Promise<ModifierResponseDto> {
    const queryBuilder = this.modifierRepository
      .createQueryBuilder('modifier')
      .leftJoinAndSelect('modifier.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('modifier.id = :id', { id })
      .andWhere('modifier.isActive = :isActive', { isActive: true });

    if (merchantId !== undefined) {
      queryBuilder.andWhere('product.merchantId = :merchantId', { merchantId });
    }

    const modifier = await queryBuilder.getOne();

    if (!modifier) {
      throw new NotFoundException(`Modifier with ID ${id} not found`);
    }

    const result: ModifierResponseDto = {
      id: modifier.id,
      name: modifier.name,
      priceDelta: modifier.priceDelta,
      product: modifier.product
        ? this.productsInventoryService.mapProductToProductResponseDto(
            modifier.product,
          )
        : null,
    };
    return result;
  }

  update(id: number, updateModifierDto: UpdateModifierDto) {
    console.log(updateModifierDto);
    return `This action updates a #${id} modifier`;
  }

  remove(id: number) {
    return `This action removes a #${id} modifier`;
  }
}
