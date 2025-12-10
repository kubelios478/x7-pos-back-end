import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Not, Between, Like, IsNull } from 'typeorm';
import { TableAssignment } from './entities/table-assignment.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { Table } from '../tables/entities/table.entity';
import { Collaborator } from '../collaborators/entities/collaborator.entity';
import { CreateTableAssignmentDto } from './dto/create-table-assignment.dto';
import { UpdateTableAssignmentDto } from './dto/update-table-assignment.dto';
import { GetTableAssignmentsQueryDto } from './dto/get-table-assignments-query.dto';
import { 
  OneTableAssignmentResponseDto, 
  AllTableAssignmentsResponseDto, 
  TableAssignmentResponseDto,
  BasicShiftInfoDto,
  BasicTableInfoDto,
  BasicCollaboratorInfoDto
} from './dto/table-assignment-response.dto';
import { PaginatedTableAssignmentsResponseDto } from './dto/paginated-table-assignments-response.dto';

@Injectable()
export class TableAssignmentsService {
  constructor(
    @InjectRepository(TableAssignment)
    private readonly tableAssignmentRepo: Repository<TableAssignment>,
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(Table)
    private readonly tableRepo: Repository<Table>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,
    private readonly entityManager: EntityManager,
  ) {}

  private formatTableAssignmentResponse(assignment: TableAssignment, shift?: any, table?: any, collaborator?: any): any {
    return {
      id: assignment.id,
      shiftId: assignment.shiftId,
      tableId: assignment.tableId,
      collaboratorId: assignment.collaboratorId,
      assignedAt: assignment.assignedAt,
      releasedAt: assignment.releasedAt,
      shift: shift ? {
        id: shift.id,
        merchantId: shift.merchant?.id || shift.merchantId,
        merchantName: shift.merchant?.name || 'Unknown Merchant'
      } : undefined,
      table: table ? {
        id: table.id,
        name: table.name,
        capacity: table.capacity
      } : undefined,
      collaborator: collaborator ? {
        id: collaborator.id,
        name: collaborator.name,
        role: collaborator.role
      } : undefined,
    };
  }

  async create(dto: CreateTableAssignmentDto, authenticatedUserMerchantId: number): Promise<OneTableAssignmentResponseDto> {
    // 1. Validate user permissions - User must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('User must be associated with a merchant to create table assignments');
    }

