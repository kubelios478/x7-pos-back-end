// src/companies/companies.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompaniesService } from './companies.service';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let companyRepository: jest.Mocked<Repository<Company>>;

  // Mock data
  const mockCompany: Partial<Company> = {
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
  };

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompanyRepository,
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    companyRepository = module.get(getRepositoryToken(Company));

    jest.clearAllMocks();
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
