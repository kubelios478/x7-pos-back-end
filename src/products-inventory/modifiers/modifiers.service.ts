import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import { ModifierResponseDto } from './dto/modifier-response.dto';
import { Modifier } from './entities/modifier.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { ProductsInventoryService } from '../products-inventory.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@Injectable()
export class ModifiersService {
  constructor(
    @InjectRepository(Modifier)
    private readonly modifierRepository: Repository<Modifier>,
    private readonly productsService: ProductsService,
    private readonly productsInventoryService: ProductsInventoryService,
  ) {}

  async create(
    user: AuthenticatedUser,
    createModifierDto: CreateModifierDto,
  ): Promise<ModifierResponseDto> {
    const { productId, ...modifierData } = createModifierDto;

    const product = await this.productsService.findOne(productId);

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (product.merchant?.id !== user.merchant.id) {
      throw new ForbiddenException(
        'You are not allowed to create modifiers for this merchant',
      );
    }

    const existingModifierByName = await this.modifierRepository.findOne({
      where: [{ name: modifierData.name, isActive: true }],
    });

    if (existingModifierByName) {
      throw new ConflictException(
        `Modifier with name "${modifierData.name}" already exists.`,
      );
    }
    const existingButIsNotActive = await this.modifierRepository.findOne({
      where: [{ name: modifierData.name, isActive: false }],
    });

    if (existingButIsNotActive) {
      existingButIsNotActive.isActive = true;
      await this.modifierRepository.save(existingButIsNotActive);
      return this.findOne(existingButIsNotActive.id);
    } else {
      const newModifier = this.modifierRepository.create({
        ...modifierData,
        productId: product.id,
      });

      const savedModifier = await this.modifierRepository.save(newModifier);

      return this.findOne(savedModifier.id);
    }
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

  async update(
    user: AuthenticatedUser,
    id: number,
    updateModifierDto: UpdateModifierDto,
  ): Promise<ModifierResponseDto> {
    const { productId, ...modifierData } = updateModifierDto;

    const modifier = await this.modifierRepository
      .createQueryBuilder('modifier')
      .leftJoinAndSelect('modifier.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .where('modifier.id = :id', { id })
      .andWhere('modifier.isActive = :isActive', { isActive: true })
      .getOne();

    if (!modifier) {
      throw new NotFoundException(`Modifier with ID ${id} not found`);
    }

    if (modifier.product.merchant.id !== user.merchant.id) {
      throw new ForbiddenException(
        'You are not allowed to modify modifiers for other merchants',
      );
    }

    if (productId && productId !== modifier.productId) {
      throw new ForbiddenException('Product ID cannot be changed');
    }

    if (modifierData.name && modifierData.name !== modifier.name) {
      const existingModifierName = await this.modifierRepository.findOne({
        where: { name: modifierData.name },
      });

      if (existingModifierName && existingModifierName.id !== id) {
        throw new ConflictException(
          `Modifier with name "${modifierData.name}" already exists.`,
        );
      }
    }

    Object.assign(modifier, modifierData);
    await this.modifierRepository.save(modifier);

    return this.findOne(id);
  }

  async remove(
    user: AuthenticatedUser,
    id: number,
  ): Promise<{ message: string }> {
    const modifier = await this.modifierRepository
      .createQueryBuilder('modifier')
      .leftJoinAndSelect('modifier.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .where('modifier.id = :id', { id })
      .andWhere('modifier.isActive = :isActive', { isActive: true })
      .getOne();

    if (!modifier) {
      throw new NotFoundException(`Modifier with ID ${id} not found`);
    }

    if (modifier.product.merchant.id !== user.merchant.id) {
      throw new ForbiddenException(
        'You are not allowed to delete modifiers for other merchants',
      );
    }

    modifier.isActive = false;
    await this.modifierRepository.save(modifier);

    return {
      message: `Modifier with ID ${id} was successfully deleted`,
    };
  }
}
