import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyCouponsController } from './loyalty-coupons.controller';
import { LoyaltyCouponsService } from './loyalty-coupons.service';
import { CreateLoyaltyCouponDto } from './dto/create-loyalty-coupon.dto';
import { UpdateLoyaltyCouponDto } from './dto/update-loyalty-coupon.dto';
import { GetLoyaltyCouponsQueryDto } from './dto/get-loyalty-coupons-query.dto';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../../../platform-saas/users/constants/role.enum';
import { Scope } from '../../../platform-saas/users/constants/scope.enum';
import { LoyaltyCouponStatus } from './constants/loyalty-coupons-status.enum';

describe('LoyaltyCouponsController', () => {
  let controller: LoyaltyCouponsController;
  let user: AuthenticatedUser;

  const mockLoyaltyCouponsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const createDto: CreateLoyaltyCouponDto = {
    loyalty_customer_id: 1,
    code: 'TESTCODE123',
    reward_id: 1,
    status: LoyaltyCouponStatus.ACTIVE,
    discount_value: 10,
    expires_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoyaltyCouponsController],
      providers: [
        {
          provide: LoyaltyCouponsService,
          useValue: mockLoyaltyCouponsService,
        },
      ],
    }).compile();

    controller = module.get<LoyaltyCouponsController>(LoyaltyCouponsController);
    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    } as AuthenticatedUser;

    jest.clearAllMocks();
  });

  // ─── Controller Initialization ────────────────────────────────────────────

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('It should create a coupon and return the service result.', async () => {
      const expectedResult = {
        statusCode: 201,
        message: 'Loyalty Coupon created successfully',
        data: { id: 1, ...createDto },
      };

      mockLoyaltyCouponsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createDto);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyCouponsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createDto,
      );
    });

    it('It should propagate the error from the service when creating a coupon', async () => {
      mockLoyaltyCouponsService.create.mockRejectedValue(
        new Error('Conflict: coupon already exists'),
      );

      await expect(controller.create(user, createDto)).rejects.toThrow(
        'Conflict: coupon already exists',
      );
      expect(mockLoyaltyCouponsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createDto,
      );
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('It should return the paginated list of coupons', async () => {
      const query: GetLoyaltyCouponsQueryDto = { page: 1, limit: 10 };
      const expectedResult = {
        statusCode: 200,
        message: 'Success',
        data: [{ id: 1 }, { id: 2 }],
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockLoyaltyCouponsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyCouponsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('It should propagate the error from the service when finding all coupons', async () => {
      const query: GetLoyaltyCouponsQueryDto = { page: 1, limit: 10 };
      mockLoyaltyCouponsService.findAll.mockRejectedValue(
        new Error('Internal Server Error'),
      );

      await expect(controller.findAll(user, query)).rejects.toThrow(
        'Internal Server Error',
      );
      expect(mockLoyaltyCouponsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('It should return a coupon by its ID', async () => {
      const id = 1;
      const expectedResult = {
        statusCode: 200,
        message: 'Success',
        data: { id, code: 'TESTCODE123', status: LoyaltyCouponStatus.ACTIVE },
      };

      mockLoyaltyCouponsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, id);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyCouponsService.findOne).toHaveBeenCalledWith(
        id,
        user.merchant.id,
      );
    });

    it('It should propagate the error when the coupon does not exist', async () => {
      const id = 999;
      mockLoyaltyCouponsService.findOne.mockRejectedValue(
        new Error('Loyalty Coupon not found'),
      );

      await expect(controller.findOne(user, id)).rejects.toThrow(
        'Loyalty Coupon not found',
      );
      expect(mockLoyaltyCouponsService.findOne).toHaveBeenCalledWith(
        id,
        user.merchant.id,
      );
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('It should update the status of a coupon', async () => {
      const id = 1;
      const updateDto: UpdateLoyaltyCouponDto = {
        status: LoyaltyCouponStatus.REDEEMED,
        order_id: 42,
      };
      const expectedResult = {
        statusCode: 200,
        message: 'Loyalty Coupon updated successfully',
        data: { id, status: LoyaltyCouponStatus.REDEEMED, order_id: 42 },
      };

      mockLoyaltyCouponsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(user, id, updateDto);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyCouponsService.update).toHaveBeenCalledWith(
        id,
        user.merchant.id,
        updateDto,
      );
    });

    it('It should propagate the error when the coupon to update does not exist', async () => {
      const id = 999;
      const updateDto: UpdateLoyaltyCouponDto = {
        status: LoyaltyCouponStatus.CANCELLED,
      };
      mockLoyaltyCouponsService.update.mockRejectedValue(
        new Error('Loyalty Coupon not found'),
      );

      await expect(controller.update(user, id, updateDto)).rejects.toThrow(
        'Loyalty Coupon not found',
      );
      expect(mockLoyaltyCouponsService.update).toHaveBeenCalledWith(
        id,
        user.merchant.id,
        updateDto,
      );
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('It should delete (logically) a coupon by its ID', async () => {
      const id = 1;
      const expectedResult = {
        statusCode: 200,
        message: 'Loyalty Coupon deleted successfully',
        data: { id },
      };

      mockLoyaltyCouponsService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, id);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyCouponsService.remove).toHaveBeenCalledWith(
        id,
        user.merchant.id,
      );
    });

    it('It should propagate the error when the coupon to delete does not exist', async () => {
      const id = 999;
      mockLoyaltyCouponsService.remove.mockRejectedValue(
        new Error('Loyalty Coupon not found'),
      );

      await expect(controller.remove(user, id)).rejects.toThrow(
        'Loyalty Coupon not found',
      );
      expect(mockLoyaltyCouponsService.remove).toHaveBeenCalledWith(
        id,
        user.merchant.id,
      );
    });
  });

  // ─── Service Integration ───────────────────────────────────────────────────

  describe('Service Integration', () => {
    it('It should call all service methods with the correct parameters', async () => {
      const query: GetLoyaltyCouponsQueryDto = { page: 1, limit: 10 };
      const updateDto: UpdateLoyaltyCouponDto = {
        status: LoyaltyCouponStatus.REDEEMED,
      };
      const id = 1;

      mockLoyaltyCouponsService.create.mockResolvedValue({});
      mockLoyaltyCouponsService.findAll.mockResolvedValue({});
      mockLoyaltyCouponsService.findOne.mockResolvedValue({});
      mockLoyaltyCouponsService.update.mockResolvedValue({});
      mockLoyaltyCouponsService.remove.mockResolvedValue({});

      await controller.create(user, createDto);
      await controller.findAll(user, query);
      await controller.findOne(user, id);
      await controller.update(user, id, updateDto);
      await controller.remove(user, id);

      expect(mockLoyaltyCouponsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createDto,
      );
      expect(mockLoyaltyCouponsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockLoyaltyCouponsService.findOne).toHaveBeenCalledWith(
        id,
        user.merchant.id,
      );
      expect(mockLoyaltyCouponsService.update).toHaveBeenCalledWith(
        id,
        user.merchant.id,
        updateDto,
      );
      expect(mockLoyaltyCouponsService.remove).toHaveBeenCalledWith(
        id,
        user.merchant.id,
      );
    });
  });
});
