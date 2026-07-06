// src/platform-saas/companies/companies.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompaniesService } from './companies.service';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Customer } from 'src/core/business-partners/customers/entities/customer.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';
import { Configuration } from 'src/core/configuration/entity/configuration-entity';
import { UserRole } from '../users/constants/role.enum';
import { Scope } from '../users/constants/scope.enum';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let companyRepository: jest.Mocked<Repository<Company>>;
  let merchantRepository: jest.Mocked<Repository<Merchant>>;
  let customerRepository: jest.Mocked<Repository<Customer>>;
  let supplierRepository: jest.Mocked<Repository<Supplier>>;
  let configurationRepository: jest.Mocked<Repository<Configuration>>;

  const mockMerchantAdmin: AuthenticatedUser = {
    id: 1,
    email: 'admin@test.com',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: { id: 10 },
  };

  // Mock data
  const baseMockCompany: Partial<Company> = {
    id: 1,
    name: 'Test Company',
    email: 'test@company.com',
    phone: '1234567890',
    rut: '12345678-9',
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    merchants: [],
    configurations: [],
    suppliers: [],
  };

  let mockCompany: Partial<Company>;

  const mockCreateCompanyDto: CreateCompanyDto = {
    name: 'New Company',
    email: 'new@company.com',
    phone: '9876543210',
    rut: '98765432-1',
    address: '456 New St',
    city: 'New City',
    state: 'New State',
    country: 'New Country',
  };

  const mockUpdateCompanyDto: UpdateCompanyDto = {
    name: 'Updated Company',
    email: 'updated@company.com',
  };

  beforeEach(async () => {
    const mockCompanyRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const mockMerchantRepository = {
      findOne: jest.fn(),
      count: jest.fn(),
    };

    const mockCustomerRepository = {
      count: jest.fn(),
    };

    const mockSupplierRepository = {
      count: jest.fn(),
    };

    const mockConfigurationRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompanyRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepository,
        },
        {
          provide: getRepositoryToken(Configuration),
          useValue: mockConfigurationRepository,
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    companyRepository = module.get(getRepositoryToken(Company));
    merchantRepository = module.get(getRepositoryToken(Merchant));
    customerRepository = module.get(getRepositoryToken(Customer));
    supplierRepository = module.get(getRepositoryToken(Supplier));
    configurationRepository = module.get(getRepositoryToken(Configuration));

    jest.clearAllMocks();
    companyRepository.findOne.mockReset();
    companyRepository.save.mockReset();
    merchantRepository.findOne.mockReset();
    merchantRepository.count.mockReset();
    customerRepository.count.mockReset();
    supplierRepository.count.mockReset();
    configurationRepository.find.mockReset();
    mockCompany = { ...baseMockCompany };
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have companyRepository defined', () => {
      expect(companyRepository).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a new company successfully', async () => {
      const createSpy = jest.spyOn(companyRepository, 'create');
      const saveSpy = jest.spyOn(companyRepository, 'save');

      createSpy.mockReturnValue(mockCompany as Company);
      saveSpy.mockResolvedValue(mockCompany as Company);

      const result = await service.create(mockCreateCompanyDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateCompanyDto);
      expect(saveSpy).toHaveBeenCalledWith(mockCompany);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Company created successfully',
        data: mockCompany,
      });
    });

    it('should handle database errors during creation', async () => {
      const createSpy = jest.spyOn(companyRepository, 'create');
      const saveSpy = jest.spyOn(companyRepository, 'save');

      createSpy.mockReturnValue(mockCompany as Company);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateCompanyDto)).rejects.toThrow(
        'Database operation failed',
      );
      expect(createSpy).toHaveBeenCalledWith(mockCreateCompanyDto);
      expect(saveSpy).toHaveBeenCalledWith(mockCompany);
    });
  });

  describe('findAll', () => {
    it('should return all companies successfully', async () => {
      const companies = [mockCompany as Company];
      const findSpy = jest.spyOn(companyRepository, 'find');
      findSpy.mockResolvedValue(companies);

      const result = await service.findAll();

      expect(findSpy).toHaveBeenCalledWith({ relations: ['merchants'] });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Companies retrieved successfully',
        data: companies,
      });
    });

    it('should return empty array when no companies found', async () => {
      const findSpy = jest.spyOn(companyRepository, 'find');
      findSpy.mockResolvedValue([]);

      const result = await service.findAll();

      expect(findSpy).toHaveBeenCalledWith({ relations: ['merchants'] });
      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Companies retrieved successfully');
    });
  });

  describe('findOne', () => {
    it('should return a company by ID successfully', async () => {
      const findOneSpy = jest.spyOn(companyRepository, 'findOne');
      findOneSpy.mockResolvedValue(mockCompany as Company);

      const result = await service.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchants'],
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Company retrieved successfully',
        data: mockCompany,
      });
    });

    it('should throw error for invalid ID (null)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await expect(service.findOne(null as any)).rejects.toThrow();
    });

    it('should throw error for invalid ID (zero)', async () => {
      await expect(service.findOne(0)).rejects.toThrow();
    });

    it('should throw error for invalid ID (negative)', async () => {
      await expect(service.findOne(-1)).rejects.toThrow();
    });

    it('should throw error when company not found', async () => {
      const findOneSpy = jest.spyOn(companyRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow();
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['merchants'],
      });
    });
  });

  describe('update', () => {
    it('should update a company successfully', async () => {
      const updatedCompany = { ...mockCompany, ...mockUpdateCompanyDto };
      const findOneSpy = jest.spyOn(companyRepository, 'findOne');
      const saveSpy = jest.spyOn(companyRepository, 'save');

      findOneSpy.mockResolvedValue(mockCompany as Company);
      saveSpy.mockResolvedValue(updatedCompany as Company);

      const result = await service.update(1, mockUpdateCompanyDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchants'],
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Company updated successfully',
        data: updatedCompany,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(service.update(0, mockUpdateCompanyDto)).rejects.toThrow();
    });

    it('should throw error when company to update not found', async () => {
      const findOneSpy = jest.spyOn(companyRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.update(999, mockUpdateCompanyDto)).rejects.toThrow();
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['merchants'],
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(companyRepository, 'findOne');
      const saveSpy = jest.spyOn(companyRepository, 'save');

      findOneSpy.mockResolvedValue(mockCompany as Company);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.update(1, mockUpdateCompanyDto)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });

  describe('remove', () => {
    it('should delete a company successfully', async () => {
      const findOneSpy = jest.spyOn(companyRepository, 'findOne');
      const removeSpy = jest.spyOn(companyRepository, 'remove');

      findOneSpy.mockResolvedValue(mockCompany as Company);
      removeSpy.mockResolvedValue(mockCompany as Company);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(removeSpy).toHaveBeenCalledWith(mockCompany);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Company deleted successfully',
        data: mockCompany,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when company to delete not found', async () => {
      const findOneSpy = jest.spyOn(companyRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow();
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('getProfileForUser', () => {
    it('should return company profile with metrics', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue({
        id: 10,
        companyId: 1,
      } as Merchant);
      jest.spyOn(companyRepository, 'findOne').mockResolvedValue(
        mockCompany as Company,
      );
      jest.spyOn(merchantRepository, 'count').mockResolvedValue(3);
      jest.spyOn(customerRepository, 'count').mockResolvedValue(12);
      jest.spyOn(supplierRepository, 'count').mockResolvedValue(4);

      const result = await service.getProfileForUser(mockMerchantAdmin);

      expect(result.data).toEqual({
        id: 1,
        name: 'Test Company',
        email: 'test@company.com',
        phone: '1234567890',
        rut: '12345678-9',
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        metrics: {
          activeMerchantBranches: 3,
          globalCorporateCustomers: 12,
          authorizedMasterSuppliers: 4,
        },
      });
    });
  });

  describe('updateProfileForUser', () => {
    it('should update company profile and return refreshed metrics', async () => {
      const updatedCompany = { ...mockCompany, name: 'Updated Corp' };
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue({
        id: 10,
        companyId: 1,
      } as Merchant);
      jest
        .spyOn(companyRepository, 'findOne')
        .mockResolvedValueOnce(mockCompany as Company)
        .mockResolvedValueOnce(updatedCompany as Company);
      jest.spyOn(companyRepository, 'save').mockResolvedValue(
        updatedCompany as Company,
      );
      jest.spyOn(merchantRepository, 'count').mockResolvedValue(1);
      jest.spyOn(customerRepository, 'count').mockResolvedValue(0);
      jest.spyOn(supplierRepository, 'count').mockResolvedValue(0);

      const result = await service.updateProfileForUser(mockMerchantAdmin, {
        name: 'Updated Corp',
        rut: mockCompany.rut!,
        email: mockCompany.email!,
        phone: mockCompany.phone!,
        address: mockCompany.address!,
        city: mockCompany.city!,
        state: mockCompany.state!,
        country: mockCompany.country!,
      });

      expect(result.data.name).toBe('Updated Corp');
      expect(result.message).toBe('Company profile updated successfully');
    });
  });

  describe('getConfigurationsForUser', () => {
    it('should return company configuration registry', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue({
        id: 10,
        companyId: 1,
      } as Merchant);
      jest.spyOn(configurationRepository, 'find').mockResolvedValue([
        {
          id: 5,
          type: 'merchant_tax_rule',
          status: 'active',
          merchant_id: 38,
          merchant: { id: 38, name: 'Downtown Bistro' },
          updatedAt: new Date('2026-06-18'),
        },
      ] as unknown as Configuration[]);

      const result = await service.getConfigurationsForUser(mockMerchantAdmin);

      expect(result.data.summary.totalConfigurations).toBe(1);
      expect(result.data.items[0]).toMatchObject({
        configurationLabel: 'Tax Rules',
        merchantName: 'Downtown Bistro',
        status: 'active',
      });
    });
  });

  describe('findOne with ownership', () => {
    it('should forbid merchant admin accessing another company', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue({
        id: 10,
        companyId: 1,
      } as Merchant);

      await expect(
        service.findOne(99, mockMerchantAdmin),
      ).rejects.toThrow();
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with Company repository', () => {
      expect(companyRepository).toBeDefined();
      expect(typeof companyRepository.create).toBe('function');
      expect(typeof companyRepository.save).toBe('function');
      expect(typeof companyRepository.find).toBe('function');
      expect(typeof companyRepository.findOne).toBe('function');
      expect(typeof companyRepository.remove).toBe('function');
    });
  });
});
