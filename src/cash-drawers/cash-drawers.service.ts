import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, IsNull } from 'typeorm';
import { CashDrawer } from './entities/cash-drawer.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { Collaborator } from '../collaborators/entities/collaborator.entity';
import { CreateCashDrawerDto } from './dto/create-cash-drawer.dto';
import { UpdateCashDrawerDto } from './dto/update-cash-drawer.dto';
import { GetCashDrawersQueryDto } from './dto/get-cash-drawers-query.dto';
import { CashDrawerResponseDto, OneCashDrawerResponseDto, AllCashDrawersResponseDto } from './dto/cash-drawer-response.dto';
import { PaginatedCashDrawersResponseDto } from './dto/paginated-cash-drawers-response.dto';
import { CashDrawerStatus } from './constants/cash-drawer-status.enum';

@Injectable()
export class CashDrawersService {
  constructor(
    @InjectRepository(CashDrawer)
    private readonly cashDrawerRepository: Repository<CashDrawer>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepository: Repository<Collaborator>,
  ) {}

  async create(createCashDrawerDto: CreateCashDrawerDto, authenticatedUserMerchantId: number): Promise<OneCashDrawerResponseDto> {
    console.log('Creating cash drawer:', { createCashDrawerDto, authenticatedUserMerchantId });

    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      console.log('User does not have merchant ID');
      throw new ForbiddenException('You must be associated with a merchant to create cash drawers');
    }

    // Validate shift exists and belongs to merchant
    const shift = await this.shiftRepository.findOne({
      where: { id: createCashDrawerDto.shiftId },
      relations: ['merchant'],
    });

    if (!shift) {
      console.log('Shift not found:', createCashDrawerDto.shiftId);
      throw new NotFoundException('Shift not found');
    }

    if (shift.merchant.id !== authenticatedUserMerchantId) {
      console.log('Shift does not belong to merchant:', { shiftMerchantId: shift.merchant.id, authenticatedUserMerchantId });
      throw new ForbiddenException('You can only create cash drawers for shifts belonging to your merchant');
    }

    // Validate opened by collaborator exists and belongs to merchant
    const openedByCollaborator = await this.collaboratorRepository.findOne({
      where: { id: createCashDrawerDto.openedBy },
    });

    if (!openedByCollaborator) {
      console.log('Opened by collaborator not found:', createCashDrawerDto.openedBy);
      throw new NotFoundException('Opened by collaborator not found');
    }

    if (openedByCollaborator.merchant_id !== authenticatedUserMerchantId) {
      console.log('Opened by collaborator does not belong to merchant:', { collaboratorMerchantId: openedByCollaborator.merchant_id, authenticatedUserMerchantId });
      throw new ForbiddenException('You can only assign collaborators from your merchant');
    }

    // Validate closed by collaborator if provided
    if (createCashDrawerDto.closedBy) {
      const closedByCollaborator = await this.collaboratorRepository.findOne({
        where: { id: createCashDrawerDto.closedBy },
      });

      if (!closedByCollaborator) {
        console.log('Closed by collaborator not found:', createCashDrawerDto.closedBy);
        throw new NotFoundException('Closed by collaborator not found');
      }

      if (closedByCollaborator.merchant_id !== authenticatedUserMerchantId) {
        console.log('Closed by collaborator does not belong to merchant:', { collaboratorMerchantId: closedByCollaborator.merchant_id, authenticatedUserMerchantId });
        throw new ForbiddenException('You can only assign collaborators from your merchant');
      }
    }

    // Business rule validation: Check if there's already an open cash drawer for this shift
    const existingOpenCashDrawer = await this.cashDrawerRepository.findOne({
      where: {
        shift_id: createCashDrawerDto.shiftId,
        status: CashDrawerStatus.OPEN,
      },
    });

    if (existingOpenCashDrawer) {
      console.log('Cash drawer already open for this shift:', createCashDrawerDto.shiftId);
      throw new ConflictException('There is already an open cash drawer for this shift');
    }

