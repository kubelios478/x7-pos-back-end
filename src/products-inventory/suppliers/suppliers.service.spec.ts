/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuppliersService } from './suppliers.service';
import { Supplier } from './entities/supplier.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { GetSuppliersQueryDto } from './dto/get-suppliers-query.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';

// Mock the ErrorHandler
jest.mock('src/common/utils/error-handler.util', () => ({
  ErrorHandler: {
    differentMerchant: jest.fn(() => {
      throw new Error('Different merchant');
    }),
    exists: jest.fn((message) => {
      throw new Error(message);
    }),
    handleDatabaseError: jest.fn((error) => {
      throw error;
    }),
    notFound: jest.fn((message) => {
      throw new Error(message);
    }),
    invalidId: jest.fn((message) => {
      throw new Error(message);
    }),
    changedMerchant: jest.fn(() => {
      throw new Error('Cannot change merchant');
    }),
  },
}));

const mockSupplierRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockMerchantRepository = {
  findOne: jest.fn(),
};

const mockAuthenticatedUser: AuthenticatedUser = {
  id: 1,
  email: 'test@example.com',
  merchant: {
    id: 1,
    name: 'Test Merchant',
  },
  roles: [],
  scopes: [],
};

const mockSupplier: Supplier = {
  id: 1,
  name: 'Test Supplier',
  contactInfo: 'Test Contact',
  merchantId: 1,
  isActive: true,
  merchant: {
    id: 1,
    name: 'Test Merchant',
  } as Merchant,
  purchaseOrders: [],
};

