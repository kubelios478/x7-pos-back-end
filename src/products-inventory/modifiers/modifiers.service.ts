import { Injectable } from '@nestjs/common';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import {
  AllModifiersResponse,
  ModifierResponseDto,
  OneModifierResponse,
} from './dto/modifier-response.dto';
import { Modifier } from './entities/modifier.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { ProductsInventoryService } from '../products-inventory.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';

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
  ): Promise<OneModifierResponse> {
    const { productId, ...modifierData } = createModifierDto;

    const product = await this.productsService.findOne(productId);

    if (!product) {
      ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);
    }

    if (product.data.merchant?.id !== user.merchant.id) {
      ErrorHandler.differentMerchant();
    }

    const existingModifierByName = await this.modifierRepository.findOne({
      where: [{ name: modifierData.name, isActive: true }],
    });

    if (existingModifierByName) {
      ErrorHandler.exists(ErrorMessage.MODIFIER_NAME_EXISTS);
    }
    const existingButIsNotActive = await this.modifierRepository.findOne({
      where: [{ name: modifierData.name, isActive: false }],
    });

    if (existingButIsNotActive) {
      existingButIsNotActive.isActive = true;
      await this.modifierRepository.save(existingButIsNotActive);
      return this.findOne(existingButIsNotActive.id, undefined, 'Created');
    } else {
      const newModifier = this.modifierRepository.create({
        ...modifierData,
        productId: product.data.id,
      });

      const savedModifier = await this.modifierRepository.save(newModifier);

      return this.findOne(savedModifier.id, undefined, 'Created');
    }
  }

  async findAll(merchantId: number): Promise<AllModifiersResponse> {
    const modifiers = await this.modifierRepository
      .createQueryBuilder('modifier')
      .leftJoinAndSelect('modifier.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('product.merchantId = :merchantId', { merchantId })
      .andWhere('modifier.isActive = :isActive', { isActive: true })
      .getMany();

    const modifiersResponse: ModifierResponseDto[] = await Promise.all(
      modifiers.map((modifier) => {
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
      }),
    );

    return {
      statusCode: 200,
      message: 'Modifiers retrieved successfully',
      data: modifiersResponse,
    };
  }

  async findOne(
    id: number,
    merchantId?: number,
    createdUpdateDelete?: string,
  ): Promise<OneModifierResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Modifier ID incorrect');
    }

    const queryBuilder = this.modifierRepository
      .createQueryBuilder('modifier')
      .leftJoinAndSelect('modifier.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('modifier.id = :id', { id });

    if (createdUpdateDelete !== 'Deleted') {
      queryBuilder.andWhere('modifier.isActive = :isActive', {
        isActive: true,
      });
    }

    if (merchantId !== undefined) {
      queryBuilder.andWhere('product.merchantId = :merchantId', { merchantId });
    }

    const modifier = await queryBuilder.getOne();

    if (!modifier) {
      ErrorHandler.notFound(ErrorMessage.MODIFIER_NOT_FOUND);
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

    let response: OneModifierResponse;

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
    updateModifierDto: UpdateModifierDto,
  ): Promise<OneModifierResponse> {
    const { productId, ...modifierData } = updateModifierDto;

    const modifier = await this.modifierRepository
      .createQueryBuilder('modifier')
      .leftJoinAndSelect('modifier.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .where('modifier.id = :id', { id })
      .andWhere('modifier.isActive = :isActive', { isActive: true })
      .getOne();

    if (!modifier) {
      ErrorHandler.notFound(ErrorMessage.MODIFIER_NOT_FOUND);
    }

    if (modifier.product.merchant.id !== user.merchant.id) {
      ErrorHandler.differentMerchant();
    }

    if (productId && productId !== modifier.productId) {
      ErrorHandler.forbidden(ErrorMessage.PRODUCT_ID_NOT_CHANGED);
    }

    if (modifierData.name && modifierData.name !== modifier.name) {
      const existingModifierName = await this.modifierRepository.findOne({
        where: { name: modifierData.name },
      });

      if (existingModifierName && existingModifierName.id !== id) {
        ErrorHandler.exists(ErrorMessage.MODIFIER_NAME_EXISTS);
      }
    }

    Object.assign(modifier, modifierData);
    await this.modifierRepository.save(modifier);

    return this.findOne(id, undefined, 'Updated');
  }

  async remove(
    user: AuthenticatedUser,
    id: number,
  ): Promise<OneModifierResponse> {
    const modifier = await this.modifierRepository
      .createQueryBuilder('modifier')
      .leftJoinAndSelect('modifier.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .where('modifier.id = :id', { id })
      .andWhere('modifier.isActive = :isActive', { isActive: true })
      .getOne();

    if (!modifier) {
      ErrorHandler.notFound(ErrorMessage.MODIFIER_NOT_FOUND);
    }

    if (modifier.product.merchant.id !== user.merchant.id) {
      ErrorHandler.differentMerchant();
    }

    try {
      modifier.isActive = false;
      await this.modifierRepository.save(modifier);

      return this.findOne(id, undefined, 'Deleted');
    } catch (error) {
      console.log(error);
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