    // Business rule validation: Opening balance must be non-negative
    if (createCashDrawerDto.openingBalance < 0) {
      console.log('Invalid opening balance:', createCashDrawerDto.openingBalance);
      throw new BadRequestException('Opening balance must be non-negative');
    }

    // Business rule validation: Closing balance must be non-negative if provided
    if (createCashDrawerDto.closingBalance !== undefined && createCashDrawerDto.closingBalance < 0) {
      console.log('Invalid closing balance:', createCashDrawerDto.closingBalance);
      throw new BadRequestException('Closing balance must be non-negative');
    }

    // If one of closingBalance/closedBy is provided without the other, it's invalid
    const providedClosingBalance = createCashDrawerDto.closingBalance !== undefined;
    const providedClosedBy = createCashDrawerDto.closedBy !== undefined;
    if ((providedClosingBalance && !providedClosedBy) || (!providedClosingBalance && providedClosedBy)) {
      throw new BadRequestException('Closing balance and closed by must be provided together to close the cash drawer');
    }

    // Create cash drawer
    const cashDrawer = new CashDrawer();
    cashDrawer.merchant_id = authenticatedUserMerchantId;
    cashDrawer.shift_id = createCashDrawerDto.shiftId;
    cashDrawer.opening_balance = createCashDrawerDto.openingBalance;
    cashDrawer.closing_balance = createCashDrawerDto.closingBalance || null;
    cashDrawer.opened_by = createCashDrawerDto.openedBy;
    cashDrawer.closed_by = createCashDrawerDto.closedBy || null;
    cashDrawer.status = providedClosingBalance && providedClosedBy ? CashDrawerStatus.CLOSED : CashDrawerStatus.OPEN;

    const savedCashDrawer = await this.cashDrawerRepository.save(cashDrawer);
    console.log('Cash drawer created successfully:', savedCashDrawer.id);

    // Fetch the complete cash drawer with relations
    const completeCashDrawer = await this.cashDrawerRepository.findOne({
      where: { id: savedCashDrawer.id },
      relations: ['merchant', 'shift', 'shift.merchant', 'openedByCollaborator', 'closedByCollaborator'],
    });

    if (!completeCashDrawer) {
      throw new NotFoundException('Cash drawer not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Cash drawer created successfully',
      data: this.formatCashDrawerResponse(completeCashDrawer),
    };
  }

