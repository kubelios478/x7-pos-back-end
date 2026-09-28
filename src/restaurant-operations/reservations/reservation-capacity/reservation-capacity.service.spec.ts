import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ReservationCapacityService } from './reservation-capacity.service';
import { ReservationSettings } from './entities/reservation-settings.entity';
import { Reservation } from '../reservation/entities/reservation.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import {
  CAPACITY_LOCK_NAMESPACE,
  CAPACITY_OVERRIDE_REQUIRED,
  DEFAULT_SHIFTS,
} from './constants/capacity.constants';

const at = (h: number, m = 0) => new Date(2026, 3, 16, h, m, 0, 0);

describe('ReservationCapacityService', () => {
  let service: ReservationCapacityService;

  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  const settingsRepo = {
    findOneBy: jest.fn().mockResolvedValue(null),
    create: jest.fn((r) => ({ ...r })),
    save: jest.fn((r) => Promise.resolve(r)),
  };
  const reservationRepo = { createQueryBuilder: jest.fn(() => queryBuilder) };
  const tableRepo = { find: jest.fn().mockResolvedValue([{ capacity: 10 }, { capacity: 10 }]) };
  const userRepo = { findOne: jest.fn() };

  const repos = new Map<unknown, unknown>([
    [ReservationSettings, settingsRepo],
    [Reservation, reservationRepo],
    [Table, tableRepo],
    [User, userRepo],
  ]);
  const manager = {
    query: jest.fn().mockResolvedValue([]),
    getRepository: jest.fn((entity) => repos.get(entity)),
  };

  const passwordHash = bcrypt.hashSync('Manager123!', 4);
  const manager_admin = {
    id: 2,
    email: 'boss@x.com',
    password: passwordHash,
    role: UserRole.MERCHANT_ADMIN,
    merchantId: 3,
    isActive: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    settingsRepo.findOneBy.mockResolvedValue(null);
    tableRepo.find.mockResolvedValue([{ capacity: 10 }, { capacity: 10 }]);
    queryBuilder.getMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationCapacityService,
        { provide: getRepositoryToken(ReservationSettings), useValue: settingsRepo },
        { provide: getRepositoryToken(Reservation), useValue: reservationRepo },
        { provide: getRepositoryToken(Table), useValue: tableRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();
    service = module.get(ReservationCapacityService);
  });

  const seated = (id: number, h: number, party: number, minutes = 90) => ({
    id,
    reservation_date: at(h),
    duration_minutes: minutes,
    party_size: party,
  });

  describe('getSettings', () => {
    it('falls back to default shifts and the seats of the active tables', async () => {
      const s = await service.getSettings(3);
      expect(s).toEqual(
        expect.objectContaining({
          seat_capacity: null,
          effective_seat_capacity: 20,
          capacity_source: 'tables',
          slot_interval_minutes: 15,
          max_covers_per_slot: null,
          shifts: DEFAULT_SHIFTS,
        }),
      );
    });

    it('prefers the configured seat capacity', async () => {
      settingsRepo.findOneBy.mockResolvedValue({ seat_capacity: 64, shifts: [], slot_interval_minutes: 30 });
      const s = await service.getSettings(3);
      expect(s.effective_seat_capacity).toBe(64);
      expect(s.capacity_source).toBe('settings');
      expect(s.slot_interval_minutes).toBe(30);
      // Una lista de turnos vacía no deja al local sin franjas.
      expect(s.shifts).toEqual(DEFAULT_SHIFTS);
    });
  });

  describe('updateSettings', () => {
    it('upserts the row, null resets and absent leaves unchanged', async () => {
      settingsRepo.findOneBy.mockResolvedValueOnce({
        merchant_id: 3,
        seat_capacity: 50,
        max_covers_per_slot: 12,
        slot_interval_minutes: 15,
      });
      await service.updateSettings(3, { seat_capacity: null, slot_interval_minutes: 30 }, 2);
      expect(settingsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          seat_capacity: null,
          slot_interval_minutes: 30,
          max_covers_per_slot: 12,
          updated_by: 2,
        }),
      );
    });
  });

  describe('assertBookable', () => {
    const request = { start: at(19), durationMinutes: 90, partySize: 6 };

    it('takes the per-merchant advisory lock before reading the load', async () => {
      await service.assertBookable(manager as any, 3, request);
      expect(manager.query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock($1, $2)', [
        CAPACITY_LOCK_NAMESPACE,
        3,
      ]);
      expect(manager.query.mock.invocationCallOrder[0]).toBeLessThan(
        queryBuilder.getMany.mock.invocationCallOrder[0],
      );
    });

    it('lets a booking through when it fits', async () => {
      queryBuilder.getMany.mockResolvedValue([seated(1, 19, 14)]);
      const decision = await service.assertBookable(manager as any, 3, request);
      expect(decision.overrideBy).toBeNull();
      expect(decision.evaluation.projectedSeats).toBe(20);
    });

    it('rejects an overbooking with 409 CAPACITY_OVERRIDE_REQUIRED', async () => {
      queryBuilder.getMany.mockResolvedValue([seated(1, 19, 15)]);
      const error = await service.assertBookable(manager as any, 3, request).catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toEqual(
        expect.objectContaining({
          code: CAPACITY_OVERRIDE_REQUIRED,
          seat_capacity: 20,
          booked_seats: 15,
        }),
      );
    });

    it('rejects when the arrival pacing limit would be exceeded', async () => {
      settingsRepo.findOneBy.mockResolvedValue({ seat_capacity: 100, max_covers_per_slot: 10 });
      queryBuilder.getMany.mockResolvedValue([seated(1, 19, 8)]);
      const error = await service.assertBookable(manager as any, 3, request).catch((e) => e);
      expect(error.getResponse().message).toContain('Arrival pacing limit');
    });

    it('lets a manager override through and reports who authorized it', async () => {
      queryBuilder.getMany.mockResolvedValue([seated(1, 19, 15)]);
      userRepo.findOne.mockResolvedValue(manager_admin);

      const decision = await service.assertBookable(manager as any, 3, request, {
        email: 'boss@x.com',
        password: 'Manager123!',
      });
      expect(decision.overrideBy).toBe(2);
    });

    it('excludes the reservation being edited from its own load', async () => {
      await service.assertBookable(manager as any, 3, { ...request, excludeReservationId: 9 });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('reservation.id != :excludeId', {
        excludeId: 9,
      });
    });
  });

  describe('verifyManagerOverride', () => {
    const creds = { email: 'boss@x.com', password: 'Manager123!' };

    it.each([
      ['wrong password', manager_admin, { ...creds, password: 'nope' }],
      ['unknown email', null, creds],
      ['a floor user, not a manager', { ...manager_admin, role: UserRole.MERCHANT_USER }, creds],
      ['a manager of another restaurant', { ...manager_admin, merchantId: 99 }, creds],
      ['a deactivated manager', { ...manager_admin, isActive: false }, creds],
    ])('rejects %s with 403', async (_label, user, attempt) => {
      userRepo.findOne.mockResolvedValue(user);
      await expect(service.verifyManagerOverride(3, attempt)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('accepts an active merchant admin of the same restaurant', async () => {
      userRepo.findOne.mockResolvedValue(manager_admin);
      await expect(service.verifyManagerOverride(3, creds)).resolves.toBe(2);
    });
  });

  describe('availability', () => {
    it('returns the slot matrix for every shift', async () => {
      queryBuilder.getMany.mockResolvedValue([seated(1, 19, 16)]);
      const result = await service.availability(3, {
        date: '2026-04-16',
        party_size: 4,
        duration_minutes: 90,
      });

      const dinner = result.data.shifts.find((s) => s.name === 'Dinner')!;
      expect(dinner.slots).toHaveLength(16); // 19:00–23:00 cada 15 min
      expect(dinner.slots[0]).toEqual(
        expect.objectContaining({
          time: '19:00',
          booked_seats: 16,
          occupancy_pct: 80,
          level: 'limited',
          bookable: true,
        }),
      );
      expect(result.data.seat_capacity).toBe(20);
    });
  });
});
