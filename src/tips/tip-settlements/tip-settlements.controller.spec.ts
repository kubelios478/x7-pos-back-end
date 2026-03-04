import { Test, TestingModule } from '@nestjs/testing';
import { TipSettlementsController } from './tip-settlements.controller';
import { TipSettlementsService } from './tip-settlements.service';
import { CreateTipSettlementDto } from './dto/create-tip-settlement.dto';
import { UpdateTipSettlementDto } from './dto/update-tip-settlement.dto';
import { SettlementMethod } from './constants/settlement-method.enum';

describe('TipSettlementsController', () => {
  let controller: TipSettlementsController;
  let service: TipSettlementsService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRequest = {
    user: { merchant: { id: 1 } },
  };

  const mockCreateDto: CreateTipSettlementDto = {
    collaboratorId: 1,
    shiftId: 1,
    totalAmount: 150.75,
    settlementMethod: SettlementMethod.CASH,
    settledBy: 1,
  };

  const mockResponse = {
    statusCode: 201,
    message: 'Tip settlement created successfully',
    data: {
      id: 1,
      companyId: 1,
      merchantId: 1,
      collaboratorId: 1,
      collaborator: { id: 1, name: 'Juan Pérez' },
      shiftId: 1,
      shift: { id: 1, startTime: new Date() },
      totalAmount: 150.75,
      settlementMethod: SettlementMethod.CASH,
      settledBy: { id: 1, name: 'admin', email: 'admin@example.com' },
      settledAt: new Date(),
      createdAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipSettlementsController],
      providers: [{ provide: TipSettlementsService, useValue: mockService }],
    }).compile();

    controller = module.get<TipSettlementsController>(TipSettlementsController);
    service = module.get<TipSettlementsService>(TipSettlementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a tip settlement', async () => {
      mockService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(mockCreateDto, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(mockCreateDto, 1);
    });
  });

  describe('findAll', () => {
    it('should return paginated tip settlements', async () => {
      const query = { page: 1, limit: 10 };
      const mockPaginated = {
        statusCode: 200,
        message: 'Tip settlements retrieved successfully',
        data: [mockResponse.data],
        paginationMeta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
      mockService.findAll.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual(mockPaginated);
      expect(service.findAll).toHaveBeenCalledWith(query, 1);
    });
  });

  describe('findOne', () => {
    it('should return a tip settlement by id', async () => {
      mockService.findOne.mockResolvedValue(mockResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('update', () => {
    it('should update a tip settlement', async () => {
      const updateDto: UpdateTipSettlementDto = { totalAmount: 200 };
      const updatedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Tip settlement updated successfully',
        data: { ...mockResponse.data, totalAmount: 200 },
      };
      mockService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(result).toEqual(updatedResponse);
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
    });
  });

  describe('remove', () => {
    it('should delete a tip settlement', async () => {
      const deletedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Tip settlement deleted successfully',
      };
      mockService.remove.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(result).toEqual(deletedResponse);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