  async findAll(query: GetCashDrawersQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedCashDrawersResponseDto> {
    console.log('Finding all cash drawers:', { query, authenticatedUserMerchantId });

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      console.log('User does not have merchant ID');
      throw new ForbiddenException('You must be associated with a merchant to access cash drawers');
    }

    // Validate pagination parameters
    if (query.page && query.page < 1) {
      console.log('Invalid page number:', query.page);
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (query.limit && (query.limit < 1 || query.limit > 100)) {
      console.log('Invalid limit:', query.limit);
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    // Validate date format if provided
    if (query.createdDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.createdDate)) {
        console.log('Invalid date format:', query.createdDate);
        throw new BadRequestException('Created date must be in YYYY-MM-DD format');
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where conditions
    const whereConditions: any = {
      merchant_id: authenticatedUserMerchantId,
      status: query.status || CashDrawerStatus.OPEN, // Default to OPEN, exclude DELETED unless explicitly requested
    };

    if (query.shiftId) {
      whereConditions.shift_id = query.shiftId;
    }

    if (query.openedBy) {
      whereConditions.opened_by = query.openedBy;
    }

    if (query.closedBy) {
      whereConditions.closed_by = query.closedBy;
    }

    // If status is explicitly provided, use it; otherwise exclude DELETED
    if (query.status !== undefined) {
      whereConditions.status = query.status;
    } else {
      whereConditions.status = CashDrawerStatus.OPEN; // Only show OPEN by default
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      whereConditions.created_at = Between(startDate, endDate);
    }

    // Build order conditions
    const orderConditions: any = {};
    if (query.sortBy) {
      const sortField = query.sortBy === 'openingBalance' ? 'opening_balance' :
                       query.sortBy === 'closingBalance' ? 'closing_balance' :
                       query.sortBy === 'createdAt' ? 'created_at' :
                       query.sortBy === 'updatedAt' ? 'updated_at' : 'id';
      orderConditions[sortField] = query.sortOrder || 'DESC';
    } else {
      orderConditions.created_at = 'DESC';
    }

    console.log('Query conditions:', { whereConditions, orderConditions, skip, limit });

    // Execute query
    const [cashDrawers, total] = await this.cashDrawerRepository.findAndCount({
      where: whereConditions,
      relations: ['merchant', 'shift', 'shift.merchant', 'openedByCollaborator', 'closedByCollaborator'],
      order: orderConditions,
      skip,
      take: limit,
    });

    console.log('Query results:', { count: cashDrawers.length, total });

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
      message: 'Cash drawers retrieved successfully',
      data: cashDrawers.map(cashDrawer => this.formatCashDrawerResponse(cashDrawer)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneCashDrawerResponseDto> {
    console.log('Finding cash drawer:', { id, authenticatedUserMerchantId });

    // Validate ID
    if (!id || id <= 0) {
      console.log('Invalid cash drawer ID:', id);
      throw new BadRequestException('Cash drawer ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      console.log('User does not have merchant ID');
      throw new ForbiddenException('You must be associated with a merchant to access cash drawers');
    }

    // Find cash drawer
    const cashDrawer = await this.cashDrawerRepository.findOne({
      where: { 
        id,
        status: CashDrawerStatus.OPEN, // Only find non-deleted cash drawers
      },
      relations: ['merchant', 'shift', 'shift.merchant', 'openedByCollaborator', 'closedByCollaborator'],
    });

    if (!cashDrawer) {
      console.log('Cash drawer not found:', id);
      throw new NotFoundException('Cash drawer not found');
    }

    // Validate merchant ownership
    if (cashDrawer.merchant_id !== authenticatedUserMerchantId) {
      console.log('Cash drawer does not belong to merchant:', { cashDrawerMerchantId: cashDrawer.merchant_id, authenticatedUserMerchantId });
      throw new ForbiddenException('You can only access cash drawers from your merchant');
    }

    console.log('Cash drawer found successfully:', id);

    return {
      statusCode: 200,
      message: 'Cash drawer retrieved successfully',
      data: this.formatCashDrawerResponse(cashDrawer),
    };
  }

  async update(id: number, updateCashDrawerDto: UpdateCashDrawerDto, authenticatedUserMerchantId: number): Promise<OneCashDrawerResponseDto> {
    console.log('Updating cash drawer:', { id, updateCashDrawerDto, authenticatedUserMerchantId });

    // Validate ID
    if (!id || id <= 0) {
      console.log('Invalid cash drawer ID:', id);
      throw new BadRequestException('Cash drawer ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      console.log('User does not have merchant ID');
      throw new ForbiddenException('You must be associated with a merchant to update cash drawers');
    }

    // Find existing cash drawer
    const existingCashDrawer = await this.cashDrawerRepository.findOne({
      where: { id },
      relations: ['merchant', 'shift', 'shift.merchant', 'openedByCollaborator', 'closedByCollaborator'],
    });

    if (!existingCashDrawer) {
      console.log('Cash drawer not found:', id);
      throw new NotFoundException('Cash drawer not found');
    }

    // Validate merchant ownership
    if (existingCashDrawer.merchant_id !== authenticatedUserMerchantId) {
      console.log('Cash drawer does not belong to merchant:', { cashDrawerMerchantId: existingCashDrawer.merchant_id, authenticatedUserMerchantId });
      throw new ForbiddenException('You can only update cash drawers from your merchant');
    }

    // Validate shift if provided
    if (updateCashDrawerDto.shiftId) {
      const shift = await this.shiftRepository.findOne({
        where: { id: updateCashDrawerDto.shiftId },
        relations: ['merchant'],
      });

      if (!shift) {
        console.log('Shift not found:', updateCashDrawerDto.shiftId);
        throw new NotFoundException('Shift not found');
      }

      if (shift.merchant.id !== authenticatedUserMerchantId) {
        console.log('Shift does not belong to merchant:', { shiftMerchantId: shift.merchant.id, authenticatedUserMerchantId });
        throw new ForbiddenException('You can only assign shifts from your merchant');
      }
    }

    // Validate opened by collaborator if provided
    if (updateCashDrawerDto.openedBy) {
      const openedByCollaborator = await this.collaboratorRepository.findOne({
        where: { id: updateCashDrawerDto.openedBy },
      });

      if (!openedByCollaborator) {
        console.log('Opened by collaborator not found:', updateCashDrawerDto.openedBy);
        throw new NotFoundException('Opened by collaborator not found');
      }

      if (openedByCollaborator.merchant_id !== authenticatedUserMerchantId) {
        console.log('Opened by collaborator does not belong to merchant:', { collaboratorMerchantId: openedByCollaborator.merchant_id, authenticatedUserMerchantId });
        throw new ForbiddenException('You can only assign collaborators from your merchant');
      }
    }

    // Validate closed by collaborator if provided
    if (updateCashDrawerDto.closedBy) {
      const closedByCollaborator = await this.collaboratorRepository.findOne({
        where: { id: updateCashDrawerDto.closedBy },
      });

      if (!closedByCollaborator) {
        console.log('Closed by collaborator not found:', updateCashDrawerDto.closedBy);
        throw new NotFoundException('Closed by collaborator not found');
      }

      if (closedByCollaborator.merchant_id !== authenticatedUserMerchantId) {
        console.log('Closed by collaborator does not belong to merchant:', { collaboratorMerchantId: closedByCollaborator.merchant_id, authenticatedUserMerchantId });
        throw new ForbiddenException('You can only assign collaborators from your merchant');
      }
    }

    // If one of closingBalance/closedBy is provided without the other, it's invalid
    const providedClosingBalanceU = updateCashDrawerDto.closingBalance !== undefined;
    const providedClosedByU = updateCashDrawerDto.closedBy !== undefined;
    if ((providedClosingBalanceU && !providedClosedByU) || (!providedClosingBalanceU && providedClosedByU)) {
      throw new BadRequestException('Closing balance and closed by must be provided together to close the cash drawer');
    }

    // Business rule validation: amounts
    if (updateCashDrawerDto.openingBalance !== undefined && updateCashDrawerDto.openingBalance < 0) {
      throw new BadRequestException('Opening balance must be non-negative');
    }
    if (updateCashDrawerDto.closingBalance !== undefined && updateCashDrawerDto.closingBalance < 0) {
      throw new BadRequestException('Closing balance must be non-negative');
    }

    // Update cash drawer
    const updateData: any = {};
    if (updateCashDrawerDto.shiftId !== undefined) updateData.shift_id = updateCashDrawerDto.shiftId;
    if (updateCashDrawerDto.openingBalance !== undefined) updateData.opening_balance = updateCashDrawerDto.openingBalance;
    if (updateCashDrawerDto.closingBalance !== undefined) updateData.closing_balance = updateCashDrawerDto.closingBalance;
    if (updateCashDrawerDto.openedBy !== undefined) updateData.opened_by = updateCashDrawerDto.openedBy;
    if (updateCashDrawerDto.closedBy !== undefined) updateData.closed_by = updateCashDrawerDto.closedBy;

    // If both closing fields provided, set status to CLOSED automatically
    if (providedClosingBalanceU && providedClosedByU) {
      updateData.status = CashDrawerStatus.CLOSED;
    }

    await this.cashDrawerRepository.update(id, updateData);
    console.log('Cash drawer updated successfully:', id);

    // Fetch updated cash drawer
    const updatedCashDrawer = await this.cashDrawerRepository.findOne({
      where: { id },
      relations: ['merchant', 'shift', 'shift.merchant', 'openedByCollaborator', 'closedByCollaborator'],
    });

    if (!updatedCashDrawer) {
      throw new NotFoundException('Cash drawer not found after update');
    }

    return {
      statusCode: 200,
      message: 'Cash drawer updated successfully',
      data: this.formatCashDrawerResponse(updatedCashDrawer),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneCashDrawerResponseDto> {
    console.log('Removing cash drawer:', { id, authenticatedUserMerchantId });

    // Validate ID
    if (!id || id <= 0) {
      console.log('Invalid cash drawer ID:', id);
      throw new BadRequestException('Cash drawer ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      console.log('User does not have merchant ID');
      throw new ForbiddenException('You must be associated with a merchant to delete cash drawers');
    }

    // Find existing cash drawer
    const existingCashDrawer = await this.cashDrawerRepository.findOne({
      where: { 
        id,
        status: CashDrawerStatus.OPEN, // Only find non-deleted cash drawers
      },
      relations: ['merchant', 'shift', 'shift.merchant', 'openedByCollaborator', 'closedByCollaborator'],
    });

    if (!existingCashDrawer) {
      console.log('Cash drawer not found or already deleted:', id);
      throw new NotFoundException('Cash drawer not found');
    }

    // Validate merchant ownership
    if (existingCashDrawer.merchant_id !== authenticatedUserMerchantId) {
      console.log('Cash drawer does not belong to merchant:', { cashDrawerMerchantId: existingCashDrawer.merchant_id, authenticatedUserMerchantId });
      throw new ForbiddenException('You can only delete cash drawers from your merchant');
    }

    // Check if already deleted
    if (existingCashDrawer.status === CashDrawerStatus.DELETED) {
      console.log('Cash drawer already deleted:', id);
      throw new ConflictException('Cash drawer is already deleted');
    }

    // Perform logical deletion
    await this.cashDrawerRepository.update(id, { status: CashDrawerStatus.DELETED });
    console.log('Cash drawer deleted successfully (logical deletion):', id);

    return {
      statusCode: 200,
      message: 'Cash drawer deleted successfully',
      data: this.formatCashDrawerResponse(existingCashDrawer),
    };
  }

  private formatCashDrawerResponse(cashDrawer: CashDrawer): CashDrawerResponseDto {
    return {
      id: cashDrawer.id,
      openingBalance: cashDrawer.opening_balance,
      closingBalance: cashDrawer.closing_balance,
      createdAt: cashDrawer.created_at,
      updatedAt: cashDrawer.updated_at,
      status: cashDrawer.status,
      merchant: {
        id: cashDrawer.merchant.id,
        name: cashDrawer.merchant.name,
      },
      shift: {
        id: cashDrawer.shift.id,
        name: `Shift ${cashDrawer.shift.id}`, // Generate a name since Shift doesn't have a name field
        startTime: cashDrawer.shift.startTime,
        endTime: cashDrawer.shift.endTime || new Date(), // Provide default if undefined
        status: cashDrawer.shift.status,
        merchant: {
          id: cashDrawer.shift.merchant.id,
          name: cashDrawer.shift.merchant.name,
        },
      },
      openedByCollaborator: {
        id: cashDrawer.openedByCollaborator.id,
        name: cashDrawer.openedByCollaborator.name,
        role: cashDrawer.openedByCollaborator.role,
      },
      closedByCollaborator: cashDrawer.closedByCollaborator ? {
        id: cashDrawer.closedByCollaborator.id,
        name: cashDrawer.closedByCollaborator.name,
        role: cashDrawer.closedByCollaborator.role,
      } : null,
    };
  }
}