import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftResponseDto } from './dto/shift-response.dto';
import { Merchant } from '../merchants/entities/merchant.entity';
import { ShiftRole } from './constants/shift-role.enum';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    private readonly entityManager: EntityManager,
  ) {}

  async create(dto: CreateShiftDto, authenticatedUserMerchantId: number): Promise<ShiftResponseDto> {
    // 1. Validar que el usuario autenticado tiene merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('User must be associated with a merchant to create shifts');
    }

    // 2. Validar que el usuario solo puede crear shifts para su propio merchant
    const dtoMerchantId = Number(dto.merchantId);
    const userMerchantId = Number(authenticatedUserMerchantId);
    
    if (dtoMerchantId !== userMerchantId) {
      throw new ForbiddenException('You can only create shifts for your own merchant');
    }

    // 3. Validar que el merchant existe
    const merchant = await this.merchantRepo.findOne({ where: { id: dto.merchantId } });
    if (!merchant) {
      throw new NotFoundException(`Merchant with ID ${dto.merchantId} not found`);
    }

    // 4. Validar fechas
    const startTime = new Date(dto.startTime);
    const endTime = dto.endTime ? new Date(dto.endTime) : null;

    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid start time format');
    }

    if (endTime && isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid end time format');
    }

    if (endTime && endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // 5. Crear el shift
    const shift = this.shiftRepo.create({
      merchant: { id: dto.merchantId } as Merchant,
      startTime: startTime,
      endTime: endTime,
      role: dto.role || ShiftRole.WAITER,
    } as Partial<Shift>);

    const savedShift = await this.shiftRepo.save(shift);

    // 6. Retornar respuesta
    return {
      id: savedShift.id,
      merchantId: savedShift.merchantId,
      startTime: savedShift.startTime,
      endTime: savedShift.endTime,
      role: savedShift.role,
      createdAt: savedShift.createdAt || new Date(),
      updatedAt: savedShift.updatedAt || new Date(),
    };
  }

  async findAll(authenticatedUserMerchantId: number): Promise<ShiftResponseDto[]> {
    // 1. Validar que el usuario autenticado tiene merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('User must be associated with a merchant to view shifts');
    }

    // 2. Validar que el merchant existe
    const merchant = await this.merchantRepo.findOne({ where: { id: authenticatedUserMerchantId } });
    if (!merchant) {
      throw new NotFoundException(`Merchant with ID ${authenticatedUserMerchantId} not found`);
    }

    // 3. Buscar shifts del merchant
    const shifts = await this.shiftRepo.find({
      where: { merchantId: authenticatedUserMerchantId },
      order: { startTime: 'DESC' },
    });

    // 4. Mapear a ShiftResponseDto
    return shifts.map(shift => ({
      id: shift.id,
      merchantId: shift.merchantId,
      startTime: shift.startTime,
      endTime: shift.endTime,
      role: shift.role,
      createdAt: shift.createdAt || new Date(),
      updatedAt: shift.updatedAt || new Date(),
    }));
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<ShiftResponseDto> {
    // 1. Validar que el usuario autenticado tiene merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('User must be associated with a merchant to view shifts');
    }

    // 2. Validar que el ID es válido
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid shift ID');
    }

    // 3. Buscar el shift
    const shift = await this.shiftRepo.findOne({
      where: { id },
      relations: ['merchant']
    });
    
    if (!shift) {
      throw new NotFoundException(`Shift ${id} not found`);
    }

    // 4. Validar que el usuario solo puede ver shifts de su propio merchant
    if (shift.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You can only view shifts from your own merchant');
    }

    // 5. Retornar respuesta
    return {
      id: shift.id,
      merchantId: shift.merchantId,
      startTime: shift.startTime,
      endTime: shift.endTime,
      role: shift.role,
      createdAt: shift.createdAt || new Date(),
      updatedAt: shift.updatedAt || new Date(),
    };
  }

  async update(id: number, dto: UpdateShiftDto, authenticatedUserMerchantId: number): Promise<ShiftResponseDto> {
    // 1. Validar que el usuario autenticado tiene merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('User must be associated with a merchant to update shifts');
    }

    // 2. Validar que el ID es válido
    if (!id || id <= 0 || !Number.isInteger(id)) {
      throw new BadRequestException('Invalid shift ID');
    }

    // 3. Buscar el shift existente
    const shift = await this.shiftRepo.findOne({
      where: { id },
      relations: ['merchant']
    });
    
    if (!shift) {
      throw new NotFoundException(`Shift ${id} not found`);
    }

    // 4. Validar que el usuario solo puede modificar shifts de su propio merchant
    if (shift.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You can only update shifts from your own merchant');
    }

    // 5. Validar fechas si se proporcionan
    let startTime = shift.startTime;
    let endTime = shift.endTime;

    if (dto.startTime) {
      startTime = new Date(dto.startTime);
      if (isNaN(startTime.getTime())) {
        throw new BadRequestException('Invalid start time format');
      }
    }

    if (dto.endTime !== undefined) {
      if (dto.endTime) {
        endTime = new Date(dto.endTime);
        if (isNaN(endTime.getTime())) {
          throw new BadRequestException('Invalid end time format');
        }
      } else {
        endTime = undefined;
      }
    }

    if (endTime && endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // 6. Preparar datos para actualizar
    const updateData: any = {};
    if (dto.startTime !== undefined) updateData.startTime = startTime;
    if (dto.endTime !== undefined) updateData.endTime = endTime;
    if (dto.role !== undefined) updateData.role = dto.role;

    // 7. Verificar que hay al menos un campo para actualizar
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('At least one field must be provided for update');
    }

    // 8. Actualizar el shift
    Object.assign(shift, updateData);
    const updatedShift = await this.shiftRepo.save(shift);

    // 9. Retornar respuesta
    return {
      id: updatedShift.id,
      merchantId: updatedShift.merchantId,
      startTime: updatedShift.startTime,
      endTime: updatedShift.endTime,
      role: updatedShift.role,
      createdAt: updatedShift.createdAt || new Date(),
      updatedAt: updatedShift.updatedAt || new Date(),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<ShiftResponseDto> {
    // 1. Validar que el usuario autenticado tiene merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('User must be associated with a merchant to delete shifts');
    }

    // 2. Validar que el ID es válido
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid shift ID');
    }

    // 3. Buscar el shift
    const shift = await this.shiftRepo.findOne({
      where: { id },
      relations: ['merchant']
    });
    
    if (!shift) {
      throw new NotFoundException(`Shift ${id} not found`);
    }

    // 4. Validar que el usuario solo puede eliminar shifts de su propio merchant
    if (shift.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You can only delete shifts from your own merchant');
    }

    // 5. Eliminar el shift
    await this.shiftRepo.remove(shift);

    // 6. Retornar respuesta
    return {
      id: shift.id,
      merchantId: shift.merchantId,
      startTime: shift.startTime,
      endTime: shift.endTime,
      role: shift.role,
      createdAt: shift.createdAt || new Date(),
      updatedAt: shift.updatedAt || new Date(),
    };
  }
}
