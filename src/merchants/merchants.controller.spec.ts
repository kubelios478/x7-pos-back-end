// src/merchants/merchants.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dtos/create-merchant.dto';
import { UpdateMerchantDto } from './dtos/update-merchant.dto';
import {
  OneMerchantResponseDto,
  AllMerchantsResponseDto,
} from './dtos/merchant-response.dto';

describe('MerchantsController', () => {
  let controller: MerchantsController;
  let merchantsService: jest.Mocked<MerchantsService>;

  // Mock data
  const mockMerchant: Partial<any> = {
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
    company: {
      id: 1,
      name: 'Test Company',
    },
    users: [],
    customers: [],
    categories: [],
    products: [],
    suppliers: [],
    tables: [],
    collaborators: [],
    shifts: [],
    shiftAssignments: [],
    tableAssignments: [],
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

  const mockOneMerchantResponse: OneMerchantResponseDto = {
    statusCode: 200,
    message: 'Merchant retrieved successfully',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    data: mockMerchant as any,
  };

  const mockAllMerchantsResponse: AllMerchantsResponseDto = {
    statusCode: 200,
    message: 'Merchants retrieved successfully',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    data: [mockMerchant as any],
  };

  beforeEach(async () => {
    // Mock MerchantsService
    const mockMerchantsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantsController],
      providers: [
        {
          provide: MerchantsService,
          useValue: mockMerchantsService,
        },
      ],
    }).compile();

    controller = module.get<MerchantsController>(MerchantsController);
    merchantsService = module.get(MerchantsService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have merchantsService defined', () => {
      expect(merchantsService).toBeDefined();
    });
  });

  describe('POST /merchants (create)', () => {
    it('should create a new merchant successfully', async () => {
      const createResponse: OneMerchantResponseDto = {
        statusCode: 201,
        message: 'Merchant created successfully',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: mockMerchant as any,
      };

      const createSpy = jest.spyOn(merchantsService, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreateMerchantDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateMerchantDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle service errors during creation', async () => {
      const errorMessage = 'Database operation failed';
      const createSpy = jest.spyOn(merchantsService, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(mockCreateMerchantDto)).rejects.toThrow(
        errorMessage,
      );
      expect(createSpy).toHaveBeenCalledWith(mockCreateMerchantDto);
    });

    it('should handle validation errors during creation', async () => {
      const errorMessage = 'Invalid input data provided';
      const createSpy = jest.spyOn(merchantsService, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(mockCreateMerchantDto)).rejects.toThrow(
        errorMessage,
      );
      expect(createSpy).toHaveBeenCalledWith(mockCreateMerchantDto);
    });

    it('should handle company not found errors', async () => {
      const errorMessage = 'Company with ID 1 not found';
      const createSpy = jest.spyOn(merchantsService, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(mockCreateMerchantDto)).rejects.toThrow(
        errorMessage,
      );
      expect(createSpy).toHaveBeenCalledWith(mockCreateMerchantDto);
    });
  });

  describe('GET /merchants (findAll)', () => {
    it('should return all merchants successfully', async () => {
      const findAllSpy = jest.spyOn(merchantsService, 'findAll');
      findAllSpy.mockResolvedValue(mockAllMerchantsResponse);

      const result = await controller.findAll();

      expect(findAllSpy).toHaveBeenCalled();
      expect(result).toEqual(mockAllMerchantsResponse);
    });

    it('should handle empty merchant list', async () => {
      const emptyResponse: AllMerchantsResponseDto = {
        statusCode: 200,
        message: 'Merchants retrieved successfully',
        data: [],
      };
      const findAllSpy = jest.spyOn(merchantsService, 'findAll');
      findAllSpy.mockResolvedValue(emptyResponse);

      const result = await controller.findAll();

      expect(findAllSpy).toHaveBeenCalled();
      expect(result).toEqual(emptyResponse);
      expect(result.data).toHaveLength(0);
    });

    it('should handle service errors in findAll', async () => {
      const errorMessage = 'Database connection failed';
      const findAllSpy = jest.spyOn(merchantsService, 'findAll');
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findAll()).rejects.toThrow(errorMessage);
      expect(findAllSpy).toHaveBeenCalled();
    });
  });

  describe('GET /merchants/:id (findOne)', () => {
    it('should return a merchant by ID successfully', async () => {
      const merchantId = 1;
      const findOneSpy = jest.spyOn(merchantsService, 'findOne');
      findOneSpy.mockResolvedValue(mockOneMerchantResponse);

      const result = await controller.findOne(merchantId);

      expect(findOneSpy).toHaveBeenCalledWith(merchantId);
      expect(result).toEqual(mockOneMerchantResponse);
    });

    it('should handle merchant not found', async () => {
      const merchantId = 999;
      const errorMessage = 'Merchant not found';
      const findOneSpy = jest.spyOn(merchantsService, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(merchantId)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(merchantId);
    });

    it('should handle invalid ID parameter', async () => {
      const merchantId = 0;
      const errorMessage = 'Merchant ID must be a positive integer';
      const findOneSpy = jest.spyOn(merchantsService, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(merchantId)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(merchantId);
    });
  });

  describe('PUT /merchants/:id (update)', () => {
    it('should update merchant successfully', async () => {
      const merchantId = 1;
      const updatedMerchantResponse: OneMerchantResponseDto = {
        statusCode: 200,
        message: 'Merchant updated successfully',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { ...mockMerchant, ...mockUpdateMerchantDto } as any,
      };

      const updateSpy = jest.spyOn(merchantsService, 'update');
      updateSpy.mockResolvedValue(updatedMerchantResponse);

      const result = await controller.update(merchantId, mockUpdateMerchantDto);

      expect(updateSpy).toHaveBeenCalledWith(merchantId, mockUpdateMerchantDto);
      expect(result).toEqual(updatedMerchantResponse);
    });

    it('should handle update merchant not found', async () => {
      const merchantId = 999;
      const errorMessage = 'Merchant not found';

      const updateSpy = jest.spyOn(merchantsService, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(merchantId, mockUpdateMerchantDto),
      ).rejects.toThrow(errorMessage);
      expect(updateSpy).toHaveBeenCalledWith(merchantId, mockUpdateMerchantDto);
    });

    it('should handle validation errors during update', async () => {
      const merchantId = 1;
      const errorMessage = 'Invalid input data provided';

      const updateSpy = jest.spyOn(merchantsService, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(merchantId, mockUpdateMerchantDto),
      ).rejects.toThrow(errorMessage);
      expect(updateSpy).toHaveBeenCalledWith(merchantId, mockUpdateMerchantDto);
    });

    it('should handle invalid ID during update', async () => {
      const merchantId = 0;
      const errorMessage = 'Merchant ID must be a positive integer';

      const updateSpy = jest.spyOn(merchantsService, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(merchantId, mockUpdateMerchantDto),
      ).rejects.toThrow(errorMessage);
      expect(updateSpy).toHaveBeenCalledWith(merchantId, mockUpdateMerchantDto);
    });
  });

  describe('DELETE /merchants/:id (remove)', () => {
    it('should delete merchant successfully', async () => {
      const merchantId = 1;
      const deleteResponse: OneMerchantResponseDto = {
        statusCode: 200,
        message: 'Merchant deleted successfully',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: mockMerchant as any,
      };

      const removeSpy = jest.spyOn(merchantsService, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(merchantId);

      expect(removeSpy).toHaveBeenCalledWith(merchantId);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle delete merchant not found', async () => {
      const merchantId = 999;
      const errorMessage = 'Merchant not found';

      const removeSpy = jest.spyOn(merchantsService, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(merchantId)).rejects.toThrow(errorMessage);
      expect(removeSpy).toHaveBeenCalledWith(merchantId);
    });

    it('should handle invalid ID during deletion', async () => {
      const merchantId = 0;
      const errorMessage = 'Merchant ID must be a positive integer';

      const removeSpy = jest.spyOn(merchantsService, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(merchantId)).rejects.toThrow(errorMessage);
      expect(removeSpy).toHaveBeenCalledWith(merchantId);
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with MerchantsService', () => {
      expect(controller['merchantsService']).toBe(merchantsService);
    });

    it('should call service methods with correct parameters', async () => {
      // Test that controller passes parameters correctly to service
      const createSpy = jest.spyOn(merchantsService, 'create');
      const findAllSpy = jest.spyOn(merchantsService, 'findAll');
      const findOneSpy = jest.spyOn(merchantsService, 'findOne');
      const updateSpy = jest.spyOn(merchantsService, 'update');
      const removeSpy = jest.spyOn(merchantsService, 'remove');

      await controller.create(mockCreateMerchantDto);
      await controller.findAll();
      await controller.findOne(1);
      await controller.update(1, mockUpdateMerchantDto);
      await controller.remove(1);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(findAllSpy).toHaveBeenCalledTimes(1);
      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(removeSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle all service method calls appropriately', async () => {
      // Mock all service methods to return appropriate responses
      const createSpy = jest.spyOn(merchantsService, 'create');
      const findAllSpy = jest.spyOn(merchantsService, 'findAll');
      const findOneSpy = jest.spyOn(merchantsService, 'findOne');
      const updateSpy = jest.spyOn(merchantsService, 'update');
      const removeSpy = jest.spyOn(merchantsService, 'remove');

      createSpy.mockResolvedValue({
        statusCode: 201,
        message: 'Merchant created successfully',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: mockMerchant as any,
      });
      findAllSpy.mockResolvedValue(mockAllMerchantsResponse);
      findOneSpy.mockResolvedValue(mockOneMerchantResponse);
      updateSpy.mockResolvedValue({
        statusCode: 200,
        message: 'Merchant updated successfully',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: mockMerchant as any,
      });
      removeSpy.mockResolvedValue({
        statusCode: 200,
        message: 'Merchant deleted successfully',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: mockMerchant as any,
      });

      // Call all controller methods
      const createResult = await controller.create(mockCreateMerchantDto);
      const findAllResult = await controller.findAll();
      const findOneResult = await controller.findOne(1);
      const updateResult = await controller.update(1, mockUpdateMerchantDto);
      const removeResult = await controller.remove(1);

      // Verify all calls were made and returned expected results
      expect(createResult.statusCode).toBe(201);
      expect(findAllResult.statusCode).toBe(200);
      expect(findOneResult.statusCode).toBe(200);
      expect(updateResult.statusCode).toBe(200);
      expect(removeResult.statusCode).toBe(200);
    });
  });
});
