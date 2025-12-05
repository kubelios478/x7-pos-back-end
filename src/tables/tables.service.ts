import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Table } from './entities/table.entity';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { TableResponseDto, OneTableResponseDto } from './dto/table-response.dto';
import { GetTablesQueryDto } from './dto/get-tables-query.dto';
import { PaginatedTablesResponseDto } from './dto/paginated-tables-response.dto';
import { Merchant } from '../merchants/entities/merchant.entity';
// import { IsUniqueField } from '../validators/is-unique-field.validator';
@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepo: Repository<Table>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    private readonly entityManager: EntityManager,
  ) {}

  async create(
    dto: CreateTableDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneTableResponseDto> {
    // 1. Validate that the authenticated user has merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to create tables',
      );
    }

    // 2. Validate that the user can only create tables for their own merchant
    const dtoMerchantId = Number(dto.merchant_id);
    const userMerchantId = Number(authenticatedUserMerchantId);

    if (dtoMerchantId !== userMerchantId) {
      throw new ForbiddenException(
        'You can only create tables for your own merchant',
      );
    }

    // 3. Validate that the merchant exists
    const merchant = await this.merchantRepo.findOne({
      where: { id: dto.merchant_id },
    });
    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${dto.merchant_id} not found`,
      );
    }

    // 4. Validate uniqueness of table number within the merchant
    const existingTable = await this.tableRepo
      .createQueryBuilder('table')
      .where('table.number = :number', { number: dto.number })
      .andWhere('table.merchant = :merchantId', { merchantId: dto.merchant_id })
      .getOne();

    if (existingTable) {
      throw new ConflictException(
        `Table number '${dto.number}' already exists for merchant ${dto.merchant_id}`,
      );
    }

    // 5. Business rule validations
    if (dto.capacity <= 0) {
      throw new BadRequestException('Table capacity must be greater than 0');
    }

    // 6. Create the table
    const table = this.tableRepo.create({
      merchant: { id: dto.merchant_id } as Merchant,
      number: dto.number,
      capacity: dto.capacity,
      status: dto.status,
      location: dto.location,
    } as Partial<Table>);

    const savedTable = await this.tableRepo.save(table);

    // 7. Return response with merchant information (without dates)
    return {
      statusCode: 201,
      message: 'Table created successfully',
      data: {
        id: savedTable.id,
        merchant_id: savedTable.merchant_id,
        number: savedTable.number,
        capacity: savedTable.capacity,
        status: savedTable.status,
        location: savedTable.location,
        merchant: {
          id: merchant.id,
          name: merchant.name,
        },
      },
    };
  }

  async findAll(
    query: GetTablesQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedTablesResponseDto> {
    // 1. Validate that the authenticated user has merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to view tables',
      );
    }

    // 2. Validate that the merchant exists
    const merchant = await this.merchantRepo.findOne({
      where: { id: authenticatedUserMerchantId },
    });
    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${authenticatedUserMerchantId} not found`,
      );
    }

    // 3. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 4. Build query with filters
    const queryBuilder = this.tableRepo
      .createQueryBuilder('table')
      .leftJoinAndSelect('table.merchant', 'merchant')
      .where('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      });

    // 5. Apply optional filters
    if (query.status) {
      queryBuilder.andWhere('table.status = :status', { status: query.status });
    }

    if (query.minCapacity !== undefined) {
      queryBuilder.andWhere('table.capacity >= :minCapacity', {
        minCapacity: query.minCapacity,
      });
    }

    if (query.maxCapacity !== undefined) {
      queryBuilder.andWhere('table.capacity <= :maxCapacity', {
        maxCapacity: query.maxCapacity,
      });
    }

    // 6. Validate that minCapacity is not greater than maxCapacity
    if (query.minCapacity !== undefined && query.maxCapacity !== undefined) {
      if (query.minCapacity > query.maxCapacity) {
        throw new BadRequestException(
          'Minimum capacity cannot be greater than maximum capacity',
        );
      }
    }

    // 7. Get total records
    const total = await queryBuilder.getCount();

    // 8. Apply pagination and sorting
    const tables = await queryBuilder
      .orderBy('table.number', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 9. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 10. Map to TableResponseDto (without dates, with merchant info)
    const data: TableResponseDto[] = tables.map((table) => ({
      id: table.id,
      merchant_id: table.merchant_id,
      number: table.number,
      capacity: table.capacity,
      status: table.status,
      location: table.location,
      merchant: {
        id: table.merchant.id,
        name: table.merchant.name,
      },
    }));

    return {
      statusCode: 200,
      message: 'Tables retrieved successfully',
      data,
      paginationMeta: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneTableResponseDto> {
    
    // 1. Validate that the authenticated user has merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to view tables',
      );
    }

    // 2. Validate that the ID is valid
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid table ID');
    }

    // 3. Search for the table
    const table = await this.tableRepo.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!table) {
      throw new NotFoundException(`Table ${id} not found`);
    }

    // 4. Validate that the user can only see tables from their own merchant
    if (table.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only view tables from your own merchant',
      );
    }

    

    // 4. Validate that the merchant exists (we already know that table.merchant = authenticatedUserMerchantId)
    const merchant = await this.merchantRepo.findOne({
      where: { id: authenticatedUserMerchantId },
    });

    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${authenticatedUserMerchantId} not found`,
      );
    }

    // 7. Return response with merchant information (without dates)
    return {
      statusCode: 200,
      message: 'Table retrieved successfully',
      data: {
        id: table.id,
        merchant_id: table.merchant_id,
        number: table.number,
        capacity: table.capacity,
        status: table.status,
        location: table.location,
        merchant: {
          id: table.merchant.id,
          name: table.merchant.name,
        },
      },
    };
  }

  async update(
    id: number,
    dto: UpdateTableDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneTableResponseDto> {
    
    // 0. Validate that the DTO exists and is not empty
    if (!dto || (typeof dto === 'object' && Object.keys(dto).length === 0)) {
      throw new BadRequestException('Update data is required');
    }

    // 0.1. Validate that at least one valid field is present
    const validFields = ['number', 'capacity', 'status', 'location'];
    const hasValidField = validFields.some((field) => dto[field] !== undefined);

    if (!hasValidField) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    // 1. Validate that the authenticated user has merchant_id (User permissions)
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to update tables',
      );
    }

    // 2. Validate that the ID is valid (Validate that the id parameter is valid)
    if (!id || id <= 0 || !Number.isInteger(id)) {
      throw new BadRequestException('Invalid table ID');
    }

    // 3. Search for the existing table (Validate the existence of the record)
    const table = await this.tableRepo.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!table) {
      throw new NotFoundException(`Table ${id} not found`);
    }


    // 4. Validate that the user can only modify tables of their own merchant (User permissions)
    if (table.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only update tables from your own merchant',
      );
    }

    // 5. Validate that merchant_id is not being modified (The merchant value cannot be modified)
    // Note: merchant_id is not present in UpdateTableDto, so this validation is no longer necessary

    // 6. Validate fields and types (Validate allowed fields and types)
    if (dto.capacity !== undefined) {
      if (!Number.isInteger(dto.capacity) || dto.capacity <= 0) {
        throw new BadRequestException(
          'Table capacity must be a positive integer',
        );
      }
    }

    if (dto.status !== undefined) {
      if (typeof dto.status !== 'string' || dto.status.trim() === '') {
        throw new BadRequestException('Status must be a non-empty string');
      }
    }

    if (dto.location !== undefined) {
      if (typeof dto.location !== 'string' || dto.location.trim() === '') {
        throw new BadRequestException('Location must be a non-empty string');
      }
    }

    if (dto.number !== undefined) {
      if (typeof dto.number !== 'string' || dto.number.trim() === '') {
        throw new BadRequestException(
          'Table number must be a non-empty string',
        );
      }
    }

    // 7. Validate uniqueness if updating the number field
    if (dto.number !== undefined && dto.number !== table.number) {
      const existingTable = await this.tableRepo
        .createQueryBuilder('table')
        .leftJoin('table.merchant', 'merchant')
        .where('table.number = :number', { number: dto.number })
        .andWhere('merchant.id = :merchantId', {
          merchantId: table.merchant.id,
        })
        .getOne();

      if (existingTable && existingTable.id !== id) {
        throw new ConflictException(
          `Table number '${dto.number}' already exists for your merchant`,
        );
      }
    }

    // 8. Validate that the merchant exists (Validate the existence of related entities)
    const merchant = await this.merchantRepo.findOne({
      where: { id: table.merchant.id },
    });
    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${table.merchant.id} not found`,
      );
    }

    
    // 9. Prepare data for update
    const updateData: Partial<{
      number: string;
      capacity: number;
      status: string;
      location: string;
    }> = {};
    if (dto.number !== undefined) updateData.number = dto.number.trim();
    if (dto.capacity !== undefined) updateData.capacity = dto.capacity;
    if (dto.status !== undefined) updateData.status = dto.status.trim();
    if (dto.location !== undefined) updateData.location = dto.location.trim();

    
    // 10. Verify that there is at least one field to update
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    // 11. Update the table
    Object.assign(table, updateData);
    const updatedTable = await this.tableRepo.save(table);

    
    // 12. Return response with merchant information (without dates)
    return {
      statusCode: 200,
      message: 'Table updated successfully',
      data: {
        id: updatedTable.id,
        merchant_id: table.merchant_id, // Use table.merchant_id directly
        number: updatedTable.number,
        capacity: updatedTable.capacity,
        status: updatedTable.status,
        location: updatedTable.location,
        merchant: {
          id: merchant.id,
          name: merchant.name,
        },
      },
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneTableResponseDto> {
    
    // 1. Validate that the authenticated user has merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to delete tables',
      );
    }

    // 2. Validate that the ID is valid
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid table ID');
    }

    // 3. Find the table
    const table = await this.tableRepo.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!table) {
      throw new NotFoundException(`Table ${id} not found`);
    }

    // 4. Validate that the user can only delete tables of their own merchant
    if (table.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only delete tables from your own merchant',
      );
    }

      
    // 6. Validate that the table is not already deleted
    if (table.status === 'deleted') {
      throw new ConflictException('Table is already deleted');
    }

    // 7. Validate dependencies (here you can add specific validations)
    // For example, check if there are active orders, reservations, etc.
    // const activeOrders = await this.orderRepo.count({ where: { table_id: id, status: 'active' } });
    // if (activeOrders > 0) {
    //   throw new ConflictException('Cannot delete table with active orders');
    // }

    // 8. Get merchant information for the response (we already know that authenticatedUserMerchantId = table.merchant)
    const merchant = await this.merchantRepo.findOne({
      where: { id: authenticatedUserMerchantId },
    });
    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${authenticatedUserMerchantId} not found`,
      );
    }

    // 9. Soft delete - change status to 'deleted'
    table.status = 'deleted';
    const updatedTable = await this.tableRepo.save(table);

    // 10. Return response with merchant information (without dates)
    return {
      statusCode: 200,
      message: 'Table deleted successfully',
      data: {
        id: updatedTable.id,
        merchant_id: table.merchant_id,
        number: updatedTable.number,
        capacity: updatedTable.capacity,
        status: updatedTable.status,
        location: updatedTable.location,
        merchant: {
          id: table.merchant.id,
          name: table.merchant.name,
        },
      },
    };
  }
}
