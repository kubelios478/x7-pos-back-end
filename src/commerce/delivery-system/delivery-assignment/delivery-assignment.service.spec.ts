//src/commerce/delivery-system/delivery-assignment/delivery-assignment.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DeliveryAssignmentService } from './delivery-assignment.service';
import { DeliveryAssignment } from './entity/delivery-assignment.entity';
import { DeliveryDriver } from '../delivery-driver/entity/delivery-driver.entity';
import { DeliveryZone } from '../delivery-zone/entity/delivery-zone.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { DeliveryStatus } from './constants/delivery-status.enum';
import { AssignmentType } from './constants/assignment-type.enum';
import {
  DELIVERY_DELAY_THRESHOLD_MINUTES,
  canTransition,
} from './constants/delivery-assignment.constants';
import { DSP_DISPATCH_PROVIDER } from './dsp/dsp-dispatch.provider';
import { DeliveryRealtimeService } from '../realtime/delivery-realtime.service';

const MERCHANT_ID = 3;

describe('DeliveryAssignmentService', () => {
  let service: DeliveryAssignmentService;
  let repo: Record<string, jest.Mock>;
  let orderRepo: Record<string, jest.Mock>;
  let zoneRepo: Record<string, jest.Mock>;
  let qb: Record<string, jest.Mock>;
  let mqb: Record<string, jest.Mock>;
  let manager: Record<string, jest.Mock>;
  let dataSource: { transaction: jest.Mock };
  let dsp: Record<string, jest.Mock>;
  let realtime: {
    assignmentChanged: jest.Mock;
    driverStatusChanged: jest.Mock;
  };
  let stored: { assignment: DeliveryAssignment | null; driver: DeliveryDriver };

  const order = (over: Partial<Order> = {}) =>
    ({
      id: 7,
      merchant_id: MERCHANT_ID,
      type: 'delivery',
      status: 'pending',
      delivery_zone_id: 2,
      ...over,
    }) as Order;
  const driver = (over: Partial<DeliveryDriver> = {}) =>
    ({ id: 5, name: 'Mario', status: 'active', ...over }) as DeliveryDriver;
  const assignment = (over: Partial<DeliveryAssignment> = {}) =>
    ({
      id: 1,
      order: order(),
      deliveryDriver: driver({ status: 'on_delivery' }),
      assignment_type: AssignmentType.IN_HOUSE,
      delivery_status: DeliveryStatus.ASSIGNED,
      assigned_at: new Date('2024-06-01T12:00:00Z'),
      picked_up_at: null,
      delivered_at: null,
      external_delivery_id: null,
      external_tracking_url: null,
      external_dsp_fee: null,
      status: 'active',
      ...over,
    }) as DeliveryAssignment;

  /** Llamadas UPDATE a delivery_drivers: [{ status }, params de where...]. */
  const driverUpdates = () =>
    mqb.set.mock.calls.map((c) => (c[0] as { status: string }).status);

  beforeEach(async () => {
    stored = { assignment: assignment(), driver: driver() };
    qb = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[assignment()], 1]),
    };
    mqb = {
      setLock: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(order()),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    manager = {
      createQueryBuilder: jest.fn(() => mqb),
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn((entity: unknown) =>
        Promise.resolve(
          entity === DeliveryDriver ? stored.driver : stored.assignment,
        ),
      ),
      create: jest.fn((_entity: unknown, value: unknown) => value),
      save: jest.fn((value: unknown) => Promise.resolve(value)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    realtime = { assignmentChanged: jest.fn(), driverStatusChanged: jest.fn() };
    dataSource = {
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb(manager)),
    };
    dsp = {
      isConfigured: jest.fn().mockReturnValue(false),
      quote: jest.fn(),
      requestRunner: jest.fn(),
    };
    repo = {
      findOne: jest.fn().mockResolvedValue(assignment()),
      query: jest.fn().mockResolvedValue([{}]),
      createQueryBuilder: jest.fn(() => qb),
    };
    orderRepo = { findOne: jest.fn().mockResolvedValue(order()) };
    zoneRepo = { findOne: jest.fn().mockResolvedValue({ id: 2 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryAssignmentService,
        { provide: getRepositoryToken(DeliveryAssignment), useValue: repo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(DeliveryZone), useValue: zoneRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: DSP_DISPATCH_PROVIDER, useValue: dsp },
        { provide: DeliveryRealtimeService, useValue: realtime },
      ],
    }).compile();

    service = module.get(DeliveryAssignmentService);
  });

  it('rejects callers without a merchant', async () => {
    await expect(service.findAll({ page: 1, limit: 10 }, 0)).rejects.toThrow(
      ForbiddenException,
    );
  });

  describe('transition table', () => {
    it.each([
      [DeliveryStatus.PENDING, DeliveryStatus.ASSIGNED],
      [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP],
      [DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT],
      [DeliveryStatus.PICKED_UP, DeliveryStatus.DELIVERED],
      [DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERED],
      [DeliveryStatus.PENDING, DeliveryStatus.CANCELLED],
      [DeliveryStatus.IN_TRANSIT, DeliveryStatus.FAILED],
    ])('allows %s → %s', (from, to) => {
      expect(canTransition(from, to)).toBe(true);
    });

    it.each([
      [DeliveryStatus.PENDING, DeliveryStatus.PICKED_UP],
      [DeliveryStatus.ASSIGNED, DeliveryStatus.DELIVERED],
      [DeliveryStatus.IN_TRANSIT, DeliveryStatus.ASSIGNED],
      [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED],
      [DeliveryStatus.CANCELLED, DeliveryStatus.ASSIGNED],
      [DeliveryStatus.FAILED, DeliveryStatus.PENDING],
    ])('rejects %s → %s', (from, to) => {
      expect(canTransition(from, to)).toBe(false);
    });
  });

  describe('order sync and live events', () => {
    const orderStatus = () =>
      manager.update.mock.calls
        .filter(([entity]) => entity === Order)
        .map(
          ([, , patch]) =>
            (patch as { delivery_status: string }).delivery_status,
        );

    it('create with a driver marks the order assigned and announces assignment + driver', async () => {
      await service.create({ order: 7, deliveryDriver: 5 }, MERCHANT_ID);
      expect(manager.update).toHaveBeenCalledWith(
        Order,
        { id: 7 },
        { delivery_status: 'assigned' },
      );
      expect(realtime.assignmentChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantId: MERCHANT_ID,
          delivery_status: DeliveryStatus.ASSIGNED,
        }),
      );
      expect(realtime.driverStatusChanged).toHaveBeenCalledWith({
        merchantId: MERCHANT_ID,
        driverId: 5,
        status: 'on_delivery',
      });
    });

    it('create without a driver leaves the order unassigned', async () => {
      await service.create({ order: 7 }, MERCHANT_ID);
      expect(orderStatus()).toEqual(['unassigned']);
      expect(realtime.driverStatusChanged).not.toHaveBeenCalled();
    });

    it('delivering marks the order delivered and announces the freed driver', async () => {
      stored.assignment = assignment({
        delivery_status: DeliveryStatus.IN_TRANSIT,
      });
      await service.update(
        1,
        { delivery_status: DeliveryStatus.DELIVERED },
        MERCHANT_ID,
      );
      expect(orderStatus()).toEqual(['delivered']);
      expect(realtime.driverStatusChanged).toHaveBeenCalledWith({
        merchantId: MERCHANT_ID,
        driverId: 5,
        status: 'active',
      });
    });

    it('a failed delivery puts the order back to unassigned for re-dispatch', async () => {
      await service.update(
        1,
        { delivery_status: DeliveryStatus.FAILED },
        MERCHANT_ID,
      );
      expect(orderStatus()).toEqual(['unassigned']);
    });

    it('editing only external fields does not touch the order', async () => {
      stored.assignment = assignment({
        assignment_type: AssignmentType.UBER_DIRECT,
        deliveryDriver: null,
      });
      await service.update(1, { external_dsp_fee: 6.5 }, MERCHANT_ID);
      expect(orderStatus()).toEqual([]);
      expect(realtime.assignmentChanged).toHaveBeenCalled();
    });

    it('removing an open assignment unassigns the order and frees the driver', async () => {
      await service.remove(1, MERCHANT_ID);
      expect(orderStatus()).toEqual(['unassigned']);
      expect(realtime.driverStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({ driverId: 5, status: 'active' }),
      );
    });

    it('announces nothing when the transaction fails', async () => {
      manager.count.mockResolvedValueOnce(1);
      await expect(
        service.create({ order: 7, deliveryDriver: 5 }, MERCHANT_ID),
      ).rejects.toThrow(ConflictException);
      expect(realtime.assignmentChanged).not.toHaveBeenCalled();
      expect(realtime.driverStatusChanged).not.toHaveBeenCalled();
    });

    it('an applied webhook event syncs the order and notifies the merchant', async () => {
      mqb.getOne.mockResolvedValueOnce(
        assignment({
          assignment_type: AssignmentType.DOORDASH_DRIVE,
          deliveryDriver: null,
          external_delivery_id: 'dd-1',
          delivery_status: DeliveryStatus.ASSIGNED,
        }),
      );
      await service.handleProviderEvent(AssignmentType.DOORDASH_DRIVE, {
        event: 'picked_up',
        external_delivery_id: 'dd-1',
      });
      expect(orderStatus()).toEqual(['picked_up']);
      expect(realtime.assignmentChanged).toHaveBeenCalledWith(
        expect.objectContaining({ merchantId: MERCHANT_ID }),
      );
    });
  });

  describe('create', () => {
    it('binds an active driver: ASSIGNED, assigned_at set, driver → on_delivery atomically', async () => {
      const res = await service.create(
        { order: 7, deliveryDriver: 5 },
        MERCHANT_ID,
      );

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mqb.setLock).toHaveBeenCalledWith('pessimistic_write');
      // UPDATE condicional: sólo si sigue `active` y es del comercio.
      expect(mqb.set).toHaveBeenCalledWith({ status: 'on_delivery' });
      expect(mqb.andWhere).toHaveBeenCalledWith('status = :active', {
        active: 'active',
      });
      expect(mqb.andWhere).toHaveBeenCalledWith('merchant_id = :merchantId', {
        merchantId: MERCHANT_ID,
      });
      expect(res.statusCode).toBe(201);
      expect(res.data.delivery_status).toBe(DeliveryStatus.ASSIGNED);
      expect(res.data.assigned_at).toBeInstanceOf(Date);
      expect(res.data.picked_up_at).toBeNull();
      expect(res.data.delivered_at).toBeNull();
      expect(res.data.assignment_type).toBe(AssignmentType.IN_HOUSE);
    });

    it('without a driver starts PENDING and touches no driver', async () => {
      const res = await service.create({ order: 7 }, MERCHANT_ID);
      expect(res.data.delivery_status).toBe(DeliveryStatus.PENDING);
      expect(res.data.assigned_at).toBeNull();
      expect(mqb.update).not.toHaveBeenCalled();
    });

    it.each(['off_duty', 'inactive'])(
      'rejects a %s driver with 400',
      async (status) => {
        mqb.execute.mockResolvedValueOnce({ affected: 0 });
        stored.driver = driver({ status });
        await expect(
          service.create({ order: 7, deliveryDriver: 5 }, MERCHANT_ID),
        ).rejects.toThrow(
          new BadRequestException(
            `Delivery driver #5 is '${status}'; only active drivers can be assigned`,
          ),
        );
      },
    );

    it('rejects a driver already on a delivery with 409 (concurrent double assignment)', async () => {
      mqb.execute.mockResolvedValueOnce({ affected: 0 });
      stored.driver = driver({ status: 'on_delivery' });
      await expect(
        service.create({ order: 7, deliveryDriver: 5 }, MERCHANT_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('404 when the driver is not from this merchant', async () => {
      mqb.execute.mockResolvedValueOnce({ affected: 0 });
      manager.findOne.mockResolvedValueOnce(null);
      await expect(
        service.create({ order: 7, deliveryDriver: 5 }, MERCHANT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a second open assignment for the same order (409)', async () => {
      manager.count.mockResolvedValueOnce(1);
      await expect(
        service.create({ order: 7, deliveryDriver: 5 }, MERCHANT_ID),
      ).rejects.toThrow(ConflictException);
      expect(mqb.update).not.toHaveBeenCalled();
    });

    it('rejects non-delivery orders and orders of other merchants', async () => {
      mqb.getOne.mockResolvedValueOnce(order({ type: 'dine_in' as never }));
      await expect(service.create({ order: 7 }, MERCHANT_ID)).rejects.toThrow(
        BadRequestException,
      );
      mqb.getOne.mockResolvedValueOnce(null);
      await expect(service.create({ order: 7 }, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('IN_HOUSE forbids external fields', async () => {
      await expect(
        service.create(
          { order: 7, external_delivery_id: 'x', external_dsp_fee: 3 },
          MERCHANT_ID,
        ),
      ).rejects.toThrow(
        'in_house assignments cannot carry external fields (external_delivery_id, external_dsp_fee)',
      );
    });

    it('DSP forbids a driver, skips the driver check and keeps external fields', async () => {
      await expect(
        service.create(
          {
            order: 7,
            deliveryDriver: 5,
            assignment_type: AssignmentType.UBER_DIRECT,
          },
          MERCHANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);

      const res = await service.create(
        {
          order: 7,
          assignment_type: AssignmentType.DOORDASH_DRIVE,
          external_delivery_id: 'dd-1',
          external_tracking_url: 'https://track.example.com/dd-1',
          external_dsp_fee: 7.5,
        },
        MERCHANT_ID,
      );
      expect(mqb.update).not.toHaveBeenCalled();
      expect(res.data).toEqual(
        expect.objectContaining({
          deliveryDriver: null,
          delivery_status: DeliveryStatus.PENDING,
          external_delivery_id: 'dd-1',
          external_dsp_fee: 7.5,
        }),
      );
    });

    it('maps a unique violation on the external id to 409', async () => {
      manager.save.mockRejectedValueOnce({ code: '23505' });
      await expect(
        service.create(
          {
            order: 7,
            assignment_type: AssignmentType.DOORDASH_DRIVE,
            external_delivery_id: 'dd-1',
          },
          MERCHANT_ID,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update (lifecycle)', () => {
    it('ASSIGNED → PICKED_UP sets picked_up_at and keeps the driver busy', async () => {
      const res = await service.update(
        1,
        { delivery_status: DeliveryStatus.PICKED_UP },
        MERCHANT_ID,
      );
      expect(res.data.delivery_status).toBe(DeliveryStatus.PICKED_UP);
      expect(res.data.picked_up_at).toBeInstanceOf(Date);
      expect(res.data.delivered_at).toBeNull();
      expect(driverUpdates()).toEqual([]);
    });

    it('IN_TRANSIT → DELIVERED sets delivered_at and frees the driver', async () => {
      stored.assignment = assignment({
        delivery_status: DeliveryStatus.IN_TRANSIT,
      });
      const res = await service.update(
        1,
        { delivery_status: DeliveryStatus.DELIVERED },
        MERCHANT_ID,
      );
      expect(res.data.delivered_at).toBeInstanceOf(Date);
      expect(driverUpdates()).toEqual(['active']);
      // Sólo si seguía on_delivery: no pisa un cambio manual.
      expect(mqb.andWhere).toHaveBeenCalledWith('status = :onDelivery', {
        onDelivery: 'on_delivery',
      });
    });

    it.each([DeliveryStatus.CANCELLED, DeliveryStatus.FAILED])(
      '%s frees the in-house driver without delivery timestamps',
      async (target) => {
        const res = await service.update(
          1,
          { delivery_status: target },
          MERCHANT_ID,
        );
        expect(res.data.delivery_status).toBe(target);
        expect(res.data.delivered_at).toBeNull();
        expect(driverUpdates()).toEqual(['active']);
      },
    );

    it('rejects an invalid jump with 400 and a clear message', async () => {
      await expect(
        service.update(
          1,
          { delivery_status: DeliveryStatus.DELIVERED },
          MERCHANT_ID,
        ),
      ).rejects.toThrow(
        "Invalid delivery status transition: 'assigned' → 'delivered'. Allowed from 'assigned': picked_up, failed, cancelled",
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('rejects any change from a terminal state', async () => {
      stored.assignment = assignment({
        delivery_status: DeliveryStatus.DELIVERED,
      });
      await expect(
        service.update(
          1,
          { delivery_status: DeliveryStatus.CANCELLED },
          MERCHANT_ID,
        ),
      ).rejects.toThrow(/terminal assignments cannot change status/);
    });

    it('PENDING + driver → ASSIGNED with assigned_at', async () => {
      stored.assignment = assignment({
        delivery_status: DeliveryStatus.PENDING,
        deliveryDriver: null,
        assigned_at: null,
      });
      const res = await service.update(1, { deliveryDriver: 5 }, MERCHANT_ID);
      expect(res.data.delivery_status).toBe(DeliveryStatus.ASSIGNED);
      expect(res.data.assigned_at).toBeInstanceOf(Date);
      expect(driverUpdates()).toEqual(['on_delivery']);
    });

    it('PENDING → ASSIGNED without a driver is rejected', async () => {
      stored.assignment = assignment({
        delivery_status: DeliveryStatus.PENDING,
        deliveryDriver: null,
      });
      await expect(
        service.update(
          1,
          { delivery_status: DeliveryStatus.ASSIGNED },
          MERCHANT_ID,
        ),
      ).rejects.toThrow(/active deliveryDriver is required/);
    });

    it('reassigning claims the new driver and releases the old one', async () => {
      stored.driver = driver({ id: 9 });
      await service.update(1, { deliveryDriver: 9 }, MERCHANT_ID);
      expect(driverUpdates()).toEqual(['on_delivery', 'active']);
    });

    it('cannot change the driver after pickup', async () => {
      stored.assignment = assignment({
        delivery_status: DeliveryStatus.PICKED_UP,
      });
      await expect(
        service.update(1, { deliveryDriver: 9 }, MERCHANT_ID),
      ).rejects.toThrow(/only be changed while the assignment is pending/);
    });

    it('DSP terminal states never touch drivers', async () => {
      stored.assignment = assignment({
        assignment_type: AssignmentType.UBER_DIRECT,
        deliveryDriver: null,
        external_delivery_id: 'u-1',
        delivery_status: DeliveryStatus.IN_TRANSIT,
      });
      await service.update(
        1,
        { delivery_status: DeliveryStatus.DELIVERED },
        MERCHANT_ID,
      );
      expect(mqb.update).not.toHaveBeenCalled();
    });

    it('404 when the assignment is not from this merchant', async () => {
      mqb.getOne.mockResolvedValueOnce(null);
      await expect(
        service.update(1, { status: 'inactive' }, MERCHANT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('cancels an open assignment and frees the driver', async () => {
      const res = await service.remove(1, MERCHANT_ID);
      expect(res.data.status).toBe('deleted');
      expect(res.data.delivery_status).toBe(DeliveryStatus.CANCELLED);
      expect(driverUpdates()).toEqual(['active']);
    });
  });

  describe('findAll', () => {
    it('scopes by merchant and applies the multi-value filters', async () => {
      await service.findAll(
        {
          page: 1,
          limit: 10,
          delivery_status: [
            DeliveryStatus.PICKED_UP,
            DeliveryStatus.IN_TRANSIT,
          ],
          assignment_type: [AssignmentType.DOORDASH_DRIVE],
        },
        MERCHANT_ID,
      );
      expect(qb.where).toHaveBeenCalledWith('order.merchant_id = :merchantId', {
        merchantId: MERCHANT_ID,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'deliveryAssignment.delivery_status IN (:...deliveryStatuses)',
        { deliveryStatuses: ['picked_up', 'in_transit'] },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'deliveryAssignment.assignment_type IN (:...types)',
        { types: ['doordash_drive'] },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'deliveryAssignment.status IN (:...statuses)',
        { statuses: ['active', 'inactive'] },
      );
    });

    it('searches driver name, order id/number and address with escaped wildcards', async () => {
      await service.findAll(
        { page: 1, limit: 10, search: ' 50%_off\\ ' },
        MERCHANT_ID,
      );
      const call = qb.andWhere.mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes('ILIKE'),
      ) as [string, { term: string }];
      expect(call[0]).toContain('deliveryDriver.name ILIKE :term');
      expect(call[0]).toContain('CAST(order.id AS TEXT) ILIKE :term');
      expect(call[0]).toContain('order.delivery_address ILIKE :term');
      expect(call[1].term).toBe('%50\\%\\_off\\\\%');
    });
  });

  describe('summary', () => {
    it('maps counts, rounds the average and splits in-house vs DSP', async () => {
      repo.query.mockResolvedValueOnce([
        {
          pending_dispatch: 3,
          pending_assignments: 1,
          in_transit: '4',
          delayed: 2,
          avg_completion_minutes: '27.4666',
          live_in_house: 2,
          live_dsp: 1,
          dsp_fee_today: '22.50',
        },
      ]);
      const res = await service.summary(MERCHANT_ID);
      expect(res.data).toEqual({
        pending_dispatch: 3,
        pending_assignments: 1,
        in_transit: 4,
        avg_completion_minutes: 27.5,
        delayed: 2,
        delay_threshold_minutes: DELIVERY_DELAY_THRESHOLD_MINUTES,
        live_assignments: 3,
        in_house_share_pct: 66.7,
        dsp_share_pct: 33.3,
        dsp_fee_today: 22.5,
      });
    });

    it('returns nulls when there is nothing to average or split', async () => {
      repo.query.mockResolvedValueOnce([
        {
          pending_dispatch: 0,
          pending_assignments: 0,
          in_transit: 0,
          delayed: 0,
          avg_completion_minutes: null,
          live_in_house: 0,
          live_dsp: 0,
          dsp_fee_today: 0,
        },
      ]);
      const res = await service.summary(MERCHANT_ID);
      expect(res.data.avg_completion_minutes).toBeNull();
      expect(res.data.in_house_share_pct).toBeNull();
      expect(res.data.dsp_share_pct).toBeNull();
    });

    it('passes the merchant, the ready kitchen status and a 45-minute delay cutoff', async () => {
      const before = Date.now();
      await service.summary(MERCHANT_ID);
      const [sql, params] = repo.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('o.kitchen_status = $4');
      expect(params.slice(0, 5)).toEqual([
        MERCHANT_ID,
        'delivery',
        'active',
        'ready',
        'cancelled',
      ]);
      const cutoff = (params[5] as Date).getTime();
      expect(before - cutoff).toBeGreaterThanOrEqual(45 * 60_000 - 5);
      expect(before - cutoff).toBeLessThan(45 * 60_000 + 1000);
      const today = params[7] as Date;
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
    });
  });

  describe('external quote / dispatch', () => {
    it('returns 503 when the provider is not configured, never a fake quote', async () => {
      await expect(
        service.externalQuote(
          { order_id: 7, provider: AssignmentType.DOORDASH_DRIVE },
          MERCHANT_ID,
        ),
      ).rejects.toThrow(ServiceUnavailableException);
      expect(dsp.quote).not.toHaveBeenCalled();
    });

    it('asks the configured provider with the order and its zone', async () => {
      dsp.isConfigured.mockReturnValue(true);
      dsp.quote.mockResolvedValue({ quote_id: 'q1', fee: 6 });
      const res = await service.externalQuote(
        { order_id: 7, provider: AssignmentType.UBER_DIRECT },
        MERCHANT_ID,
      );
      expect(dsp.quote).toHaveBeenCalledWith({
        provider: AssignmentType.UBER_DIRECT,
        order: order(),
        zone: { id: 2 },
      });
      expect(res.data).toEqual({ quote_id: 'q1', fee: 6 });
    });

    it('dispatch creates a driverless assignment with the provider data', async () => {
      dsp.isConfigured.mockReturnValue(true);
      dsp.requestRunner.mockResolvedValue({
        external_delivery_id: 'dd-9',
        external_tracking_url: 'https://t.example.com/dd-9',
        fee: 8.25,
      });
      const res = await service.externalDispatch(
        { order_id: 7, provider: AssignmentType.DOORDASH_DRIVE },
        MERCHANT_ID,
      );
      expect(res.statusCode).toBe(201);
      expect(res.data).toEqual(
        expect.objectContaining({
          deliveryDriver: null,
          assignment_type: AssignmentType.DOORDASH_DRIVE,
          delivery_status: DeliveryStatus.PENDING,
          external_delivery_id: 'dd-9',
          external_dsp_fee: 8.25,
        }),
      );
    });

    it('dispatch is 503 without a provider and opens no transaction', async () => {
      await expect(
        service.externalDispatch(
          { order_id: 7, provider: AssignmentType.DOORDASH_DRIVE },
          MERCHANT_ID,
        ),
      ).rejects.toThrow(ServiceUnavailableException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('handleProviderEvent (webhooks)', () => {
    const dspAssignment = (status: DeliveryStatus) =>
      assignment({
        assignment_type: AssignmentType.DOORDASH_DRIVE,
        deliveryDriver: null,
        external_delivery_id: 'dd-1',
        delivery_status: status,
        assigned_at: null,
      });

    it.each([
      [
        'dasher_assigned',
        DeliveryStatus.PENDING,
        DeliveryStatus.ASSIGNED,
        'assigned_at',
      ],
      [
        'picked_up',
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.PICKED_UP,
        'picked_up_at',
      ],
      [
        'delivered',
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.DELIVERED,
        'delivered_at',
      ],
    ] as const)(
      'maps %s and applies it with its timestamp',
      async (event, from, to, stamp) => {
        const a = dspAssignment(from);
        mqb.getOne.mockResolvedValueOnce(a);
        const res = await service.handleProviderEvent(
          AssignmentType.DOORDASH_DRIVE,
          { event, external_delivery_id: 'dd-1' },
        );
        expect(res).toEqual({
          outcome: 'applied',
          assignment_id: 1,
          delivery_status: to,
        });
        expect(a[stamp]).toBeInstanceOf(Date);
        expect(mqb.where).toHaveBeenCalledWith(
          'a.assignment_type = :provider',
          { provider: AssignmentType.DOORDASH_DRIVE },
        );
        // Sin sincronización de repartidores en un DSP.
        expect(mqb.update).not.toHaveBeenCalled();
      },
    );

    it('a replayed event is a no-op', async () => {
      mqb.getOne.mockResolvedValueOnce(dspAssignment(DeliveryStatus.PICKED_UP));
      const res = await service.handleProviderEvent(
        AssignmentType.DOORDASH_DRIVE,
        { event: 'picked_up', external_delivery_id: 'dd-1' },
      );
      expect(res.outcome).toBe('duplicate');
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('an event the assignment already passed is a no-op', async () => {
      mqb.getOne.mockResolvedValueOnce(dspAssignment(DeliveryStatus.DELIVERED));
      const res = await service.handleProviderEvent(
        AssignmentType.DOORDASH_DRIVE,
        { event: 'dasher_assigned', external_delivery_id: 'dd-1' },
      );
      expect(res.outcome).toBe('already_past');
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('an invalid jump is acknowledged but not applied', async () => {
      mqb.getOne.mockResolvedValueOnce(dspAssignment(DeliveryStatus.PENDING));
      const res = await service.handleProviderEvent(
        AssignmentType.DOORDASH_DRIVE,
        { event: 'delivered', external_delivery_id: 'dd-1' },
      );
      expect(res.outcome).toBe('invalid_transition');
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('an unknown external id is acknowledged', async () => {
      mqb.getOne.mockResolvedValueOnce(null);
      const res = await service.handleProviderEvent(
        AssignmentType.UBER_DIRECT,
        { event: 'delivered', external_delivery_id: 'nope' },
      );
      expect(res.outcome).toBe('unknown_delivery');
    });

    it('an unsupported event never reaches the database', async () => {
      const res = await service.handleProviderEvent(
        AssignmentType.UBER_DIRECT,
        { event: 'courier_waved', external_delivery_id: 'u-1' },
      );
      expect(res.outcome).toBe('unsupported_event');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });
});
