import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from './entities/location.entity';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import {
  AllLocationResponse,
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

  async findAll(merchantId: number): Promise<AllLocationResponse> {
    const locations = await this.locationRepository.find({
      where: { merchantId, isActive: true }, // Filter by isActive
      relations: ['merchant'],
    });
    const locationResponseDtos: LocationResponseDto[] = await Promise.all(
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
      message: 'Categories retrieved successfully',
      data: locationResponseDtos,
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
