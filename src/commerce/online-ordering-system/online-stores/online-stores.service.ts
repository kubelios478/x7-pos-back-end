import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  Like,
  type FindOptionsOrder,
  type FindOptionsWhere,
} from 'typeorm';
// Se importa desde la raíz del paquete: el `exports` de typeorm no publica la ruta
// profunda `typeorm/query-builder/QueryPartialEntity`, así que tsc la resolvía pero jest no.
import type { QueryDeepPartialEntity } from 'typeorm';
import { OnlineStore } from './entities/online-store.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { CreateOnlineStoreDto } from './dto/create-online-store.dto';
import { UpdateOnlineStoreDto } from './dto/update-online-store.dto';
import {
  GetOnlineStoreQueryDto,
  OnlineStoreSortBy,
} from './dto/get-online-store-query.dto';
import {
  OnlineStoreResponseDto,
  OneOnlineStoreResponseDto,
} from './dto/online-store-response.dto';
import { PaginatedOnlineStoreResponseDto } from './dto/paginated-online-store-response.dto';
import { OnlineStoreStatus } from './constants/online-store-status.enum';

@Injectable()
export class OnlineStoresService {
  constructor(
    @InjectRepository(OnlineStore)
    private readonly onlineStoreRepository: Repository<OnlineStore>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  private normalizeAndValidateSubdomain(rawSubdomain: string): string {
    if (!rawSubdomain || typeof rawSubdomain !== 'string') {
      throw new BadRequestException('Subdomain cannot be empty');
    }

    // Normalization: lowercase, trim, replace spaces/underscores with hyphens, strip invalid characters
    const normalized = rawSubdomain
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '');

    if (!normalized || normalized.length === 0) {
      throw new BadRequestException('Subdomain must contain valid alphanumeric characters');
    }

    if (normalized.length > 100) {
      throw new BadRequestException('Subdomain cannot exceed 100 characters');
    }

    // DNS compliance: only lowercase alphanumeric and hyphens, cannot start or end with a hyphen
    const dnsPattern = /^[a-z0-9]([a-z0-9-]{0,98}[a-z0-9])?$/;
    if (!dnsPattern.test(normalized)) {
      throw new BadRequestException(
        'Subdomain must be DNS compliant (only lowercase letters, numbers, and hyphens; cannot start or end with a hyphen)',
      );
    }

    return normalized;
  }

  async create(
    createOnlineStoreDto: CreateOnlineStoreDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineStoreResponseDto> {
    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create online stores',
      );
    }

