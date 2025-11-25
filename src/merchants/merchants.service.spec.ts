// src/merchants/merchants.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantsService } from './merchants.service';
import { Merchant } from './entities/merchant.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateMerchantDto } from './dtos/create-merchant.dto';
import { UpdateMerchantDto } from './dtos/update-merchant.dto';

describe('MerchantsService', () => {
  let service: MerchantsService;
  let merchantRepository: jest.Mocked<Repository<Merchant>>;
  let companyRepository: jest.Mocked<Repository<Company>>;

  // Mock data
  const mockCompany = {
    id: 1,
    name: 'Test Company',
    email: 'test@company.com',
  };

  const mockMerchant: Partial<Merchant> = {
    id: 1,
    name: 'Test Merchant',
    email: 'merchant@test.com',
    phone: '1234567890',
    rut: '12345678-9',
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    companyId: 1,
    company: mockCompany as Company,
    users: [],
  };

  const mockCreateMerchantDto: CreateMerchantDto = {
    name: 'New Merchant',
    email: 'new@merchant.com',
    phone: '9876543210',
    rut: '98765432-1',
    address: '456 New St',
    city: 'New City',
    state: 'New State',
    country: 'New Country',
    companyId: 1,
  };

  const mockUpdateMerchantDto: UpdateMerchantDto = {
    name: 'Updated Merchant',
    email: 'updated@merchant.com',
  };

  beforeEach(async () => {
    const mockMerchantRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const mockCompanyRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantsService,
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompanyRepository,
        },
      ],
    }).compile();

    service = module.get<MerchantsService>(MerchantsService);
    merchantRepository = module.get(getRepositoryToken(Merchant));
    companyRepository = module.get(getRepositoryToken(Company));

    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have merchantRepository defined', () => {
      expect(merchantRepository).toBeDefined();
    });

    it('should have companyRepository defined', () => {
      expect(companyRepository).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a new merchant successfully with companyId', async () => {
      const createSpy = jest.spyOn(merchantRepository, 'create');
      const saveSpy = jest.spyOn(merchantRepository, 'save');
      const companyFindSpy = jest.spyOn(companyRepository, 'findOne');

      companyFindSpy.mockResolvedValue(mockCompany as Company);
      createSpy.mockReturnValue(mockMerchant as Merchant);
      saveSpy.mockResolvedValue(mockMerchant as Merchant);

      const result = await service.create(mockCreateMerchantDto);

      expect(companyFindSpy).toHaveBeenCalledWith({
        where: { id: mockCreateMerchantDto.companyId },
      });
      expect(createSpy).toHaveBeenCalledWith({
        name: mockCreateMerchantDto.name,
        email: mockCreateMerchantDto.email,
        phone: mockCreateMerchantDto.phone,
        rut: mockCreateMerchantDto.rut,
        address: mockCreateMerchantDto.address,
        city: mockCreateMerchantDto.city,
        state: mockCreateMerchantDto.state,
        country: mockCreateMerchantDto.country,
        companyId: mockCreateMerchantDto.companyId,
      });
      expect(saveSpy).toHaveBeenCalledWith(mockMerchant);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Merchant created successfully',
        data: mockMerchant,
      });
    });

    it('should create a merchant without companyId', async () => {
      const dtoWithoutCompany = {
        ...mockCreateMerchantDto,
      };
      // Remove companyId to test optional behavior
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { companyId, ...dtoWithoutCompanyId } = dtoWithoutCompany;

      const createSpy = jest.spyOn(merchantRepository, 'create');
      const saveSpy = jest.spyOn(merchantRepository, 'save');
      const companyFindSpy = jest.spyOn(companyRepository, 'findOne');

      createSpy.mockReturnValue(mockMerchant as Merchant);
      saveSpy.mockResolvedValue(mockMerchant as Merchant);

      const result = await service.create(
        dtoWithoutCompanyId as CreateMerchantDto,
      );

      expect(companyFindSpy).not.toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalledWith(mockMerchant);
      expect(result.statusCode).toBe(201);
    });

    it('should throw error for invalid companyId format (negative)', async () => {
      const invalidDto = { ...mockCreateMerchantDto, companyId: -1 };

      await expect(service.create(invalidDto)).rejects.toThrow();
    });

    it('should create merchant when companyId is zero (falsy value)', async () => {
      const invalidDto = { ...mockCreateMerchantDto, companyId: 0 };

      const createSpy = jest.spyOn(merchantRepository, 'create');
      const saveSpy = jest.spyOn(merchantRepository, 'save');
      const companyFindSpy = jest.spyOn(companyRepository, 'findOne');

      createSpy.mockReturnValue(mockMerchant as Merchant);
      saveSpy.mockResolvedValue(mockMerchant as Merchant);

      const result = await service.create(invalidDto);

      // companyId: 0 is falsy, so company lookup is skipped
      expect(companyFindSpy).not.toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
    });

    it('should throw error for invalid companyId format (float)', async () => {
      const invalidDto = { ...mockCreateMerchantDto, companyId: 1.5 };

      await expect(service.create(invalidDto)).rejects.toThrow();
    });

    it('should throw error when company not found', async () => {
      const companyFindSpy = jest.spyOn(companyRepository, 'findOne');
      companyFindSpy.mockResolvedValue(null);

      await expect(service.create(mockCreateMerchantDto)).rejects.toThrow();
      expect(companyFindSpy).toHaveBeenCalledWith({
        where: { id: mockCreateMerchantDto.companyId },
      });
    });

    it('should handle database errors during creation', async () => {
      const createSpy = jest.spyOn(merchantRepository, 'create');
      const saveSpy = jest.spyOn(merchantRepository, 'save');
      const companyFindSpy = jest.spyOn(companyRepository, 'findOne');

      companyFindSpy.mockResolvedValue(mockCompany as Company);
      createSpy.mockReturnValue(mockMerchant as Merchant);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateMerchantDto)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });

  describe('findAll', () => {
    it('should return all merchants successfully', async () => {
      const merchants = [mockMerchant as Merchant];
      const findSpy = jest.spyOn(merchantRepository, 'find');
      findSpy.mockResolvedValue(merchants);

      const result = await service.findAll();

      expect(findSpy).toHaveBeenCalledWith({
        relations: ['company', 'users'],
        select: {
          users: {
            id: true,
            username: true,
            email: true,
            role: true,
            scope: true,
          },
        },
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchants retrieved successfully',
        data: merchants,
      });
    });

    it('should return empty array when no merchants found', async () => {
      const findSpy = jest.spyOn(merchantRepository, 'find');
      findSpy.mockResolvedValue([]);

      const result = await service.findAll();

      expect(findSpy).toHaveBeenCalledWith({
        relations: ['company', 'users'],
        select: {
          users: {
            id: true,
            username: true,
            email: true,
            role: true,
            scope: true,
          },
        },
      });
      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Merchants retrieved successfully');
    });
  });

  describe('findOne', () => {
    it('should return a merchant by ID successfully', async () => {
      const findOneSpy = jest.spyOn(merchantRepository, 'findOne');
      findOneSpy.mockResolvedValue(mockMerchant as Merchant);

      const result = await service.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['company', 'users'],
        select: {
          users: {
            id: true,
            username: true,
            email: true,
            role: true,
            scope: true,
          },
        },
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant retrieved successfully',
        data: mockMerchant,
      });
    });

    it('should throw error for invalid ID (zero)', async () => {
      await expect(service.findOne(0)).rejects.toThrow();
    });

    it('should throw error for invalid ID (negative)', async () => {
      await expect(service.findOne(-1)).rejects.toThrow();
    });

    it('should throw error for invalid ID (float)', async () => {
      await expect(service.findOne(1.5)).rejects.toThrow();
    });

    it('should throw error when merchant not found', async () => {
      const findOneSpy = jest.spyOn(merchantRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow();
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['company', 'users'],
        select: {
          users: {
            id: true,
            username: true,
            email: true,
            role: true,
            scope: true,
          },
        },
      });
    });
  });

  describe('update', () => {
    it('should update a merchant successfully', async () => {
      const updatedMerchant = { ...mockMerchant, ...mockUpdateMerchantDto };
      const findOneSpy = jest.spyOn(merchantRepository, 'findOne');
      const saveSpy = jest.spyOn(merchantRepository, 'save');

      findOneSpy.mockResolvedValue(mockMerchant as Merchant);
      saveSpy.mockResolvedValue(updatedMerchant as Merchant);

      const result = await service.update(1, mockUpdateMerchantDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['company', 'users'],
        select: {
          users: {
            id: true,
            username: true,
            email: true,
            role: true,
            scope: true,
          },
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant updated successfully',
        data: updatedMerchant,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(service.update(0, mockUpdateMerchantDto)).rejects.toThrow();
    });

    it('should throw error when merchant to update not found', async () => {
      const findOneSpy = jest.spyOn(merchantRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateMerchantDto),
      ).rejects.toThrow();
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(merchantRepository, 'findOne');
      const saveSpy = jest.spyOn(merchantRepository, 'save');

      findOneSpy.mockResolvedValue(mockMerchant as Merchant);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.update(1, mockUpdateMerchantDto)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });

  describe('remove', () => {
    it('should delete a merchant successfully', async () => {
      const findOneSpy = jest.spyOn(merchantRepository, 'findOne');
      const removeSpy = jest.spyOn(merchantRepository, 'remove');

      findOneSpy.mockResolvedValue(mockMerchant as Merchant);
      removeSpy.mockResolvedValue(mockMerchant as Merchant);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(removeSpy).toHaveBeenCalledWith(mockMerchant);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant deleted successfully',
        data: mockMerchant,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when merchant to delete not found', async () => {
      const findOneSpy = jest.spyOn(merchantRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow();
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });

    it('should handle database errors during removal', async () => {
      const findOneSpy = jest.spyOn(merchantRepository, 'findOne');
      const removeSpy = jest.spyOn(merchantRepository, 'remove');

      findOneSpy.mockResolvedValue(mockMerchant as Merchant);
      removeSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.remove(1)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with Merchant repository', () => {
      expect(merchantRepository).toBeDefined();
      expect(typeof merchantRepository.create).toBe('function');
      expect(typeof merchantRepository.save).toBe('function');
      expect(typeof merchantRepository.find).toBe('function');
      expect(typeof merchantRepository.findOne).toBe('function');
      expect(typeof merchantRepository.remove).toBe('function');
    });

    it('should properly integrate with Company repository', () => {
      expect(companyRepository).toBeDefined();
      expect(typeof companyRepository.findOne).toBe('function');
    });
  });
});
