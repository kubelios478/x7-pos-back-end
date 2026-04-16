import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationService } from './reservation.service';
import { Reservation } from './entities/reservation.entity';
import { ReservationTable } from 'src/restaurant-operations/reservations/reservation-table/entities/reservation-table.entity';
import { ReservationStatusHistory } from 'src/restaurant-operations/reservations/reservation-status-history/entities/reservation-status-history.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { Repository } from 'typeorm';
import { ReservationStatus } from './constants/reservation.constants';

describe('ReservationService', () => {
  let service: ReservationService;
  let reservationRepository: Repository<Reservation>;

  const mockReservationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getCount: jest.fn(),
    }),
  };

  const mockOtherRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepository,
        },
        {
          provide: getRepositoryToken(ReservationTable),
          useValue: mockOtherRepository,
        },
        {
          provide: getRepositoryToken(ReservationStatusHistory),
          useValue: mockOtherRepository,
        },
        {
          provide: getRepositoryToken(Table),
          useValue: mockOtherRepository,
        },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
    reservationRepository = module.get<Repository<Reservation>>(getRepositoryToken(Reservation));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a reservation', async () => {
      const dto = { reservation_date: new Date(), party_size: 2 } as any;
      const merchantId = 1;
      const reservation = { id: 1, ...dto, merchant_id: merchantId, status: ReservationStatus.PENDING };

      mockReservationRepository.create.mockReturnValue(reservation);
      mockReservationRepository.save.mockResolvedValue(reservation);
      jest.spyOn(service, 'findOne').mockResolvedValue({ data: reservation } as any);

      const result = await service.create(merchantId, dto);
      expect(result.data).toEqual(reservation);
    });
  });

  describe('cancel', () => {
    it('should cancel a reservation', async () => {
      const reservation = { id: 1, status: ReservationStatus.PENDING, is_active: true };
      mockReservationRepository.findOneBy.mockResolvedValue(reservation);
      mockReservationRepository.save.mockResolvedValue({ ...reservation, status: ReservationStatus.CANCELLED });
      jest.spyOn(service, 'findOne').mockResolvedValue({ data: { ...reservation, status: ReservationStatus.CANCELLED } } as any);

      const result = await service.cancel(1, 1);
      expect(result.data.status).toBe(ReservationStatus.CANCELLED);
    });
  });

  describe('remove', () => {
    it('should soft delete a reservation', async () => {
      const reservation = { id: 1, is_active: true };
      mockReservationRepository.findOneBy.mockResolvedValue(reservation);
      mockReservationRepository.save.mockResolvedValue({ ...reservation, is_active: false });

      const result = await service.remove(1, 1);
      expect(result.statusCode).toBe(200);
      expect(result.message).toContain('deleted');
    });
  });
});
