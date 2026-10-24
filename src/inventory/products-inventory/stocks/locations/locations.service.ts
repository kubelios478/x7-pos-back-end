import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { GetLocationsQueryDto } from './dto/get-locations-query.dto';
import { AllPaginatedLocations } from './dto/all-paginated-locations.dto';
import { Location } from './entities/location.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import {
  LocationResponseDto,
  OneLocationResponse,
} from './dto/location-response.dto';

import { Item } from '../items/entities/item.entity';
import { Variant } from '../../variants/entities/variant.entity';
import { Supply } from 'src/inventory/supplies/entities/supply.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
  ) {}

  private async checkActiveStock(locationId: number) {
    const activeStock = await this.itemRepository.findOne({
      where: {
        locationId,
        isActive: true,
      },
    });

    // Validamos si hay algún stock item registrado con cantidad mayor a 0
    if (activeStock) {
      // Buscamos si alguno tiene cantidad de stock > 0
      const itemsWithStock = await this.itemRepository
        .createQueryBuilder('item')
        .where('item.locationId = :locationId', { locationId })
        .andWhere('item.currentQty > 0')
        .getMany();

      if (itemsWithStock.length > 0) {
        throw new BadRequestException(
          'Cannot deactivate a location with active stock items. Please transfer or zero-out all inventory stock before deactivating this location.',
        );
      }
    }
  }

  /**
   * Runs a write on the merchant's locations with the merchant row locked, so concurrent
   * creates/updates/removes cannot each see "no main location" (or "this is the only
   * one") and leave two main locations, or none.
   */
  private withMerchantLocationsLocked<T>(
    merchantId: number,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.locationRepository.manager.transaction(async (manager) => {
      await manager.findOne(Merchant, {
        where: { id: merchantId },
        lock: { mode: 'pessimistic_write' },
      });
      return work(manager);
    });
  }

  /** After a main location is deactivated, the next active one becomes the main one. */
  private async handOverMainStorage(
    manager: EntityManager,
    merchantId: number,
  ): Promise<void> {
    const locations = manager.getRepository(Location);
    const hasActiveMain = await locations.exists({
      where: { merchantId, isActive: true, isMainStorage: true },
    });
    if (hasActiveMain) return;
    const nextActive = await locations.findOne({
      where: { merchantId, isActive: true },
      order: { id: 'ASC' },
    });
    if (nextActive) {
      nextActive.isMainStorage = true;
      await locations.save(nextActive);
    }
  }

  private async initializeRawMaterialStockForNewLocation(
    manager: EntityManager,
    locationId: number,
    merchantId: number,
  ) {
    const merchant = await manager.findOne(Merchant, {
      where: { id: merchantId },
    });
    const companyId = merchant?.companyId;
    if (!companyId) return;

    const items = manager.getRepository(Item);

    // Buscar todas las materias primas (supplies) activas de esta empresa
    const supplies = await manager.find(Supply, {
      where: { company_id: companyId, isActive: true },
    });

    for (const supply of supplies) {
      const existing = await items.findOne({
        where: {
          supplyId: supply.id,
          locationId: locationId,
        },
      });

      if (!existing) {
        const newStockItem = items.create({
          currentQty: 0,
          minimumQty: 5,
          supplyId: supply.id,
          locationId: locationId,
          isActive: true,
          weightedAverageUnitCost: String(supply.cost_per_unit || 0),
        });
        await items.save(newStockItem);
      }
    }
  }

  async create(
    merchant_id: number,
    createLocationDto: CreateLocationDto,
  ): Promise<OneLocationResponse> {
    const { name, code, address, isMainStorage, isActive } = createLocationDto;

    let locationId: number;
    try {
      locationId = await this.withMerchantLocationsLocked(
        merchant_id,
        async (manager) => {
          const locations = manager.getRepository(Location);

          const existingLocation = await locations.findOne({
            where: [
              {
                name,
                merchantId: merchant_id,
                isActive: true,
              },
              ...(address
                ? [
                    {
                      address,
                      merchantId: merchant_id,
                      isActive: true,
                    },
                  ]
                : []),
            ],
          });

          if (existingLocation) {
            if (existingLocation.name === name) {
              ErrorHandler.exists(ErrorMessage.LOCATION_NAME_EXISTS);
            }
            if (address && existingLocation.address === address) {
              ErrorHandler.exists(ErrorMessage.LOCATION_ADDRESS_EXISTS);
            }
          }

          const count = await locations.count({
            where: { merchantId: merchant_id },
          });
          const forceMain = isMainStorage || count === 0;

          if (forceMain) {
            await locations.update(
              { merchantId: merchant_id },
              { isMainStorage: false },
            );
          }

          const existingButIsNotActive = await locations.findOne({
            where: { name, merchantId: merchant_id, isActive: false },
          });

          let saved: Location;
          if (existingButIsNotActive) {
            existingButIsNotActive.isActive =
              isActive !== undefined ? isActive : true;
            if (code !== undefined) existingButIsNotActive.code = code;
            if (address !== undefined) existingButIsNotActive.address = address;
            existingButIsNotActive.isMainStorage = forceMain;
            saved = await locations.save(existingButIsNotActive);
          } else {
            saved = await locations.save(
              locations.create({
                name,
                code,
                address,
                isMainStorage: forceMain,
                isActive: isActive !== undefined ? isActive : true,
                merchantId: merchant_id,
              }),
            );
          }
          await this.initializeRawMaterialStockForNewLocation(
            manager,
            saved.id,
            merchant_id,
          );
          return saved.id;
        },
      );
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
    return this.findOne(locationId, merchant_id, 'Created');
  }

  async findAll(
    query: GetLocationsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedLocations> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 2. Build query with filters
    const queryBuilder = this.locationRepository
      .createQueryBuilder('location')
      .leftJoinAndSelect('location.merchant', 'merchant')
      .where('location.merchantId = :merchantId', { merchantId });

    // 3. Apply optional filters
    if (query.name) {
      queryBuilder.andWhere('LOWER(location.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    // 4. Get total records
    const total = await queryBuilder.getCount();

    // 5. Apply pagination and sorting
    const locations = await queryBuilder
      .orderBy('location.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 6. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // A read never writes: the main location is kept by create/update/remove. (This used
    // to promote the first location of the current page when the page had no main one, so
    // listing page 2 or filtering by name created a second main location.)

    // 7. Map to LocationResponseDto
    const data: LocationResponseDto[] = await Promise.all(
      locations.map((location) => {
        const result: LocationResponseDto = {
          id: location.id,
          name: location.name,
          code: location.code,
          address: location.address,
          isMainStorage: location.isMainStorage,
          isActive: location.isActive,
          merchant: location.merchant
            ? {
                id: location.merchant.id,
                name: location.merchant.name,
              }
            : null,
        };
        return result;
      }),
    );

    return {
      statusCode: 200,
      message: 'Locations retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(
    id: number,
    merchantId?: number,
    createdUpdateDelete?: string,
  ): Promise<OneLocationResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Location ID is incorrect');
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

    const location = await this.locationRepository.findOne({
      where: whereCondition,
      relations: ['merchant'],
    });
    if (!location) ErrorHandler.notFound(ErrorMessage.LOCATION_NOT_FOUND);

    const dataForResponse: LocationResponseDto = {
      id: location.id,
      name: location.name,
      code: location.code,
      address: location.address,
      isMainStorage: location.isMainStorage,
      isActive: location.isActive,
      merchant: location.merchant
        ? {
            id: location.merchant.id,
            name: location.merchant.name,
          }
        : null,
    };

    let response: OneLocationResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Location ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 200,
          message: `Location ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 200,
          message: `Location ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Location retrieved successfully',
          data: dataForResponse,
        };
        break;
    }
    return response;
  }

  async update(
    id: number,
    merchant_id: number,
    updateLocationDto: UpdateLocationDto,
  ): Promise<OneLocationResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Location ID is incorrect');
    }
    const { name, code, address, isMainStorage, isActive } = updateLocationDto;
    const location = await this.locationRepository.findOneBy({
      id,
      merchantId: merchant_id,
    });
    if (!location) ErrorHandler.notFound(ErrorMessage.LOCATION_NOT_FOUND);

    if (name || address) {
      const whereConditions: any[] = [];
      if (name)
        whereConditions.push({ name, merchantId: merchant_id, isActive: true });
      if (address)
        whereConditions.push({
          address,
          merchantId: merchant_id,
          isActive: true,
        });

      const existingLocation = await this.locationRepository.findOne({
        where: whereConditions,
      });

      if (existingLocation && existingLocation.id !== id) {
        if (name && existingLocation.name === name) {
          ErrorHandler.exists(ErrorMessage.LOCATION_NAME_EXISTS);
        }
        if (address && existingLocation.address === address) {
          ErrorHandler.exists(ErrorMessage.LOCATION_ADDRESS_EXISTS);
        }
      }
    }

    if (isActive === false) {
      await this.checkActiveStock(id);
    }

    try {
      await this.withMerchantLocationsLocked(merchant_id, async (manager) => {
        const locations = manager.getRepository(Location);

        let finalIsMainStorage = isMainStorage;
        if (isMainStorage === true) {
          await locations.update(
            { merchantId: merchant_id },
            { isMainStorage: false },
          );
        } else if (isMainStorage === false) {
          const otherMain = await locations.findOne({
            where: { merchantId: merchant_id, isMainStorage: true },
          });
          if (!otherMain || otherMain.id === id) {
            finalIsMainStorage = true;
          }
        }

        const updatePayload: any = {};
        if (name !== undefined) updatePayload.name = name;
        if (code !== undefined) updatePayload.code = code;
        if (address !== undefined) updatePayload.address = address;
        if (finalIsMainStorage !== undefined)
          updatePayload.isMainStorage = finalIsMainStorage;
        if (isActive !== undefined) updatePayload.isActive = isActive;

        Object.assign(location, updatePayload);

        // A deactivated location cannot stay the main one
        if (location.isActive === false && location.isMainStorage) {
          location.isMainStorage = false;
        }
        await locations.save(location);
        await this.handOverMainStorage(manager, merchant_id);
      });
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
    return this.findOne(id, merchant_id, 'Updated');
  }

  async remove(id: number, merchant_id: number): Promise<OneLocationResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Location ID is incorrect');
    }
    const location = await this.locationRepository.findOneBy({
      id,
      isActive: true,
      merchantId: merchant_id,
    });
    if (!location) ErrorHandler.notFound(ErrorMessage.LOCATION_NOT_FOUND);

    await this.checkActiveStock(id);

    location.isActive = false;
    location.isMainStorage = false;

    try {
      await this.withMerchantLocationsLocked(merchant_id, async (manager) => {
        await manager.getRepository(Location).save(location);
        await this.handOverMainStorage(manager, merchant_id);
      });
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
    return this.findOne(id, merchant_id, 'Deleted');
  }
}
