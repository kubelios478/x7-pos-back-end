//src/commerce/delivery-system/delivery-tracking/delivery-tracking.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { In, Not, Repository } from 'typeorm';
import {
  DeliveryTrackingService,
  telemetryStatusOf,
} from './delivery-tracking.service';
import { DeliveryTracking } from './entity/delivery-tracking.entity';
import { DeliveryAssignment } from '../delivery-assignment/entity/delivery-assignment.entity';
import { DeliveryRealtimeService } from '../realtime/delivery-realtime.service';

const MERCHANT_ID = 3;

describe('DeliveryTrackingService', () => {
  let service: DeliveryTrackingService;
  let trackingRepo: jest.Mocked<Repository<DeliveryTracking>>;
  let assignmentRepo: jest.Mocked<Repository<DeliveryAssignment>>;
  let qb: Record<string, jest.Mock>;
  let realtime: { locationUpdated: jest.Mock };

  const assignment = (over: Record<string, unknown> = {}) =>
    ({
      id: 7,
      delivery_status: 'in_transit',
      status: 'active',
      deliveryDriver: { id: 2, name: 'Ana' },
      ...over,
    }) as unknown as DeliveryAssignment;
  const ping = (over: Partial<DeliveryTracking> = {}) =>
    ({
      id: 1,
      deliveryAssignment: assignment(),
      latitude: 18.4662,
      longitude: -69.9384,
      recorded_at: new Date('2026-10-10T12:00:00Z'),
      status: 'active',
      ...over,
    }) as DeliveryTracking;

  beforeEach(async () => {
    realtime = { locationUpdated: jest.fn() };
    qb = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[ping()], 1]),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryTrackingService,
        {
          provide: getRepositoryToken(DeliveryTracking),
          useValue: {
            create: jest.fn((v) => v),
            save: jest.fn((v) => Promise.resolve({ id: 1, ...v })),
            findOne: jest.fn().mockResolvedValue(ping()),
            createQueryBuilder: jest.fn(() => qb),
            query: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(DeliveryAssignment),
          useValue: { findOne: jest.fn().mockResolvedValue(assignment()) },
        },
        { provide: DeliveryRealtimeService, useValue: realtime },
      ],
    }).compile();

    service = module.get(DeliveryTrackingService);
    trackingRepo = module.get(getRepositoryToken(DeliveryTracking));
    assignmentRepo = module.get(getRepositoryToken(DeliveryAssignment));
  });

  it('rejects callers without a merchant', async () => {
    await expect(
      service.findAll({ page: 1, limit: 10 }, undefined as unknown as number),
    ).rejects.toThrow(ForbiddenException);
  });

  describe('create', () => {
    const dto = { deliveryAssignment: 7, latitude: 18.47, longitude: -69.93 };

    it('scopes the assignment to the merchant and defaults recorded_at/status', async () => {
      const before = Date.now();
      const { data } = await service.create(dto, MERCHANT_ID);
      expect(assignmentRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: 7,
          status: Not('deleted'),
          order: { merchant_id: MERCHANT_ID },
        },
      });
      expect(data.status).toBe('active');
      expect(data.recorded_at.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('pushes the new position to the merchant live map', async () => {
      await service.create(dto, MERCHANT_ID);
      expect(realtime.locationUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantId: MERCHANT_ID,
          assignmentId: 7,
          driverId: 2,
          lat: 18.47,
          lng: -69.93,
          status: 'active',
        }),
      );
    });

    it("refuses another merchant's assignment", async () => {
      assignmentRepo.findOne.mockResolvedValue(null);
      await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(trackingRepo.save).not.toHaveBeenCalled();
      expect(realtime.locationUpdated).not.toHaveBeenCalled();
    });

    it.each(['delivered', 'cancelled', 'failed'])(
      'refuses pings for a %s assignment',
      async (delivery_status) => {
        assignmentRepo.findOne.mockResolvedValue(
          assignment({ delivery_status }),
        );
        await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(
          BadRequestException,
        );
      },
    );
  });

  describe('findAll', () => {
    it('scopes by merchant and filters by statuses, assignment and driver', async () => {
      await service.findAll(
        {
          page: 1,
          limit: 10,
          status: ['active', 'inactive'],
          delivery_assignment_id: 7,
          delivery_driver_id: 2,
        },
        MERCHANT_ID,
      );
      expect(qb.where).toHaveBeenCalledWith('order.merchant_id = :merchantId', {
        merchantId: MERCHANT_ID,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'deliveryTracking.status IN (:...statuses)',
        { statuses: ['active', 'inactive'] },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'deliveryAssignment.id = :assignmentId',
        { assignmentId: 7 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'deliveryDriver.id = :driverId',
        {
          driverId: 2,
        },
      );
    });

    it('hides deleted pings by default', async () => {
      await service.findAll({ page: 1, limit: 10 }, MERCHANT_ID);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'deliveryTracking.status IN (:...statuses)',
        { statuses: ['active', 'inactive'] },
      );
    });
  });

  describe('findOne / update / remove', () => {
    it('looks the ping up through the merchant of its order', async () => {
      await service.findOne(1, MERCHANT_ID);
      expect(trackingRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: In(['active', 'inactive']),
          deliveryAssignment: { order: { merchant_id: MERCHANT_ID } },
        },
        relations: ['deliveryAssignment'],
      });
    });

    it("returns 404 for another merchant's ping", async () => {
      trackingRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(1, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a non-positive id', async () => {
      await expect(service.findOne(0, MERCHANT_ID)).rejects.toThrow();
    });

    it('updates field by field and re-scopes a new assignment', async () => {
      assignmentRepo.findOne.mockResolvedValue(assignment({ id: 9 }));
      const { data } = await service.update(
        1,
        { deliveryAssignment: 9, latitude: 18.5 },
        MERCHANT_ID,
      );
      expect(data.deliveryAssignment.id).toBe(9);
      expect(data.latitude).toBe(18.5);
      expect(data.longitude).toBe(-69.9384);
    });

    it('soft-deletes', async () => {
      const { data } = await service.remove(1, MERCHANT_ID);
      expect(data.status).toBe('deleted');
    });
  });

  describe('route', () => {
    it('returns the breadcrumb in chronological order with the driver', async () => {
      // La consulta lee del más reciente al más antiguo.
      qb.getMany.mockResolvedValue([
        ping({ id: 3, latitude: 18.48, longitude: -69.92 }),
        ping({ id: 2, latitude: 18.47, longitude: -69.93 }),
      ]);
      const { data } = await service.route(7, MERCHANT_ID);
      expect(qb.orderBy).toHaveBeenCalledWith(
        'deliveryTracking.recorded_at',
        'DESC',
        'NULLS LAST',
      );
      expect(data.points.map((p) => p.id)).toEqual([2, 3]);
      expect(data.points[1]).toMatchObject({ lat: 18.48, lng: -69.92 });
      expect(data.driver).toEqual({ id: 2, name: 'Ana' });
      expect(data.truncated).toBe(false);
    });

    it('works for an assignment without a local driver (third-party)', async () => {
      assignmentRepo.findOne.mockResolvedValue(
        assignment({ deliveryDriver: null }),
      );
      const { data } = await service.route(7, MERCHANT_ID);
      expect(data.driver).toBeNull();
    });

    it("returns 404 for another merchant's assignment", async () => {
      assignmentRepo.findOne.mockResolvedValue(null);
      await expect(service.route(7, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(qb.getMany).not.toHaveBeenCalled();
    });
  });

  describe('telemetryStatusOf', () => {
    const now = Date.parse('2026-10-10T12:00:00Z');
    const ago = (s: number) => new Date(now - s * 1000);

    it('is active within 3 minutes of the last ping', () => {
      expect(telemetryStatusOf('active', ago(10), now)).toBe('active');
      expect(telemetryStatusOf('active', ago(180), now)).toBe('active');
    });

    it('is signal_lost past 3 minutes or with no ping at all', () => {
      expect(telemetryStatusOf('active', ago(181), now)).toBe('signal_lost');
      expect(telemetryStatusOf(null, null, now)).toBe('signal_lost');
    });

    it('is inactive when the driver ended the stream, however old', () => {
      expect(telemetryStatusOf('inactive', ago(10), now)).toBe('inactive');
      expect(telemetryStatusOf('inactive', ago(3600), now)).toBe('inactive');
    });
  });

  describe('live / summary', () => {
    const secondsAgo = (s: number) => new Date(Date.now() - s * 1000);
    const rows = () => [
      {
        assignment_id: 1,
        delivery_status: 'in_transit',
        assigned_at: secondsAgo(10 * 60),
        driver_id: 2,
        driver_name: 'Ana',
        vehicle_type: 'motorcycle',
        tracking_id: 10,
        latitude: '18.466200',
        longitude: '-69.938400',
        recorded_at: secondsAgo(20),
        tracking_status: 'active',
      },
      {
        assignment_id: 2,
        delivery_status: 'picked_up',
        assigned_at: secondsAgo(60 * 60),
        driver_id: 3,
        driver_name: 'Luis',
        vehicle_type: 'car',
        tracking_id: 11,
        latitude: '18.470000',
        longitude: '-69.930000',
        recorded_at: secondsAgo(600),
        tracking_status: 'active',
      },
      {
        assignment_id: 3,
        delivery_status: 'assigned',
        assigned_at: secondsAgo(5 * 60),
        driver_id: null,
        driver_name: null,
        vehicle_type: null,
        tracking_id: null,
        latitude: null,
        longitude: null,
        recorded_at: null,
        tracking_status: null,
      },
    ];

    it('maps the latest ping of each live delivery, parsing decimal coordinates', async () => {
      trackingRepo.query.mockResolvedValue(rows());
      const { data } = await service.live({}, MERCHANT_ID);
      expect(trackingRepo.query).toHaveBeenCalledWith(expect.any(String), [
        MERCHANT_ID,
        ['assigned', 'picked_up', 'in_transit'],
      ]);
      expect(data[0]).toMatchObject({
        delivery_assignment_id: 1,
        lat: 18.4662,
        lng: -69.9384,
        telemetry_status: 'active',
        driver: { id: 2, name: 'Ana', vehicle_type: 'motorcycle' },
      });
      expect(data[0].seconds_since_update).toBeGreaterThanOrEqual(20);
      expect(data[1].telemetry_status).toBe('signal_lost');
      expect(data[2]).toMatchObject({
        driver: null,
        lat: null,
        telemetry_status: 'signal_lost',
      });
    });

    it('isolates a driver or assignment in SQL and filters by telemetry state', async () => {
      trackingRepo.query.mockResolvedValue(rows());
      const { data } = await service.live(
        {
          delivery_driver_id: 2,
          delivery_assignment_id: 1,
          telemetry_status: ['signal_lost'],
        },
        MERCHANT_ID,
      );
      const [sql, params] = trackingRepo.query.mock.calls[0];
      expect(sql).toContain('a.delivery_driver_id = $3');
      expect(sql).toContain('a.id = $4');
      expect(params).toEqual([
        MERCHANT_ID,
        ['assigned', 'picked_up', 'in_transit'],
        2,
        1,
      ]);
      expect(data.map((e) => e.delivery_assignment_id)).toEqual([2, 3]);
    });

    it('tallies active sessions and lost signals', async () => {
      trackingRepo.query.mockResolvedValue(rows());
      const { data } = await service.summary(MERCHANT_ID);
      expect(data).toEqual({
        live_deliveries: 3,
        active_sessions: 1,
        signal_lost: 2,
        inactive: 0,
        signal_lost_after_seconds: 180,
        // Rastreados: 1 (10 min, a tiempo) y 2 (60 min, tarde); el 3 no ha emitido ping.
        on_time_ratio_pct: 50,
        on_time_threshold_minutes: 45,
      });
    });

    it('flags each live delivery as on time or late against the 45-minute threshold', async () => {
      trackingRepo.query.mockResolvedValue(rows());
      const { data } = await service.live({}, MERCHANT_ID);
      expect(data.map((e) => e.on_time)).toEqual([true, false, true]);
      expect(data[1].minutes_since_assigned).toBeGreaterThanOrEqual(60);
    });

    it('returns a null on-time ratio when no live delivery has pinged', async () => {
      trackingRepo.query.mockResolvedValue([rows()[2]]);
      const { data } = await service.summary(MERCHANT_ID);
      expect(data.on_time_ratio_pct).toBeNull();
    });
  });
});