    // Validate merchant exists
    const merchant = await this.merchantRepository.findOne({
      where: { id: authenticatedUserMerchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // Subdomain normalization & DNS compliance validation
    const normalizedSubdomain = this.normalizeAndValidateSubdomain(
      createOnlineStoreDto.subdomain,
    );

    // Business rule validation: subdomain must be strictly unique across the platform
    const existingStore = await this.onlineStoreRepository.findOne({
      where: {
        subdomain: normalizedSubdomain,
        status: OnlineStoreStatus.ACTIVE,
      },
    });

    if (existingStore) {
      throw new ConflictException(
        `An online store with subdomain '${normalizedSubdomain}' already exists`,
      );
    }

    // Localization defaults & theme setup
    const theme = (createOnlineStoreDto.theme || 'default').trim();
    if (theme.length > 100) {
      throw new BadRequestException('Theme cannot exceed 100 characters');
    }

    const currency = (createOnlineStoreDto.currency || 'USD')
      .trim()
      .toUpperCase();
    if (currency.length > 10) {
      throw new BadRequestException('Currency cannot exceed 10 characters');
    }

    const timezone = (
      createOnlineStoreDto.timezone || 'America/New_York'
    ).trim();
    if (timezone.length > 50) {
      throw new BadRequestException('Timezone cannot exceed 50 characters');
    }

    const isActive =
      createOnlineStoreDto.is_active !== undefined
        ? createOnlineStoreDto.is_active
        : true;

    // Create online store
    const onlineStore = new OnlineStore();
    onlineStore.merchant_id = authenticatedUserMerchantId;
    onlineStore.subdomain = normalizedSubdomain;
    onlineStore.is_active = isActive;
    onlineStore.theme = theme;
    onlineStore.currency = currency;
    onlineStore.timezone = timezone;
    onlineStore.status = OnlineStoreStatus.ACTIVE;

    const savedOnlineStore = await this.onlineStoreRepository.save(onlineStore);

    // Fetch the complete online store with relations
    const completeOnlineStore = await this.onlineStoreRepository.findOne({
      where: { id: savedOnlineStore.id },
      relations: ['merchant'],
    });

    if (!completeOnlineStore) {
      throw new NotFoundException('Online store not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Online store created successfully',
      data: this.formatOnlineStoreResponse(completeOnlineStore),
    };
  }

  async findAll(
    query: GetOnlineStoreQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedOnlineStoreResponseDto> {
    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access online stores',
      );
    }

    // Validate pagination parameters
    if (query.page && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (query.limit && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    // Validate date format if provided
    if (query.createdDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.createdDate)) {
        throw new BadRequestException(
          'Created date must be in YYYY-MM-DD format',
        );
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where conditions
    const whereConditions: FindOptionsWhere<OnlineStore> = {
      merchant_id: authenticatedUserMerchantId,
      status: query.status || OnlineStoreStatus.ACTIVE,
    };

    if (query.subdomain) {
      whereConditions.subdomain = Like(`%${query.subdomain.toLowerCase()}%`);
    }

    if (query.theme) {
      whereConditions.theme = Like(`%${query.theme}%`);
    }

    if (query.currency) {
      whereConditions.currency = query.currency.toUpperCase();
    }

    if (query.isActive !== undefined) {
      whereConditions.is_active = query.isActive;
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      whereConditions.created_at = Between(startDate, endDate);
    }

    // Build order conditions
    const sortDir = query.sortOrder || 'DESC';
    let orderConditions: FindOptionsOrder<OnlineStore>;
    if (query.sortBy) {
      switch (query.sortBy) {
        case OnlineStoreSortBy.SUBDOMAIN:
          orderConditions = { subdomain: sortDir };
          break;
        case OnlineStoreSortBy.THEME:
          orderConditions = { theme: sortDir };
          break;
        case OnlineStoreSortBy.CREATED_AT:
          orderConditions = { created_at: sortDir };
          break;
        case OnlineStoreSortBy.UPDATED_AT:
          orderConditions = { updated_at: sortDir };
          break;
        default:
          orderConditions = { id: sortDir };
      }
    } else {
      orderConditions = { created_at: 'DESC' };
    }

    // Execute query
    const [onlineStores, total] = await this.onlineStoreRepository.findAndCount(
      {
        where: whereConditions,
        relations: ['merchant'],
        order: orderConditions,
        skip,
        take: limit,
      },
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    return {
      statusCode: 200,
      message: 'Online stores retrieved successfully',
      data: onlineStores.map((store) => this.formatOnlineStoreResponse(store)),
      paginationMeta,
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineStoreResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online store ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access online stores',
      );
    }

    // Find online store
    const onlineStore = await this.onlineStoreRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: OnlineStoreStatus.ACTIVE,
      },
      relations: ['merchant'],
    });

    if (!onlineStore) {
      throw new NotFoundException('Online store not found');
    }

    return {
      statusCode: 200,
      message: 'Online store retrieved successfully',
      data: this.formatOnlineStoreResponse(onlineStore),
    };
  }

  async update(
    id: number,
    updateOnlineStoreDto: UpdateOnlineStoreDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineStoreResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online store ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update online stores',
      );
    }

