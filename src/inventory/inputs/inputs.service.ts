import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Input } from './entities/input.entity';
import { CreateInputDto } from './dto/create-input.dto';
import { UpdateInputDto } from './dto/update-input.dto';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';
import { InputSupplier } from './entities/input-supplier.entity';

@Injectable()
export class InputsService {
  constructor(
    @InjectRepository(Input)
    private readonly inputRepo: Repository<Input>,
    @InjectRepository(InputSupplier)
    private readonly inputSupplierRepo: Repository<InputSupplier>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  async getCompanyIdByMerchantId(merchantId: number): Promise<number> {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
      select: ['companyId'],
    });
    if (!merchant?.companyId) {
      throw new BadRequestException(
        'Merchant is not associated with a company',
      );
    }
    return merchant.companyId;
  }

  async create(merchantId: number, dto: CreateInputDto): Promise<Input> {
    const companyId = await this.getCompanyIdByMerchantId(merchantId);

    const existing = await this.inputRepo.findOne({
      where: { company_id: companyId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException('Input code already exists for this company');
    }

    const input = this.inputRepo.create({
      company_id: companyId,
      code: dto.code,
      name: dto.name,
      unit: dto.unit,
      description: dto.description ?? null,
      isActive: true,
    } as Partial<Input>);

    return await this.inputRepo.save(input);
  }

  async findAll(merchantId: number): Promise<Input[]> {
    const companyId = await this.getCompanyIdByMerchantId(merchantId);
    return await this.inputRepo.find({
      where: { company_id: companyId, isActive: true },
      order: { id: 'DESC' },
    });
  }

  async findOne(merchantId: number, id: number): Promise<Input> {
    const companyId = await this.getCompanyIdByMerchantId(merchantId);
    const input = await this.inputRepo.findOne({
      where: { id, company_id: companyId, isActive: true },
      relations: ['suppliers', 'suppliers.supplier'],
    });
    if (!input) throw new NotFoundException('Input not found');
    return input;
  }

  async update(
    merchantId: number,
    id: number,
    dto: UpdateInputDto,
  ): Promise<Input> {
    const companyId = await this.getCompanyIdByMerchantId(merchantId);
    const input = await this.inputRepo.findOne({
      where: { id, company_id: companyId, isActive: true },
    });
    if (!input) throw new NotFoundException('Input not found');

    if (dto.code && dto.code !== input.code) {
      const existing = await this.inputRepo.findOne({
        where: { company_id: companyId, code: dto.code },
      });
      if (existing) {
        throw new ConflictException(
          'Input code already exists for this company',
        );
      }
      input.code = dto.code;
    }

    if (dto.name !== undefined) input.name = dto.name;
    if (dto.unit !== undefined) input.unit = dto.unit;
    if (dto.description !== undefined)
      input.description = dto.description ?? null;

    return await this.inputRepo.save(input);
  }

  async remove(
    merchantId: number,
    id: number,
  ): Promise<{ statusCode: 200; message: string }> {
    const companyId = await this.getCompanyIdByMerchantId(merchantId);
    const input = await this.inputRepo.findOne({
      where: { id, company_id: companyId, isActive: true },
    });
    if (!input) throw new NotFoundException('Input not found');
    input.isActive = false;
    await this.inputRepo.save(input);
    return { statusCode: 200, message: 'Input deleted successfully' };
  }

  async setSuppliers(
    merchantId: number,
    inputId: number,
    supplierIds: number[],
  ): Promise<Input> {
    const companyId = await this.getCompanyIdByMerchantId(merchantId);

    const input = await this.inputRepo.findOne({
      where: { id: inputId, company_id: companyId, isActive: true },
    });
    if (!input) throw new NotFoundException('Input not found');

    const suppliers = await this.supplierRepo.find({
      where: { id: In(supplierIds), company_id: companyId, isActive: true },
    });
    if (suppliers.length !== supplierIds.length) {
      throw new BadRequestException(
        'One or more suppliers were not found for this company',
      );
    }

    // Replace existing associations.
    await this.inputSupplierRepo.delete({ input: { id: inputId } as Input });

    const rows = suppliers.map((s) =>
      this.inputSupplierRepo.create({
        input: { id: inputId } as Input,
        supplier: { id: s.id } as Supplier,
      } as Partial<InputSupplier>),
    );
    if (rows.length) {
      await this.inputSupplierRepo.save(rows);
    }
    return await this.findOne(merchantId, inputId);
  }
}
