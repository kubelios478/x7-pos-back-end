import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { GetLocationsQueryDto } from './dto/get-locations-query.dto';
import { AllPaginatedLocations } from './dto/all-paginated-locations.dto';
import { Location } from './entities/location.entity';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import {
  LocationResponseDto,
  OneLocationResponse,
} from './dto/location-response.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  async create(
    user: AuthenticatedUser,
    createLocationDto: CreateLocationDto,
  ): Promise<OneLocationResponse> {
    const { ...location } = createLocationDto;

    if (location.merchantId !== user.merchant.id) {
      console.log('error');
      ErrorHandler.differentMerchant();
    }

    const existingLocation = await this.locationRepository.findOne({
      where: {
        ...location,
        isActive: true,
      },
    });

    if (existingLocation)
      ErrorHandler.exists(ErrorMessage.LOCATION_NAME_EXISTS);

    if (location.merchantId) {
      const merchant = await this.merchantRepo.findOne({
        where: { id: location.merchantId },
      });
      if (!merchant) ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
    }

    try {
      const existingButIsNotActive = await this.locationRepository.findOne({
        where: { ...location, isActive: false },
      });

      if (existingButIsNotActive) {
        existingButIsNotActive.isActive = true;
        await this.locationRepository.save(existingButIsNotActive);
        return this.findOne(existingButIsNotActive.id, undefined, 'Created');
      } else {
        const newLocation = this.locationRepository.create({
          ...location,
        });
        const savedLocation = await this.locationRepository.save(newLocation);
        return this.findOne(savedLocation.id, undefined, 'Created');
      }
    } catch (error) {
      console.log(error);
      ErrorHandler.handleDatabaseError(error);
    }
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
      .where('location.merchantId = :merchantId', { merchantId })
      .andWhere('location.isActive = :isActive', { isActive: true });

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

    // 7. Map to LocationResponseDto
    const data: LocationResponseDto[] = await Promise.all(
      locations.map((location) => {
        const result: LocationResponseDto = {
          id: location.id,
          name: location.name,
          address: location.address,
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
      ErrorHandler.invalidId('Location ID id incorrect');
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
      address: location.address,
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
          message: `Category ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 201,
          message: `Location ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
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
    user: AuthenticatedUser,
    id: number,
    updateLocationDto: UpdateLocationDto,
  ): Promise<OneLocationResponse> {
    const location = await this.locationRepository.findOneBy({
      id,
      isActive: true,
    });
    if (!location) ErrorHandler.notFound(ErrorMessage.LOCATION_NOT_FOUND);

    if (user.merchant.id !== location.merchantId)
      ErrorHandler.differentMerchant();

    if (
      updateLocationDto.merchantId !== undefined &&
      updateLocationDto.merchantId !== location.merchantId
    )
      ErrorHandler.changedMerchant();

    const { name, address, ...restOfUpdateData } = updateLocationDto;

    if (name !== undefined && name !== location.name) {
      const existingLocation = await this.locationRepository.findOne({
        where: { name, merchantId: location.merchantId, isActive: true },
      });
      if (existingLocation)
        ErrorHandler.exists(ErrorMessage.LOCATION_NAME_EXISTS);
    }

    Object.assign(location, { name, address, ...restOfUpdateData });

    try {
      await this.locationRepository.save(location);
      return this.findOne(id, undefined, 'Updated');
    } catch (error) {
      console.log(error);
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    user: AuthenticatedUser,
    id: number,
  ): Promise<OneLocationResponse> {
    const location = await this.locationRepository.findOneBy({
      id,
      isActive: true,
    });
    if (!location) ErrorHandler.notFound(ErrorMessage.LOCATION_NOT_FOUND);

    if (user.merchant.id !== location.merchantId) {
      ErrorHandler.differentMerchant();
    }

    location.isActive = false;

    try {
      await this.locationRepository.save(location);
      return this.findOne(id, undefined, 'Deleted');
    } catch (error) {
      console.log(error);
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
