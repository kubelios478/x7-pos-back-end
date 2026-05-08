import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InputsService } from './inputs.service';
import { Input } from './entities/input.entity';
import { InputSupplier } from './entities/input-supplier.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';
import { InputUnit } from './constants/input-unit.enum';

describe('InputsService', () => {
  let service: InputsService;
  let merchantRepo: jest.Mocked<Repository<Merchant>>;
  let supplierRepo: jest.Mocked<Repository<Supplier>>;
  let inputRepo: jest.Mocked<Repository<Input>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InputsService,
        {
          provide: getRepositoryToken(Input),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InputSupplier),
          useValue: {
            delete: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(InputsService);
    merchantRepo = module.get(getRepositoryToken(Merchant));
    supplierRepo = module.get(getRepositoryToken(Supplier));
    inputRepo = module.get(getRepositoryToken(Input));
    jest.clearAllMocks();
  });

  it('should reject when merchant is not associated with a company', async () => {
    jest.spyOn(merchantRepo, 'findOne').mockResolvedValue({
      id: 1,
      companyId: 0,
    } as Merchant);
    await expect(
      service.create(1, { code: 'X', name: 'X', unit: InputUnit.UNIT }),
    ).rejects.toThrow('Merchant is not associated with a company');
  });

  it('should enforce unique input code per company', async () => {
    jest.spyOn(merchantRepo, 'findOne').mockResolvedValue({
      id: 1,
      companyId: 10,
    } as Merchant);
    jest.spyOn(inputRepo, 'findOne').mockResolvedValue({
      id: 1,
      company_id: 10,
      code: 'X',
    } as Input);

    await expect(
      service.create(1, { code: 'X', name: 'X', unit: InputUnit.UNIT }),
    ).rejects.toThrow('Input code already exists for this company');
  });

  it('should reject supplier association when suppliers are outside the company', async () => {
    jest.spyOn(merchantRepo, 'findOne').mockResolvedValue({
      id: 1,
      companyId: 10,
    } as Merchant);
    jest.spyOn(inputRepo, 'findOne').mockResolvedValue({
      id: 1,
      company_id: 10,
      isActive: true,
    } as Input);
    jest
      .spyOn(supplierRepo, 'find')
      .mockResolvedValue([
        { id: 1, company_id: 10, isActive: true } as Supplier,
      ]);

    await expect(service.setSuppliers(1, 1, [1, 2])).rejects.toThrow(
      'One or more suppliers were not found for this company',
    );
  });
});
