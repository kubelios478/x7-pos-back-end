import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Collaborator } from './entities/collaborator.entity';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { CollaboratorResponseDto, OneCollaboratorResponseDto } from './dto/collaborator-response.dto';
import { GetCollaboratorsQueryDto } from './dto/get-collaborators-query.dto';
import { PaginatedCollaboratorsResponseDto } from './dto/paginated-collaborators-response.dto';
import { User } from '../users/entities/user.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { CollaboratorStatus } from './constants/collaborator-status.enum';

@Injectable()
export class CollaboratorsService {
  constructor(
    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    private readonly entityManager: EntityManager,
  ) { }

  async create(dto: CreateCollaboratorDto, authenticatedUserMerchantId: number): Promise<OneCollaboratorResponseDto> {
    console.log('=== COLLABORATOR CREATE DEBUG ===');
    console.log('Create DTO:', dto);
    console.log('Authenticated user merchant_id:', authenticatedUserMerchantId);

    // 1. Validar que el usuario autenticado tiene merchant_id
    if (!authenticatedUserMerchantId) {
      console.log('❌ VALIDATION FAILED: No merchant_id in authenticated user');
      throw new ForbiddenException('User must be associated with a merchant to create collaborators');
    }

    // 2. Validar que el usuario solo puede crear colaboradores para su propio merchant
    const dtoMerchantId = Number(dto.merchant_id);
    const userMerchantId = Number(authenticatedUserMerchantId);
    
    if (dtoMerchantId !== userMerchantId) {
      console.log('❌ VALIDATION FAILED: User trying to create collaborator for different merchant');
      throw new ForbiddenException('You can only create collaborators for your own merchant');
    }

    // 3. Validar que el merchant existe
    console.log('🔍 Validating merchant existence for ID:', dto.merchant_id);
    const merchant = await this.merchantRepo.findOne({ where: { id: dto.merchant_id } });
    if (!merchant) {
      console.log('❌ VALIDATION FAILED: Merchant not found');
      throw new NotFoundException(`Merchant with ID ${dto.merchant_id} not found`);
    }

    // 4. Validar que el usuario existe
    console.log('🔍 Validating user existence for ID:', dto.user_id);
    const user = await this.userRepo.findOne({ where: { id: dto.user_id } });
    if (!user) {
      console.log('❌ VALIDATION FAILED: User not found');
      throw new NotFoundException(`User with ID ${dto.user_id} not found`);
    }

    // 5. Validar unicidad del user_id (un usuario solo puede ser colaborador de un merchant)
    console.log('🔍 Checking uniqueness for user_id:', dto.user_id);
    const existingCollaborator = await this.collaboratorRepo.findOne({ 
      where: { user_id: dto.user_id } 
    });

    if (existingCollaborator) {
      console.log('❌ VALIDATION FAILED: User already has a collaborator record');
      throw new ConflictException(
        `User with ID '${dto.user_id}' is already a collaborator. A user can only be a collaborator for one merchant.`
      );
    }

    // 6. Validaciones de reglas de negocio
    if (dto.name.trim().length === 0) {
      console.log('❌ VALIDATION FAILED: Empty name');
      throw new BadRequestException('Collaborator name cannot be empty');
    }

    if (dto.name.length > 150) {
      console.log('❌ VALIDATION FAILED: Name too long');
      throw new BadRequestException('Collaborator name cannot exceed 150 characters');
    }

    // 7. Crear el colaborador
    console.log('📝 Creating collaborator...');
    const collaborator = this.collaboratorRepo.create({
      user_id: dto.user_id,
      merchant_id: dto.merchant_id,
      name: dto.name.trim(),
      role: dto.role,
      status: dto.status,
    } as Partial<Collaborator>);
    
    const savedCollaborator = await this.collaboratorRepo.save(collaborator);
    console.log('✅ Collaborator created successfully');

    // 8. Return response with merchant and user information (without dates)
    return {
      statusCode: 201,
      message: 'Collaborator created successfully',
      data: {
        id: savedCollaborator.id,
        user_id: savedCollaborator.user_id,
        merchant_id: savedCollaborator.merchant_id,
        name: savedCollaborator.name,
        role: savedCollaborator.role,
        status: savedCollaborator.status,
        merchant: {
          id: merchant.id,
          name: merchant.name
        },
        user: {
          id: user.id,
          firstname: user.username || '',
          lastname: user.email || ''
        }
      }
    };
  }

