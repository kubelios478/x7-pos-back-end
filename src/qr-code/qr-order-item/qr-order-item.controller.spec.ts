//src/qr-code/qr-order-item/qr-order-item.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { QROrderItemController } from './qr-order-item.controller';
import { QROrderItemService } from './qr-order-item.service';
import { QROrderItem } from './entity/qr-order-item.entity';
import { QROrder } from '../qr-order/entity/qr-order.entity';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { Variant } from 'src/products-inventory/variants/entities/variant.entity';

describe('QROrderItemController', () => {
  let controller: QROrderItemController;
  let service: QROrderItemService;

  // Mock data
  const mockQROrder: QROrder = {
    id: 1,
  } as QROrder;

  const mockProduct: Product = {
    id: 1,
  } as Product;

  const mockVariant: Variant = {
    id: 1,
  } as Variant;

  const mockQROrderItem: QROrderItem = {
    id: 1,
    qrOrder: mockQROrder,
    product: mockProduct,
    variant: mockVariant,
    quantity: 2,
    price: 50.0,
    total_price: 100.0,
    notes: 'Test item notes',
    status: 'active',
  } as QROrderItem;

  const mockCreateQROrderItemDto = {
    qrOrder: 1,
    product: 1,
    variant: 1,
    quantity: 2,
    price: 50.0,
    total_price: 100.0,
    notes: 'Test item notes',
    status: 'active',
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse = {
    statusCode: 200,
    message: 'QR Order Items retrieved successfully',
    data: [mockQROrderItem],
    pagination: mockPagination,
  };

  const mockOneQROrderItemResponse = {
    statusCode: 200,
    message: 'QR Order Item retrieved successfully',
    data: mockQROrderItem,
  };

  const mockUpdateQROrderItemDto = {
    qrOrder: 1,
    product: 1,
    variant: 1,
    quantity: 3,
    price: 50.0,
    total_price: 150.0,
    notes: 'Updated item notes',
    status: 'inactive',
  };

  beforeEach(async () => {
    const mockQROrderItemService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QROrderItemController],
      providers: [
        {
          provide: QROrderItemService,
          useValue: mockQROrderItemService,
        },
      ],
    }).compile();

    controller = module.get<QROrderItemController>(QROrderItemController);
    service = module.get<QROrderItemService>(QROrderItemService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
    it('should have QROrderItemService defined', () => {
      expect(service).toBeDefined();
    });
  });

  //--------------------------------------------------------------
  // POST /qr-order-item
  //--------------------------------------------------------------
  describe('POST /qr-order-item', () => {
    it('should create a qr order item successfully', async () => {
      const expectedResponse = {
        statusCode: 201,
        message: 'QR Order Item created successfully',
        data: mockQROrderItem,
      };

      const createSpy = jest
        .spyOn(service, 'create')
        .mockResolvedValue(expectedResponse);
      createSpy.mockResolvedValue(expectedResponse);

      const result = await controller.create(mockCreateQROrderItemDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateQROrderItemDto);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create QR Order Item';
      const createSpy = jest
        .spyOn(service, 'create')
        .mockRejectedValue(new Error(errorMessage));
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(mockCreateQROrderItemDto)).rejects.toThrow(
        errorMessage,
      );

      expect(createSpy).toHaveBeenCalledWith(mockCreateQROrderItemDto);
    });
  });
  //--------------------------------------------------------------
  // GET /qr-order-item
  //--------------------------------------------------------------
  describe('GET /qr-order-item', () => {
    it('should retrieve all qr order items successfully', async () => {
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
        message: 'QROrder Items retrieved successfully',
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
      const errorMessage = 'Failed to retrieve QR Order Items';
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
  // GET /qr-order-item/:id
  //--------------------------------------------------------------
  describe('GET /qr-order-item/:id', () => {
    it('should retrieve a qr order item by id successfully', async () => {
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(mockOneQROrderItemResponse);
      findOneSpy.mockResolvedValue(mockOneQROrderItemResponse);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneQROrderItemResponse);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'Failed to retrieve QR Order Item';
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new Error(errorMessage));
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(1);
    });
  });
  //--------------------------------------------------------------
  // PATCH /qr-order-item/:id
  //--------------------------------------------------------------
  describe('PATCH /qr-order-item/:id', () => {
    it('should update a qr order item successfully', async () => {
      const updatedResponse = {
        statusCode: 200,
        message: 'QR Order Item updated successfully',
        data: mockQROrderItem,
      };
      const updateSpy = jest
        .spyOn(service, 'update')
        .mockResolvedValue(updatedResponse);
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, mockUpdateQROrderItemDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateQROrderItemDto);
      expect(result).toEqual(updatedResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update QR Order Item';
      const updateSpy = jest
        .spyOn(service, 'update')
        .mockRejectedValue(new Error(errorMessage));
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(1, mockUpdateQROrderItemDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateQROrderItemDto);
    });
  });
  //--------------------------------------------------------------
  // DELETE /qr-order-item/:id
  //--------------------------------------------------------------
  describe('DELETE /qr-order-item/:id', () => {
    it('should delete a qr order item successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'QR Order Item deleted successfully',
        data: mockOneQROrderItemResponse.data,
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
      const errorMessage = 'Failed to delete QR Order Item';
      const removeSpy = jest
        .spyOn(service, 'remove')
        .mockRejectedValue(new Error(errorMessage));
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(1);
    });
  });
});
