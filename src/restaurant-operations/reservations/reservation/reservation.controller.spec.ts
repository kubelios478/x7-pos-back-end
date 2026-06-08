import { Test, TestingModule } from '@nestjs/testing';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { GetReservationsQueryDto } from './dto/get-reservations-query.dto';
import {
  OneReservationResponse,
  ReservationResponseDto,
} from './dto/reservation-response.dto';
import { AllPaginatedReservations } from './dto/all-paginated-reservations.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ReservationStatus } from './constants/reservation.constants';

describe('ReservationController', () => {
  let controller: ReservationController;
  let service: ReservationService;
  let user: AuthenticatedUser;

  const mockReservationService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    cancel: jest.fn(),
  };

  const mockReservationResponse: ReservationResponseDto = {
    id: 1,
    merchant_id: 1,
    customer_id: null,
    reservation_date: new Date(),
    duration_minutes: 90,
    seated_at: null,
    party_size: 4,
    status: ReservationStatus.PENDING,
    source: 'phone',
    special_requests: null,
    created_by: 1,
    created_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationController],
      providers: [
        {
          provide: ReservationService,
          useValue: mockReservationService,
        },
      ],
    }).compile();

    controller = module.get<ReservationController>(ReservationController);
    service = module.get<ReservationService>(ReservationService);

    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    } as any;

    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('Create', () => {
    it('should create a reservation', async () => {
      const dto: CreateReservationDto = {
        reservation_date: new Date().toISOString(),
        party_size: 4,
        table_ids: [1],
      };
      const expectedResult: OneReservationResponse = {
        statusCode: 201,
        message: 'Reservation Created successfully',
        data: {
          ...mockReservationResponse,
          reservation_date: new Date(dto.reservation_date),
          party_size: dto.party_size,
        } as any,
      };

      mockReservationService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, dto);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(user.merchant.id, dto);
    });
  });

  describe('FindAll', () => {
    it('should return paginated reservations', async () => {
      const query: GetReservationsQueryDto = { page: 1, limit: 10 };
      const expectedResult: AllPaginatedReservations = {
        statusCode: 200,
        message: 'Reservations retrieved successfully',
        data: [mockReservationResponse],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockReservationService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(query, user.merchant.id);
    });
  });

  describe('FindOne', () => {
    it('should return a single reservation', async () => {
      const expectedResult: OneReservationResponse = {
        statusCode: 200,
        message: 'Reservation retrieved successfully',
        data: mockReservationResponse,
      };

      mockReservationService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, 1);

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith(1, user.merchant.id);
    });
  });

  describe('Update', () => {
    it('should update a reservation', async () => {
      const dto: UpdateReservationDto = { party_size: 5 };
      const expectedResult: OneReservationResponse = {
        statusCode: 200,
        message: 'Reservation Updated successfully',
        data: { ...mockReservationResponse, ...dto } as any,
      };

      mockReservationService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(user, 1, dto);

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith(1, user.merchant.id, dto);
    });
  });

  describe('Cancel', () => {
    it('should cancel a reservation', async () => {
      const expectedResult: OneReservationResponse = {
        statusCode: 200,
        message: 'Reservation Cancelled successfully',
        data: {
          ...mockReservationResponse,
          status: ReservationStatus.CANCELLED,
        },
      };

      mockReservationService.cancel.mockResolvedValue(expectedResult);

      const result = await controller.cancel(user, 1);

      expect(result).toEqual(expectedResult);
      expect(service.cancel).toHaveBeenCalledWith(1, user.merchant.id);
    });
  });

  describe('Remove', () => {
    it('should remove a reservation', async () => {
      const expectedResult: OneReservationResponse = {
        statusCode: 200,
        message: 'Reservation Deleted successfully',
        data: mockReservationResponse,
      };

      mockReservationService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, 1);

      expect(result).toEqual(expectedResult);
      expect(service.remove).toHaveBeenCalledWith(1, user.merchant.id);
    });
  });

  describe('Service Integration', () => {
    it('should call service methods with correct parameters', async () => {
      const dto: CreateReservationDto = {
        reservation_date: new Date().toISOString(),
        party_size: 2,
      };
      const query: GetReservationsQueryDto = { page: 1 };

      await controller.create(user, dto);
      await controller.findAll(user, query);
      await controller.findOne(user, 1);
      await controller.update(user, 1, dto);
      await controller.cancel(user, 1);
      await controller.remove(user, 1);

      expect(service.create).toHaveBeenCalledWith(user.merchant.id, dto);
      expect(service.findAll).toHaveBeenCalledWith(query, user.merchant.id);
      expect(service.findOne).toHaveBeenCalledWith(1, user.merchant.id);
      expect(service.update).toHaveBeenCalledWith(1, user.merchant.id, dto);
      expect(service.cancel).toHaveBeenCalledWith(1, user.merchant.id);
      expect(service.remove).toHaveBeenCalledWith(1, user.merchant.id);
    });
  });
});