    // 2. Validate shift exists and belongs to the same merchant
    const shift = await this.shiftRepo.findOne({
      where: { id: dto.shiftId },
      relations: ['merchant']
    });
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }
    if (shift.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException('Cannot create table assignments for shifts from different merchants');
    }

    // 3. Validate table exists and belongs to the same merchant
    const table = await this.tableRepo.findOne({
      where: { id: dto.tableId },
      relations: ['merchant']
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    if (table.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('Cannot create table assignments for tables from different merchants');
    }

    // 4. Validate collaborator exists and belongs to the same merchant
    const collaborator = await this.collaboratorRepo.findOne({
      where: { id: dto.collaboratorId },
      relations: ['merchant']
    });
    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }
    if (collaborator.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('Cannot create table assignments for collaborators from different merchants');
    }

    // 5. Validate business rules
    const assignedAtDate = new Date();

    const releasedAtDate = dto.releasedAt ? new Date(dto.releasedAt) : null;

    if (releasedAtDate && releasedAtDate <= assignedAtDate) {
      throw new BadRequestException('Release time must be after assignment time');
    }

    // 6. Check for existing active assignment for the same table
    const existingAssignment = await this.tableAssignmentRepo.findOne({
      where: {
        tableId: dto.tableId,
        releasedAt: IsNull()
      }
    });
    if (existingAssignment) {
      throw new ConflictException('Table is already assigned to another collaborator');
    }

    // 7. Create the table assignment
    const tableAssignment = this.tableAssignmentRepo.create({
      shiftId: dto.shiftId,
      tableId: dto.tableId,
      collaboratorId: dto.collaboratorId,
      assignedAt: assignedAtDate,
      releasedAt: releasedAtDate || undefined,
    });

    const savedAssignment = await this.tableAssignmentRepo.save(tableAssignment);
    const assignment = Array.isArray(savedAssignment) ? savedAssignment[0] : savedAssignment;

    return {
      statusCode: 201,
      message: 'Table assignment created successfully',
      data: this.formatTableAssignmentResponse(assignment, shift, table, collaborator)
    };
  }

  async findAll(query: GetTableAssignmentsQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedTableAssignmentsResponseDto> {

    // 1. Validate user permissions - User must be associated with a merchant
    if (!authenticatedUserMerchantId) {
     throw new ForbiddenException('User must be associated with a merchant to view table assignments');
    }

    // 2. Validate filters and pagination parameters
   
    // Validate pagination parameters
    if (query.page && (query.page < 1 || !Number.isInteger(query.page))) {
     throw new BadRequestException('Page must be a positive integer');
    }
    
    if (query.limit && (query.limit < 1 || query.limit > 100 || !Number.isInteger(query.limit))) {
      throw new BadRequestException('Limit must be a positive integer between 1 and 100');
    }

    // Validate date format if provided
    if (query.assignedDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.assignedDate)) {
        throw new BadRequestException('Assigned date must be in YYYY-MM-DD format');
      }
    }

    // 3. Validate that filtered entities belong to the authenticated user's merchant
    
    // Validate shift ownership if filtering by shiftId
    if (query.shiftId) {
      const shift = await this.shiftRepo.findOne({
        where: { id: query.shiftId },
        relations: ['merchant']
      });
      
      if (!shift) {
        throw new BadRequestException('Shift not found');
      }
      
      if (shift.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Cannot access shifts from different merchants');
      }
    }

    // Validate table ownership if filtering by tableId
    if (query.tableId) {
      const table = await this.tableRepo.findOne({
        where: { id: query.tableId },
        relations: ['merchant']
      });
      
      if (!table) {
        throw new BadRequestException('Table not found');
      }
      
      if (table.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Cannot access tables from different merchants');
      }
    }

    // Validate collaborator ownership if filtering by collaboratorId
    if (query.collaboratorId) {
      const collaborator = await this.collaboratorRepo.findOne({
        where: { id: query.collaboratorId },
        relations: ['merchant']
      });
      
      if (!collaborator) {
        throw new BadRequestException('Collaborator not found');
      }
      
      if (collaborator.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Cannot access collaborators from different merchants');
      }
    }

    // 4. Build where conditions
    const whereConditions: any = {};

    // Filter by shift ID
    if (query.shiftId) {
      whereConditions.shiftId = query.shiftId;
    }

    // Filter by table ID
    if (query.tableId) {
      whereConditions.tableId = query.tableId;
    }

    // Filter by collaborator ID
    if (query.collaboratorId) {
      whereConditions.collaboratorId = query.collaboratorId;
    }

    // Filter by assigned date
    if (query.assignedDate) {
      const startOfDay = new Date(query.assignedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(query.assignedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      whereConditions.assignedAt = Between(startOfDay, endOfDay);
    }


    // 5. Pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 6. Sorting
    const sortBy = query.sortBy || 'assignedAt';
    const sortOrder = query.sortOrder || 'DESC';
    const orderConditions: any = {};
    orderConditions[sortBy] = sortOrder;

    // 7. Get assignments with relations
    const startTime = Date.now();
    
    const [assignments, total] = await this.tableAssignmentRepo.findAndCount({
      where: whereConditions,
      relations: ['shift', 'shift.merchant', 'table', 'collaborator'],
      order: orderConditions,
      skip,
      take: limit,
    });

    const queryTime = Date.now() - startTime;

    // 8. Filter assignments by merchant (only show assignments from the authenticated user's merchant)
    const filteredAssignments = assignments.filter(assignment => {
      const shiftBelongsToMerchant = assignment.shift?.merchantId === authenticatedUserMerchantId;
      const tableBelongsToMerchant = assignment.table?.merchant_id === authenticatedUserMerchantId;
      const collaboratorBelongsToMerchant = assignment.collaborator?.merchant_id === authenticatedUserMerchantId;
      
      const belongsToMerchant = shiftBelongsToMerchant && tableBelongsToMerchant && collaboratorBelongsToMerchant;
      
      if (!belongsToMerchant) {
        throw new ForbiddenException('Cannot access table assignments from different merchants');
      }
      return belongsToMerchant;
    });


    // 9. Format response
    const formattedAssignments = filteredAssignments.map((assignment, index) => {
      
      return this.formatTableAssignmentResponse(
        assignment, 
        assignment.shift, 
        assignment.table, 
        assignment.collaborator
      );
    });

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev
    };


    return {
      statusCode: 200,
      message: 'Table assignments retrieved successfully',
      data: formattedAssignments,
      paginationMeta
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneTableAssignmentResponseDto> {
    // 1. Validate user permissions
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('User must be associated with a merchant to view table assignments');
    }

    // 2. Find the table assignment with relations
    const assignment = await this.tableAssignmentRepo.findOne({
      where: { id },
      relations: ['shift', 'shift.merchant', 'table', 'collaborator']
    });

    if (!assignment) {
      throw new NotFoundException('Table assignment not found');
    }

    // 3. Validate that the assignment belongs to the authenticated user's merchant
    if (assignment.shift?.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException('Cannot access table assignments from different merchants');
    }

    return {
      statusCode: 200,
      message: 'Table assignment retrieved successfully',
      data: this.formatTableAssignmentResponse(
        assignment, 
        assignment.shift, 
        assignment.table, 
        assignment.collaborator
      )
    };
  }

  async update(id: number, dto: UpdateTableAssignmentDto, authenticatedUserMerchantId: number): Promise<OneTableAssignmentResponseDto> {
    // 1. Validate user permissions
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('User must be associated with a merchant to update table assignments');
    }

    // 2. Find the table assignment
    const assignment = await this.tableAssignmentRepo.findOne({
      where: { id },
      relations: ['shift', 'shift.merchant', 'table', 'collaborator']
    });

    if (!assignment) {
      throw new NotFoundException('Table assignment not found');
    }

    // 3. Validate that the assignment belongs to the authenticated user's merchant
    if (assignment.shift?.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException('Cannot update table assignments from different merchants');
    }

    // 4. Validate business rules
    if (dto.releasedAt) {
      const releasedAtDate = new Date(dto.releasedAt);
      if (releasedAtDate <= assignment.assignedAt) {
        throw new BadRequestException('Release time must be after assignment time');
      }
    }

    // 5. Update the assignment
    const updateData: any = {};
    if (dto.releasedAt !== undefined) {
      updateData.releasedAt = dto.releasedAt ? new Date(dto.releasedAt) : null;
    }

    await this.tableAssignmentRepo.update(id, updateData);

    // 6. Get updated assignment
    const updatedAssignment = await this.tableAssignmentRepo.findOne({
      where: { id },
      relations: ['shift', 'shift.merchant', 'table', 'collaborator']
    });

    return {
      statusCode: 200,
      message: 'Table assignment updated successfully',
      data: this.formatTableAssignmentResponse(
        updatedAssignment!, 
        updatedAssignment!.shift, 
        updatedAssignment!.table, 
        updatedAssignment!.collaborator
      )
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneTableAssignmentResponseDto> {
    // 1. Validate user permissions
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('User must be associated with a merchant to delete table assignments');
    }

    // 2. Find the table assignment
    const assignment = await this.tableAssignmentRepo.findOne({
      where: { id },
      relations: ['shift', 'shift.merchant', 'table', 'collaborator']
    });

    if (!assignment) {
      throw new NotFoundException('Table assignment not found');
    }

    // 3. Validate that the assignment belongs to the authenticated user's merchant
    if (assignment.shift?.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException('Cannot delete table assignments from different merchants');
    }

    // 4. Delete the assignment
    await this.tableAssignmentRepo.remove(assignment);

    return {
      statusCode: 200,
      message: 'Table assignment deleted successfully',
      data: this.formatTableAssignmentResponse(
        assignment, 
        assignment.shift, 
        assignment.table, 
        assignment.collaborator
      )
    };
  }
}