import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GetSuppliersQueryDto } from './dto/get-suppliers-query.dto';
import { AllPaginatedSuppliers } from './dto/all-paginated-suppliers.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  async create(
    user: AuthenticatedUser,
    createSupplierDto: CreateSupplierDto,
  ): Promise<SupplierResponseDto> {
    const newSupplier = this.supplierRepository.create({
      ...createSupplierDto,
      merchantId: user.merchant.id,
    });
    const savedSupplier = await this.supplierRepository.save(newSupplier);
    return this.mapToSupplierResponseDto(savedSupplier);
  }

  async findAll(
    query: GetSuppliersQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedSuppliers> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 2. Build query with filters
    const queryBuilder = this.supplierRepository
      .createQueryBuilder('supplier')
      .leftJoinAndSelect('supplier.merchant', 'merchant')
      .where('supplier.merchantId = :merchantId', { merchantId });

    // 3. Apply optional filters
    if (query.name) {
      queryBuilder.andWhere('LOWER(supplier.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    // 4. Get total records
    const total = await queryBuilder.getCount();

    // 5. Apply pagination and sorting
    const suppliers = await queryBuilder
      .orderBy('supplier.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 6. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 7. Map to SupplierResponseDto
    const data: SupplierResponseDto[] = suppliers.map((supplier) =>
      this.mapToSupplierResponseDto(supplier),
    );

    return {
      statusCode: 200,
      message: 'Suppliers retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(id: number, merchantId: number): Promise<SupplierResponseDto> {
    const supplier = await this.supplierRepository.findOne({
      where: { id, merchantId },
      relations: ['merchant'],
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return this.mapToSupplierResponseDto(supplier);
  }

  async update(
    user: AuthenticatedUser,
    id: number,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    const supplier = await this.supplierRepository.findOne({
      where: { id, merchantId: user.merchant.id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    Object.assign(supplier, updateSupplierDto);
    const updatedSupplier = await this.supplierRepository.save(supplier);
    return this.mapToSupplierResponseDto(updatedSupplier);
  }

  async remove(user: AuthenticatedUser, id: number): Promise<void> {
    const supplier = await this.supplierRepository.findOne({
      where: { id, merchantId: user.merchant.id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    await this.supplierRepository.remove(supplier);
  }

  private mapToSupplierResponseDto(supplier: Supplier): SupplierResponseDto {
    return {
      id: supplier.id,
      name: supplier.name,
      contactInfo: supplier.contactInfo,
      isActive: supplier.isActive,
      merchant: {
        id: supplier.merchant.id,
        name: supplier.merchant.name,
      },
    };
  }
}
