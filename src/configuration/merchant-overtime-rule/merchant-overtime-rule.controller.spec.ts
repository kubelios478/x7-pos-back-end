//src/configuration/merchant-overtime-rule/merchant-overtime-rule.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MerchantOvertimeRuleController } from './merchant-overtime-rule.controller';
import { MerchantOvertimeRuleService } from './merchant-overtime-rule.service';
import { MerchantOvertimeRule } from './entity/merchant-overtime-rule.entity';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { OvertimeCalculationType } from '../constants/overtime-calculation-type.enum';
import { OvertimeRateType } from '../constants/overtime-rate-type.enum';

describe('MerchantTipRuleController', () => {
  let controller: MerchantOvertimeRuleController;
  let service: MerchantOvertimeRuleService;

  // Mock data
  const mockCompany: Company = {
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
    customers: [],
    configurations: [],
  } as Company;

  const mockUser = {
    id: 1,
  } as User;

  const mockMerchantOvertimeRule: MerchantOvertimeRule = {
    id: 1,
    company: mockCompany,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: mockUser,
    updatedBy: mockUser,
    status: 'active',
    name: 'Test Merchant Overtime Rule',
    description: 'Description of the Overtime Rule',
    calculationMethod: OvertimeCalculationType.DAILY,
    rateMethod: OvertimeRateType.MULTIPLIER,
    thresholdHours: 8,
    maxHours: 10,
    rateValue: 200,
    appliesOnHolidays: true,
    appliesOnWeekends: true,
    priority: 10,
  };

  const mockCreateMerchantOvertimeRuleDto = {
    id: 1,
    companyId: mockCompany.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: mockUser.id,
    updatedById: mockUser.id,
    status: 'active',
    name: 'Test Merchant Overtime Rule',
    description: 'Description of the Overtime Rule',
    calculationMethod: OvertimeCalculationType.DAILY,
    rateMethod: OvertimeRateType.MULTIPLIER,
    thresholdHours: 8,
    maxHours: 10,
    rateValue: 200,
    appliesOnHolidays: true,
    appliesOnWeekends: true,
    priority: 10,
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse = {
    statusCode: 200,
    message: 'Merchant Overtime rules retrieved successfully',
    data: [mockMerchantOvertimeRule],
    pagination: mockPagination,
  };

  const mockOneMerchantOvertimeRuleResponseDto = {
    statusCode: 200,
    message: 'Merchant Overtime rule retrieved successfully',
    data: mockMerchantOvertimeRule,
  };

  const mockUpdateMerchantOvertimeRuleDto = {
    id: 1,
    company: mockCompany,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'Test User 2',
    updatedBy: 'Test User 2',
    status: 'inactive',
    name: 'Update Merchant Overtime Rule',
    description: 'Description of the Overtime Rule 2',
    calculationMethod: OvertimeCalculationType.SPECIAL_DAY,
    rateMethod: OvertimeRateType.FIXED_AMOUNT,
    thresholdHours: 16,
    maxHours: 20,
    rateValue: 200,
    appliesOnHolidays: true,
    appliesOnWeekends: true,
    priority: 5,
  };

  beforeEach(async () => {
    const mockMerchantOvertimeRule = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantOvertimeRuleController],
      providers: [
        {
          provide: MerchantOvertimeRuleService,
          useValue: mockMerchantOvertimeRule,
        },
      ],
    }).compile();

    controller = module.get<MerchantOvertimeRuleController>(
      MerchantOvertimeRuleController,
    );
    service = module.get<MerchantOvertimeRuleService>(
      MerchantOvertimeRuleService,
    );
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
    it('should have QrOrderService defined', () => {
      expect(service).toBeDefined();
    });
  });

  //--------------------------------------------------------------
  // POST /merchant-overtime-rule
  //--------------------------------------------------------------
  describe('POST /merchant-overtime-rule', () => {
    it('should create a merchant overtime rule successfully', async () => {
      const expectedResponse = {
        statusCode: 201,
        message: 'Merchant overtime rule created successfully',
        data: mockMerchantOvertimeRule,
      };

      const createSpy = jest
        .spyOn(service, 'create')
        .mockResolvedValue(expectedResponse);
      createSpy.mockResolvedValue(expectedResponse);

      const result = await controller.create(mockCreateMerchantOvertimeRuleDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateMerchantOvertimeRuleDto);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create Merchant Overtime Rule';
      const createSpy = jest
        .spyOn(service, 'create')
        .mockRejectedValue(new Error(errorMessage));
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.create(mockCreateMerchantOvertimeRuleDto),
      ).rejects.toThrow(errorMessage);

      expect(createSpy).toHaveBeenCalledWith(mockCreateMerchantOvertimeRuleDto);
    });
  });
  //--------------------------------------------------------------
  // GET /merchant-overtime-rule
  //--------------------------------------------------------------
  describe('GET /merchant-overtime-rule', () => {
    it('should retrieve all merchant overtime rules successfully', async () => {
      const findAllSpy = jest
        .spyOn(service, 'findAll')
        .mockResolvedValue(mockPaginatedResponse);
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse = {
        statusCode: 200,
        message: 'Merchant overtime rules retrieved successfully',
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      const findAllSpy = jest
        .spyOn(service, 'findAll')
        .mockResolvedValue(emptyPaginatedResponse);
      findAllSpy.mockResolvedValue(emptyPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(emptyPaginatedResponse);
    });

    it('should handle service errors in findAll', async () => {
      const errorMessage = 'Failed to retrieve Merchant Overtime Rules';
      const findAllSpy = jest
        .spyOn(service, 'findAll')
        .mockRejectedValue(new Error(errorMessage));
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findAll({ page: 1, limit: 10 })).rejects.toThrow(
        errorMessage,
      );

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });
  //--------------------------------------------------------------
  // GET /merchant-overtime-rule/:id
  //--------------------------------------------------------------
  describe('GET /merchant-overtime-rule/:id', () => {
    it('should retrieve a merchant overtime rule by id successfully', async () => {
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(mockOneMerchantOvertimeRuleResponseDto);
      findOneSpy.mockResolvedValue(mockOneMerchantOvertimeRuleResponseDto);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneMerchantOvertimeRuleResponseDto);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'Failed to retrieve Merchant Overtime Rule';
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new Error(errorMessage));
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(1);
    });
  });
  //--------------------------------------------------------------
  // PATCH /merchant-overtime-rule/:id
  //--------------------------------------------------------------
  describe('PATCH /merchant-tip-rule/:id', () => {
    it('should update a merchant overtime rule successfully', async () => {
      const updatedResponse = {
        statusCode: 200,
        message: 'Merchant Overtime Rule updated successfully',
        data: mockMerchantOvertimeRule,
      };
      const updateSpy = jest
        .spyOn(service, 'update')
        .mockResolvedValue(updatedResponse);
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(
        1,
        mockUpdateMerchantOvertimeRuleDto,
      );

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        mockUpdateMerchantOvertimeRuleDto,
      );
      expect(result).toEqual(updatedResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update Merchant Overtime Rule';
      const updateSpy = jest
        .spyOn(service, 'update')
        .mockRejectedValue(new Error(errorMessage));
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(1, mockUpdateMerchantOvertimeRuleDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        mockUpdateMerchantOvertimeRuleDto,
      );
    });
  });
  //--------------------------------------------------------------
  // DELETE /merchant-overtime-rule/:id
  //--------------------------------------------------------------
  describe('DELETE /merchant-overtime-rule/:id', () => {
    it('should delete a merchant overtime rule successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'Merchant Overtime Rule deleted successfully',
        data: mockOneMerchantOvertimeRuleResponseDto.data,
      };
      const removeSpy = jest
        .spyOn(service, 'remove')
        .mockResolvedValue(deleteResponse);
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete Merchant Overtime Rule';
      const removeSpy = jest
        .spyOn(service, 'remove')
        .mockRejectedValue(new Error(errorMessage));
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(1);
    });
  });
});