    // Find existing online store
    const existingOnlineStore = await this.onlineStoreRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: OnlineStoreStatus.ACTIVE,
      },
      relations: ['merchant'],
    });

    if (!existingOnlineStore) {
      throw new NotFoundException('Online store not found');
    }

    // Business rule validation: subdomain normalization & platform-wide uniqueness
    let normalizedSubdomain: string | undefined;
    if (updateOnlineStoreDto.subdomain !== undefined) {
      normalizedSubdomain = this.normalizeAndValidateSubdomain(
        updateOnlineStoreDto.subdomain,
      );

      // Check global uniqueness across the platform if subdomain is being changed
      if (normalizedSubdomain !== existingOnlineStore.subdomain) {
        const existingStore = await this.onlineStoreRepository.findOne({
          where: {
            subdomain: normalizedSubdomain,
            status: OnlineStoreStatus.ACTIVE,
          },
        });

        if (existingStore && existingStore.id !== id) {
          throw new ConflictException(
            `An online store with subdomain '${normalizedSubdomain}' already exists`,
          );
        }
      }
    }

    // Business rule validation: theme must not be empty if provided
    if (updateOnlineStoreDto.theme !== undefined) {
      if (
        !updateOnlineStoreDto.theme ||
        updateOnlineStoreDto.theme.trim().length === 0
      ) {
        throw new BadRequestException('Theme cannot be empty');
      }
      if (updateOnlineStoreDto.theme.length > 100) {
        throw new BadRequestException('Theme cannot exceed 100 characters');
      }
    }

    // Business rule validation: currency must not be empty if provided
    if (updateOnlineStoreDto.currency !== undefined) {
      if (
        !updateOnlineStoreDto.currency ||
        updateOnlineStoreDto.currency.trim().length === 0
      ) {
        throw new BadRequestException('Currency cannot be empty');
      }
      if (updateOnlineStoreDto.currency.length > 10) {
        throw new BadRequestException('Currency cannot exceed 10 characters');
      }
    }

    // Business rule validation: timezone must not be empty if provided
    if (updateOnlineStoreDto.timezone !== undefined) {
      if (
        !updateOnlineStoreDto.timezone ||
        updateOnlineStoreDto.timezone.trim().length === 0
      ) {
        throw new BadRequestException('Timezone cannot be empty');
      }
      if (updateOnlineStoreDto.timezone.length > 50) {
        throw new BadRequestException('Timezone cannot exceed 50 characters');
      }
    }

    // Update online store
    const updateData: QueryDeepPartialEntity<OnlineStore> = {};
    if (normalizedSubdomain !== undefined)
      updateData.subdomain = normalizedSubdomain;
    if (updateOnlineStoreDto.isActive !== undefined)
      updateData.is_active = updateOnlineStoreDto.isActive;
    if (updateOnlineStoreDto.theme !== undefined)
      updateData.theme = updateOnlineStoreDto.theme.trim();
    if (updateOnlineStoreDto.currency !== undefined)
      updateData.currency = updateOnlineStoreDto.currency.trim().toUpperCase();
    if (updateOnlineStoreDto.timezone !== undefined)
      updateData.timezone = updateOnlineStoreDto.timezone.trim();

    await this.onlineStoreRepository.update(id, updateData);

    // Fetch updated online store
    const updatedOnlineStore = await this.onlineStoreRepository.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!updatedOnlineStore) {
      throw new NotFoundException('Online store not found after update');
    }

    return {
      statusCode: 200,
      message: 'Online store updated successfully',
      data: this.formatOnlineStoreResponse(updatedOnlineStore),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineStoreResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online store ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete online stores',
      );
    }

    // Find existing online store
    const existingOnlineStore = await this.onlineStoreRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: OnlineStoreStatus.ACTIVE,
      },
      relations: ['merchant'],
    });

    if (!existingOnlineStore) {
      throw new NotFoundException('Online store not found');
    }

    // Check if already deleted
    if (existingOnlineStore.status === OnlineStoreStatus.DELETED) {
      throw new ConflictException('Online store is already deleted');
    }

    // Perform logical deletion
    existingOnlineStore.status = OnlineStoreStatus.DELETED;
    await this.onlineStoreRepository.save(existingOnlineStore);

    return {
      statusCode: 200,
      message: 'Online store deleted successfully',
      data: this.formatOnlineStoreResponse(existingOnlineStore),
    };
  }

  private formatOnlineStoreResponse(
    onlineStore: OnlineStore,
  ): OnlineStoreResponseDto {
    return {
      id: onlineStore.id,
      merchantId: onlineStore.merchant_id,
      merchant: {
        id: onlineStore.merchant.id,
        name: onlineStore.merchant.name,
      },
      subdomain: onlineStore.subdomain,
      isActive: onlineStore.is_active,
      theme: onlineStore.theme,
      currency: onlineStore.currency,
      timezone: onlineStore.timezone,
      status: onlineStore.status,
      createdAt: onlineStore.created_at,
      updatedAt: onlineStore.updated_at,
    };
  }
}