describe('SuppliersService', () => {
  let service: SuppliersService;
  let supplierRepository: Repository<Supplier>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    supplierRepository = module.get<Repository<Supplier>>(
      getRepositoryToken(Supplier),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createSupplierDto: CreateSupplierDto = {
      name: 'New Supplier',
      contactInfo: 'New Contact',
      merchantId: 1,
    };

    it('should create a new supplier', async () => {
      mockSupplierRepository.findOne.mockResolvedValue(null);
      mockSupplierRepository.create.mockReturnValue(mockSupplier);
      mockSupplierRepository.save.mockResolvedValue(mockSupplier);

      // Mock the findOne call within the create method
      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({
        statusCode: 201,
        message: 'Supplier Created successfully',
        data: {
          id: mockSupplier.id,
          name: mockSupplier.name,
          contactInfo: mockSupplier.contactInfo,
          merchant: {
            id: mockSupplier.merchant.id,
            name: mockSupplier.merchant.name,
          },
        },
      });

      const result = await service.create(
        mockAuthenticatedUser,
        createSupplierDto,
      );

      expect(mockSupplierRepository.findOne).toHaveBeenCalledWith({
        where: {
          name: createSupplierDto.name,
          merchantId: mockAuthenticatedUser.merchant.id,
          isActive: true,
        },
      });
      expect(mockSupplierRepository.create).toHaveBeenCalledWith(
        createSupplierDto,
      );
      expect(mockSupplierRepository.save).toHaveBeenCalledWith(mockSupplier);
      expect(result.data.name).toBe(mockSupplier.name);
      findOneSpy.mockRestore();
    });

    it('should throw an error if supplier name already exists', async () => {
      mockSupplierRepository.findOne.mockResolvedValue(mockSupplier);
      await expect(
        service.create(mockAuthenticatedUser, createSupplierDto),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_NAME_EXISTS);
      expect(ErrorHandler.exists).toHaveBeenCalledWith(
        ErrorMessage.SUPPLIER_NAME_EXISTS,
      );
    });

    it('should activate an existing inactive supplier', async () => {
      mockSupplierRepository.findOne
        .mockResolvedValueOnce(null) // for active supplier check
        .mockResolvedValueOnce({ ...mockSupplier, isActive: false }); // for inactive supplier check

      mockSupplierRepository.save.mockResolvedValue({
        ...mockSupplier,
        isActive: true,
      });

      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({
        statusCode: 201,
        message: 'Supplier Created successfully',
        data: {
          id: mockSupplier.id,
          name: mockSupplier.name,
          contactInfo: mockSupplier.contactInfo,
          merchant: {
            id: mockSupplier.merchant.id,
            name: mockSupplier.merchant.name,
          },
        },
      });

      const result = await service.create(
        mockAuthenticatedUser,
        createSupplierDto,
      );

      expect(result.data.name).toBe(mockSupplier.name);
      expect(mockSupplierRepository.save).toHaveBeenCalledWith({
        ...mockSupplier,
        isActive: true,
      });
      findOneSpy.mockRestore();
    });
  });

  describe('findAll', () => {
    const getSuppliersQueryDto: GetSuppliersQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return a paginated list of suppliers', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSupplier]),
      };
      mockSupplierRepository.createQueryBuilder.mockReturnValue(
        queryBuilder as any,
      );

      const result = await service.findAll(
        getSuppliersQueryDto,
        mockAuthenticatedUser.merchant.id,
      );

      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe(mockSupplier.name);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'supplier.merchantId = :merchantId',
        { merchantId: mockAuthenticatedUser.merchant.id },
      );
    });
  });

  describe('findOne', () => {
    it('should return a single supplier', async () => {
      mockSupplierRepository.findOne.mockResolvedValue(mockSupplier);
      const result = await service.findOne(
        mockSupplier.id,
        mockAuthenticatedUser.merchant.id,
      );
      expect(result.data.name).toBe(mockSupplier.name);
      expect(mockSupplierRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: mockSupplier.id,
          merchantId: mockAuthenticatedUser.merchant.id,
          isActive: true,
        },
        relations: ['merchant'],
      });
    });

    it('should throw an error if supplier is not found', async () => {
      mockSupplierRepository.findOne.mockResolvedValue(null);
      await expect(
        service.findOne(999, mockAuthenticatedUser.merchant.id),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_NOT_FOUND);
      expect(ErrorHandler.notFound).toHaveBeenCalledWith(
        ErrorMessage.SUPPLIER_NOT_FOUND,
      );
    });

    it('should throw an error for invalid id', async () => {
      await expect(
        service.findOne(0, mockAuthenticatedUser.merchant.id),
      ).rejects.toThrow('Supplier ID incorrect');
      expect(ErrorHandler.invalidId).toHaveBeenCalledWith(
        'Supplier ID incorrect',
      );
    });
  });

  describe('update', () => {
    const updateSupplierDto: UpdateSupplierDto = {
      name: 'Updated Supplier',
    };

    it('should update a supplier', async () => {
      mockSupplierRepository.findOneBy.mockResolvedValue(mockSupplier);
      mockSupplierRepository.findOne.mockResolvedValue(null); // for name check
      mockSupplierRepository.save.mockResolvedValue({
        ...mockSupplier,
        ...updateSupplierDto,
      });

      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({
        statusCode: 201,
        message: 'Supplier Updated successfully',
        data: {
          id: mockSupplier.id,
          name: updateSupplierDto.name!,
          contactInfo: mockSupplier.contactInfo,
          merchant: {
            id: mockSupplier.merchant.id,
            name: mockSupplier.merchant.name,
          },
        },
      });

      const result = await service.update(
        mockAuthenticatedUser,
        mockSupplier.id,
        updateSupplierDto,
      );
      expect(result.data.name).toBe(updateSupplierDto.name);
      findOneSpy.mockRestore();
    });

    it('should throw an error if supplier to update is not found', async () => {
      mockSupplierRepository.findOneBy.mockResolvedValue(null);
      await expect(
        service.update(mockAuthenticatedUser, 999, updateSupplierDto),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_NOT_FOUND);
    });

    it('should throw an error if updated name already exists', async () => {
      mockSupplierRepository.findOneBy.mockResolvedValue(mockSupplier);
      mockSupplierRepository.findOne.mockResolvedValue({
        id: 2,
        name: 'Updated Supplier',
      }); // Existing supplier with new name
      await expect(
        service.update(
          mockAuthenticatedUser,
          mockSupplier.id,
          updateSupplierDto,
        ),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_NAME_EXISTS);
    });
  });

  describe('remove', () => {
    it('should deactivate a supplier', async () => {
      mockSupplierRepository.findOne.mockResolvedValue(mockSupplier);
      mockSupplierRepository.save.mockResolvedValue({
        ...mockSupplier,
        isActive: false,
      });

      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({
        statusCode: 201,
        message: 'Supplier Deleted successfully',
        data: {
          id: mockSupplier.id,
          name: mockSupplier.name,
          contactInfo: mockSupplier.contactInfo,
          merchant: {
            id: mockSupplier.merchant.id,
            name: mockSupplier.merchant.name,
          },
        },
      });

      const result = await service.remove(
        mockAuthenticatedUser,
        mockSupplier.id,
      );
      expect(result.message).toContain('Deleted');
      expect(mockSupplierRepository.save).toHaveBeenCalledWith({
        ...mockSupplier,
        isActive: false,
      });
      findOneSpy.mockRestore();
    });

    it('should throw an error if supplier to remove is not found', async () => {
      mockSupplierRepository.findOne.mockResolvedValue(null);
      await expect(service.remove(mockAuthenticatedUser, 999)).rejects.toThrow(
        ErrorMessage.SUPPLIER_NOT_FOUND,
      );
    });

    it('should throw an error if user is from a different merchant', async () => {
      mockSupplierRepository.findOne.mockResolvedValue({
        ...mockSupplier,
        merchantId: 2,
      });
      await expect(
        service.remove(mockAuthenticatedUser, mockSupplier.id),
      ).rejects.toThrow('Different merchant');
    });
  });
});
