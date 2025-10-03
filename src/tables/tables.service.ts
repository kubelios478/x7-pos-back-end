import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Table } from './entities/table.entity';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { Merchant } from '../merchants/entities/merchant.entity';
import { IsUnique } from '../validators/is-unique.validator';
@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepo: Repository<Table>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    private readonly entityManager: EntityManager,
  ) { }

  async create(dto: CreateTableDto): Promise<Table> {
    const merchant = await this.merchantRepo.findOne({ where: { id: dto.merchant_id } });
    if (dto.merchant_id && !merchant) {
      throw new NotFoundException(`Merchant with ID ${dto.merchant_id} not found`);
    }



    console.log('Creating table for merchant:', merchant);
    const table = this.tableRepo.create({
      merchant_id: dto.merchant_id,
      number: dto.number,
      capacity: dto.capacity,
      status: dto.status,
      location: dto.location,
    } as Partial<Table>);
    console.log('table entity before save:', table);
    await this.tableRepo.save(table);
    console.log('table saved:', table);
    return this.tableRepo.save(table);

  }

  async findAll(): Promise<Table[]> {
    return this.tableRepo.find({ relations: ['merchant_id'] });
  }

  async findOne(id: number): Promise<Table> {
    const table = await this.tableRepo.findOne({ where: { id } });
    if (!table) throw new NotFoundException(`Table ${id} not found`);
    return table;
  }

  async update(id: number, dto: UpdateTableDto): Promise<Table> {
    const merchant = await this.merchantRepo.findOne({ where: { id: dto.merchant_id } });
    if (dto.merchant_id && !merchant) {
      throw new NotFoundException(`Merchant with ID ${dto.merchant_id} not found`);
    }

    // Validar unicidad si se está actualizando el number
    if (dto.number) {
      const table = await this.findOne(id);
      const validator = new IsUnique(this.entityManager);
      const updateObject = {
        number: dto.number,
        merchant_id: dto.merchant_id || table.merchant_id,
        id: id
      };

      const isValid = await validator.validate(dto.number, {
        object: updateObject,
        property: 'number',
        value: dto.number,
        constraints: [{
          entity: 'table',
          fields: ['number', 'merchant_id'],
          ignoreIdField: 'id'
        }]
      } as any);

      if (!isValid) {
        throw new ConflictException(
          `Ya existe una mesa con el número '${dto.number}' para el merchant ${dto.merchant_id || table.merchant_id}`
        );
      }
    }

    console.log('updating table for merchant:', merchant);
    const table = await this.findOne(id);
    const updated = Object.assign(table, dto);
    return this.tableRepo.save(updated);
  }

  async remove(id: number): Promise<void> {
    const table = await this.findOne(id);
    await this.tableRepo.remove(table);
  }
}