  async findAll(query: GetCollaboratorsQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedCollaboratorsResponseDto> {
    console.log('=== COLLABORATORS FIND ALL DEBUG ===');
    console.log('Query parameters:', query);
    console.log('Authenticated user merchant_id:', authenticatedUserMerchantId);

    // 1. Validar que el usuario autenticado tiene merchant_id
    if (!authenticatedUserMerchantId) {
      console.log('❌ VALIDATION FAILED: No merchant_id in authenticated user');
      throw new ForbiddenException('User must be associated with a merchant to view collaborators');
    }

    // 2. Validar que el merchant existe
    console.log('🔍 Validating merchant existence for ID:', authenticatedUserMerchantId);
    const merchant = await this.merchantRepo.findOne({ where: { id: authenticatedUserMerchantId } });
    if (!merchant) {
      console.log('❌ VALIDATION FAILED: Merchant not found');
      throw new NotFoundException(`Merchant with ID ${authenticatedUserMerchantId} not found`);
    }

    // 3. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 4. Construir query con filtros
    const queryBuilder = this.collaboratorRepo
      .createQueryBuilder('collaborator')
      .leftJoinAndSelect('collaborator.user', 'user')
      .leftJoinAndSelect('collaborator.merchant', 'merchant')
      .where('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId });

    // 5. Aplicar filtros opcionales
    if (query.status) {
      queryBuilder.andWhere('collaborator.status = :status', { status: query.status });
    }

    // 6. Obtener total de registros
    const total = await queryBuilder.getCount();

    // 7. Apply pagination and sorting
    const collaborators = await queryBuilder
      .orderBy('collaborator.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 8. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 9. Mapear a CollaboratorResponseDto (sin fechas, con info del merchant y user)
    const data: CollaboratorResponseDto[] = collaborators.map(collaborator => ({
      id: collaborator.id,
      user_id: collaborator.user_id,
      merchant_id: collaborator.merchant_id,
      name: collaborator.name,
      role: collaborator.role,
      status: collaborator.status,
      merchant: {
        id: collaborator.merchant.id,
        name: collaborator.merchant.name
      },
      user: {
        id: collaborator.user.id,
        firstname: collaborator.user.username || '',
        lastname: collaborator.user.email || ''
      }
    }));

    console.log('✅ SUCCESS: Returning paginated collaborators response');
    console.log('Total collaborators found:', total);
    console.log('Page:', page, 'of', totalPages);

    return {
      statusCode: 200,
      message: 'Collaborators retrieved successfully',
      data,
      paginationMeta: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneCollaboratorResponseDto> {
    console.log('=== COLLABORATOR GET ONE DEBUG ===');
    console.log('Collaborator ID to get:', id);
    console.log('Authenticated user merchant_id:', authenticatedUserMerchantId);
    console.log('Type of authenticatedUserMerchantId:', typeof authenticatedUserMerchantId);

    // 1. Validar que el usuario autenticado tiene merchant_id
    if (!authenticatedUserMerchantId) {
      console.log('❌ VALIDATION FAILED: No merchant_id in authenticated user');
      throw new ForbiddenException('User must be associated with a merchant to view collaborators');
    }

    // 2. Validate that the ID is valid
    if (!id || id <= 0) {
      console.log('❌ VALIDATION FAILED: Invalid collaborator ID');
      throw new BadRequestException('Invalid collaborator ID');
    }

    // 3. Buscar el colaborador
    console.log('🔍 Searching for collaborator with ID:', id);
    const collaborator = await this.collaboratorRepo.findOne({
      where: { id },
      relations: ['user', 'merchant']
    });
    
    if (!collaborator) {
      console.log('❌ VALIDATION FAILED: Collaborator not found');
      throw new NotFoundException(`Collaborator ${id} not found`);
    }

    // 4. Validar que el usuario solo puede ver colaboradores de su propio merchant
    console.log('🔍 COMPARISON DEBUG:');
    console.log('collaborator.merchant_id:', collaborator.merchant_id);
    console.log('collaborator.merchant_id type:', typeof collaborator.merchant_id);
    console.log('authenticatedUserMerchantId:', authenticatedUserMerchantId);
    console.log('authenticatedUserMerchantId type:', typeof authenticatedUserMerchantId);
    console.log('Are they equal?', collaborator.merchant_id === authenticatedUserMerchantId);
    console.log('Are they equal (Number)?', Number(collaborator.merchant_id) === Number(authenticatedUserMerchantId));

    if (collaborator.merchant_id !== authenticatedUserMerchantId) {
      console.log('❌ VALIDATION FAILED: User trying to view collaborator from different merchant');
      console.log('Collaborator belongs to merchant ID:', collaborator.merchant_id);
      console.log('User belongs to merchant ID:', authenticatedUserMerchantId);
      throw new ForbiddenException('You can only view collaborators from your own merchant');
    }

    console.log('✅ Collaborator found:', {
      id: collaborator.id,
      user_id: collaborator.user_id,
      merchant_id: collaborator.merchant_id,
      name: collaborator.name,
      role: collaborator.role,
      status: collaborator.status
    });

    // 5. Validar que el merchant existe
    console.log('🔍 Validating merchant existence for ID:', collaborator.merchant_id);
    const merchant = await this.merchantRepo.findOne({ where: { id: collaborator.merchant_id } });
    if (!merchant) {
      console.log('❌ VALIDATION FAILED: Merchant not found');
      throw new NotFoundException(`Merchant with ID ${collaborator.merchant_id} not found`);
    }

    console.log('✅ Merchant found:', {
      id: merchant.id,
      name: merchant.name
    });

    // 6. Validar que el usuario existe
    console.log('🔍 Validating user existence for ID:', collaborator.user_id);
    const user = await this.userRepo.findOne({ where: { id: collaborator.user_id } });
    if (!user) {
      console.log('❌ VALIDATION FAILED: User not found');
      throw new NotFoundException(`User with ID ${collaborator.user_id} not found`);
    }

    console.log('✅ User found:', {
      id: user.id,
      username: user.username,
      email: user.email
    });

    // 7. Return response with merchant and user information (without dates)
    return {
      statusCode: 200,
      message: 'Collaborator retrieved successfully',
      data: {
        id: collaborator.id,
        user_id: collaborator.user_id,
        merchant_id: collaborator.merchant_id,
        name: collaborator.name,
        role: collaborator.role,
        status: collaborator.status,
        merchant: {
          id: merchant.id,
          name: merchant.name
        },
        user: {
          id: user.id,
          firstname: user.username || '',
          lastname: user.email || ''
        }
      }
    };
  }

  async update(id: number, dto: UpdateCollaboratorDto, authenticatedUserMerchantId: number): Promise<OneCollaboratorResponseDto> {
    console.log('=== COLLABORATOR UPDATE DEBUG ===');
    console.log('Collaborator ID to update:', id);
    console.log('Authenticated user merchant_id:', authenticatedUserMerchantId);
    console.log('Update DTO:', dto);
    console.log('DTO type:', typeof dto);
    console.log('DTO keys:', dto ? Object.keys(dto) : 'N/A');

    // 0. Validate that the DTO exists and is not empty
    if (!dto || (typeof dto === 'object' && Object.keys(dto).length === 0)) {
      console.log('❌ VALIDATION FAILED: DTO is undefined or empty');
      throw new BadRequestException('Update data is required');
    }

    // 0.1. Validate that at least one valid field is present
    const validFields = ['user_id', 'name', 'role', 'status'];
    const hasValidField = validFields.some(field => dto[field] !== undefined);
    
    if (!hasValidField) {
      console.log('❌ VALIDATION FAILED: No valid fields provided');
      throw new BadRequestException('At least one field must be provided for update');
    }

    // 1. Validar que el usuario autenticado tiene merchant_id
    if (!authenticatedUserMerchantId) {
      console.log('❌ VALIDATION FAILED: No merchant_id in authenticated user');
      throw new ForbiddenException('User must be associated with a merchant to update collaborators');
    }

    // 2. Validate that the ID is valid
    if (!id || id <= 0 || !Number.isInteger(id)) {
      console.log('❌ VALIDATION FAILED: Invalid collaborator ID');
      throw new BadRequestException('Invalid collaborator ID');
    }

    // 3. Buscar el colaborador existente
    console.log('🔍 Searching for collaborator with ID:', id);
    const collaborator = await this.collaboratorRepo.findOne({ 
      where: { id },
      relations: ['user', 'merchant']
    });
    
    if (!collaborator) {
      console.log('❌ VALIDATION FAILED: Collaborator not found');
      throw new NotFoundException(`Collaborator ${id} not found`);
    }

    console.log('✅ Collaborator found:', {
      id: collaborator.id,
      user_id: collaborator.user_id,
      merchant_id: collaborator.merchant_id,
      name: collaborator.name,
      role: collaborator.role,
      status: collaborator.status
    });

    // 4. Validar que el usuario solo puede modificar colaboradores de su propio merchant
    if (collaborator.merchant_id !== authenticatedUserMerchantId) {
      console.log('❌ VALIDATION FAILED: User trying to update collaborator from different merchant');
      console.log('Collaborator belongs to merchant:', collaborator.merchant_id);
      console.log('User belongs to merchant:', authenticatedUserMerchantId);
      throw new ForbiddenException('You can only update collaborators from your own merchant');
    }

    // 5. Validar campos y tipos
    if (dto.name !== undefined) {
      if (typeof dto.name !== 'string' || dto.name.trim() === '') {
        console.log('❌ VALIDATION FAILED: Invalid name value');
        throw new BadRequestException('Name must be a non-empty string');
      }
      if (dto.name.length > 150) {
        console.log('❌ VALIDATION FAILED: Name too long');
        throw new BadRequestException('Name cannot exceed 150 characters');
      }
    }

    if (dto.user_id !== undefined) {
      if (!Number.isInteger(dto.user_id) || dto.user_id <= 0) {
        console.log('❌ VALIDATION FAILED: Invalid user_id value');
        throw new BadRequestException('User ID must be a positive integer');
      }
    }

    // 6. Validate uniqueness if updating the user_id
    if (dto.user_id !== undefined && dto.user_id !== collaborator.user_id) {
      console.log('🔍 Checking uniqueness for user_id:', dto.user_id);
      const existingCollaborator = await this.collaboratorRepo.findOne({ 
        where: { user_id: dto.user_id } 
      });

      if (existingCollaborator && existingCollaborator.id !== id) {
        console.log('❌ VALIDATION FAILED: User already has a collaborator record');
        throw new ConflictException(
          `User with ID '${dto.user_id}' is already a collaborator. A user can only be a collaborator for one merchant.`
        );
      }
    }

    // 7. Validate that the user exists if updating
    if (dto.user_id !== undefined) {
      console.log('🔍 Validating user existence for ID:', dto.user_id);
      const user = await this.userRepo.findOne({ where: { id: dto.user_id } });
      if (!user) {
        console.log('❌ VALIDATION FAILED: User not found');
        throw new NotFoundException(`User with ID ${dto.user_id} not found`);
      }
    }

    // 8. Validar que el merchant existe
    console.log('🔍 Validating merchant existence for ID:', collaborator.merchant_id);
    const merchant = await this.merchantRepo.findOne({ where: { id: collaborator.merchant_id } });
    if (!merchant) {
      console.log('❌ VALIDATION FAILED: Merchant not found');
      throw new NotFoundException(`Merchant with ID ${collaborator.merchant_id} not found`);
    }

    console.log('✅ Merchant found:', {
      id: merchant.id,
      name: merchant.name
    });

    // 9. Preparar datos para actualizar
    const updateData: any = {};
    if (dto.user_id !== undefined) updateData.user_id = dto.user_id;
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.status !== undefined) updateData.status = dto.status;
    
    console.log('📝 Update data:', updateData);

    // 10. Verificar que hay al menos un campo para actualizar
    if (Object.keys(updateData).length === 0) {
      console.log('❌ VALIDATION FAILED: No fields to update');
      throw new BadRequestException('At least one field must be provided for update');
    }

    // 11. Actualizar el colaborador
    Object.assign(collaborator, updateData);
    const updatedCollaborator = await this.collaboratorRepo.save(collaborator);

    console.log('✅ Collaborator updated successfully');

    // 12. Get user information for the response
    const user = await this.userRepo.findOne({ where: { id: updatedCollaborator.user_id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${updatedCollaborator.user_id} not found`);
    }

    // 13. Return response with merchant and user information (without dates)
    return {
      statusCode: 200,
      message: 'Collaborator updated successfully',
      data: {
        id: updatedCollaborator.id,
        user_id: updatedCollaborator.user_id,
        merchant_id: updatedCollaborator.merchant_id,
        name: updatedCollaborator.name,
        role: updatedCollaborator.role,
        status: updatedCollaborator.status,
        merchant: {
          id: merchant.id,
          name: merchant.name
        },
        user: {
          id: user.id,
          firstname: user.username || '',
          lastname: user.email || ''
        }
      }
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneCollaboratorResponseDto> {
    console.log('=== COLLABORATOR DELETE DEBUG ===');
    console.log('Collaborator ID to delete:', id);
    console.log('Authenticated user merchant_id:', authenticatedUserMerchantId);
    console.log('Type of authenticatedUserMerchantId:', typeof authenticatedUserMerchantId);

    // 1. Validar que el usuario autenticado tiene merchant_id
    if (!authenticatedUserMerchantId) {
      console.log('❌ VALIDATION FAILED: No merchant_id in authenticated user');
      throw new ForbiddenException('User must be associated with a merchant to delete collaborators');
    }

    // 2. Validate that the ID is valid
    if (!id || id <= 0) {
      console.log('❌ VALIDATION FAILED: Invalid collaborator ID');
      throw new BadRequestException('Invalid collaborator ID');
    }

    // 3. Buscar el colaborador
    console.log('🔍 Searching for collaborator with ID:', id);
    const collaborator = await this.collaboratorRepo.findOne({
      where: { id },
      relations: ['user', 'merchant']
    });
    
    if (!collaborator) {
      console.log('❌ VALIDATION FAILED: Collaborator not found');
      throw new NotFoundException(`Collaborator ${id} not found`);
    }

    // 4. Validar que el usuario solo puede eliminar colaboradores de su propio merchant
    console.log('🔍 COMPARISON DEBUG:');
    console.log('collaborator.merchant_id:', collaborator.merchant_id);
    console.log('collaborator.merchant_id type:', typeof collaborator.merchant_id);
    console.log('authenticatedUserMerchantId:', authenticatedUserMerchantId);
    console.log('authenticatedUserMerchantId type:', typeof authenticatedUserMerchantId);
    console.log('Are they equal?', collaborator.merchant_id === authenticatedUserMerchantId);
    console.log('Are they equal (Number)?', Number(collaborator.merchant_id) === Number(authenticatedUserMerchantId));

    if (collaborator.merchant_id !== authenticatedUserMerchantId) {
      console.log('❌ VALIDATION FAILED: User trying to delete collaborator from different merchant');
      console.log('Collaborator belongs to merchant ID:', collaborator.merchant_id);
      console.log('User belongs to merchant ID:', authenticatedUserMerchantId);
      throw new ForbiddenException('You can only delete collaborators from your own merchant');
    }

    console.log('✅ Collaborator found:', {
      id: collaborator.id,
      user_id: collaborator.user_id,
      merchant_id: collaborator.merchant_id,
      name: collaborator.name,
      role: collaborator.role,
      status: collaborator.status
    });

    // 5. Validate that the collaborator is not already deleted
    if (collaborator.status === CollaboratorStatus.DELETED) {
      console.log('❌ VALIDATION FAILED: Collaborator is already deleted');
      throw new ConflictException('Collaborator is already deleted');
    }

    // 6. Validate dependencies (here you can add specific validations)
    // For example, check if there are active shifts, orders, etc.
    // const activeShifts = await this.shiftRepo.count({ where: { collaborator_id: id, status: 'active' } });
    // if (activeShifts > 0) {
    //   console.log('❌ VALIDATION FAILED: Collaborator has active shifts');
    //   throw new ConflictException('Cannot delete collaborator with active shifts');
    // }

    // 7. Validar que el merchant existe
    console.log('🔍 Validating merchant existence for ID:', collaborator.merchant_id);
    const merchant = await this.merchantRepo.findOne({ where: { id: collaborator.merchant_id } });
    if (!merchant) {
      console.log('❌ VALIDATION FAILED: Merchant not found');
      throw new NotFoundException(`Merchant with ID ${collaborator.merchant_id} not found`);
    }

    console.log('✅ Merchant found:', {
      id: merchant.id,
      name: merchant.name
    });

    // 8. Validar que el usuario existe
    console.log('🔍 Validating user existence for ID:', collaborator.user_id);
    const user = await this.userRepo.findOne({ where: { id: collaborator.user_id } });
    if (!user) {
      console.log('❌ VALIDATION FAILED: User not found');
      throw new NotFoundException(`User with ID ${collaborator.user_id} not found`);
    }

    console.log('✅ User found:', {
      id: user.id,
      username: user.username,
      email: user.email
    });

    // 9. Soft delete - cambiar status a 'deleted'
    console.log('📝 Performing soft delete...');
    collaborator.status = CollaboratorStatus.DELETED;
    const updatedCollaborator = await this.collaboratorRepo.save(collaborator);

    console.log('✅ Collaborator soft deleted successfully');

    // 10. Return response with merchant and user information (without dates)
    return {
      statusCode: 200,
      message: 'Collaborator deleted successfully',
      data: {
        id: updatedCollaborator.id,
        user_id: updatedCollaborator.user_id,
        merchant_id: updatedCollaborator.merchant_id,
        name: updatedCollaborator.name,
        role: updatedCollaborator.role,
        status: updatedCollaborator.status,
        merchant: {
          id: merchant.id,
          name: merchant.name
        },
        user: {
          id: user.id,
          firstname: user.username || '',
          lastname: user.email || ''
        }
      }
    };
  }
}

