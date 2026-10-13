//src/commerce/delivery-system/delivery-driver/delivery-driver.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getMetadataArgsStorage } from 'typeorm';
import { DeliveryDriverService } from './delivery-driver.service';
import { DeliveryRealtimeService } from '../realtime/delivery-realtime.service';
import { DeliveryDriver } from './entity/delivery-driver.entity';
import { VehicleType } from './constants/delivery-driver.constants';

const MERCHANT_ID = 3;

describe('DeliveryDriverService', () => {
  let service: DeliveryDriverService;
  let repo: Record<string, jest.Mock>;
  let qb: Record<string, jest.Mock>;
  let uqb: Record<string, jest.Mock>;
  let realtime: { driverStatusChanged: jest.Mock };

  const driver = (over: Partial<DeliveryDriver> = {}) =>
    ({
      id: 5,
      name: 'Mario Lopez',
      phone: '+18095551234',
      vehicleType: VehicleType.CAR,
      status: 'active',
      merchant: { id: MERCHANT_ID },
      ...over,
    }) as DeliveryDriver;

  beforeEach(async () => {
    realtime = { driverStatusChanged: jest.fn() };
    qb = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[driver()], 1]),
    };
    uqb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    repo = {
      create: jest.fn((v: unknown) => v),
      save: jest.fn((v: object) => Promise.resolve({ id: 5, ...v })),
      findOne: jest.fn().mockResolvedValue(driver()),
      query: jest.fn().mockResolvedValue([]),
      // Sin alias → UPDATE; con alias → SELECT del listado.
      createQueryBuilder: jest.fn((alias?: string) => (alias ? qb : uqb)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryDriverService,
        { provide: getRepositoryToken(DeliveryDriver), useValue: repo },
        { provide: DeliveryRealtimeService, useValue: realtime },
      ],
    }).compile();
    service = module.get(DeliveryDriverService);
  });

  it('keeps the eager ManyToOne to Merchant on merchant_id', () => {
    const relation = getMetadataArgsStorage().relations.find(
      (r) => r.target === DeliveryDriver && r.propertyName === 'merchant',
    );
    const join = getMetadataArgsStorage().joinColumns.find(
      (j) => j.target === DeliveryDriver && j.propertyName === 'merchant',
    );
    expect(relation?.relationType).toBe('many-to-one');
    expect(relation?.options.eager).toBe(true);
    expect(join?.name).toBe('merchant_id');
  });

  it('rejects callers without a merchant', async () => {
    await expect(
      service.summary(undefined as unknown as number),
    ).rejects.toThrow(ForbiddenException);
  });

  describe('create', () => {
    it('takes the merchant from the JWT and stores the normalised phone', async () => {
      repo.findOne.mockResolvedValueOnce(null);
      const res = await service.create(
        {
          name: 'Mario Lopez',
          phone: '+1 (809) 555-1234',
          vehicleType: VehicleType.E_SCOOTER,
        },
        MERCHANT_ID,
      );
      expect(repo.create).toHaveBeenCalledWith({
        merchant: { id: MERCHANT_ID },
        name: 'Mario Lopez',
        phone: '+18095551234',
        vehicleType: 'e_scooter',
        status: 'active',
      });
      expect(res.statusCode).toBe(201);
    });

    it('rejects a duplicate phone among live drivers of the merchant (409)', async () => {
      repo.findOne.mockResolvedValueOnce(driver({ id: 8 }));
      await expect(
        service.create(
          { name: 'X', phone: '809.555.1234', vehicleType: VehicleType.CAR },
          MERCHANT_ID,
        ),
      ).rejects.toThrow(ConflictException);
      expect(repo.findOne.mock.calls[0][0].where).toEqual(
        expect.objectContaining({
          merchant: { id: MERCHANT_ID },
          phone: '8095551234',
        }),
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('scopes by merchant and applies status, vehicle and search filters', async () => {
      await service.findAll(
        {
          page: 1,
          limit: 10,
          status: ['active', 'on_delivery'],
          vehicleType: [VehicleType.E_SCOOTER],
          search: '809-5%',
        },
        MERCHANT_ID,
      );
      expect(qb.where).toHaveBeenCalledWith('merchant.id = :merchantId', {
        merchantId: MERCHANT_ID,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'deliveryDriver.status IN (:...statuses)',
        { statuses: ['active', 'on_delivery'] },
      );
      const vehicle = qb.andWhere.mock.calls.find((c) =>
        String(c[0]).includes('vehicleType'),
      ) as [string, { vehicleKeys: string[] }];
      // Incluye las variantes antiguas ('E-Scooter', 'scooter'…).
      expect(vehicle[1].vehicleKeys).toEqual(
        expect.arrayContaining(['escooter', 'scooter']),
      );
      const search = qb.andWhere.mock.calls.find((c) =>
        String(c[0]).includes('ILIKE'),
      ) as [string, { term: string; phoneTerm: string }];
      expect(search[0]).toContain('deliveryDriver.name ILIKE :term');
      expect(search[0]).toContain('deliveryDriver.phone ILIKE');
      expect(search[1]).toEqual({ term: '%809-5\\%%', phoneTerm: '%8095\\%%' });
    });

    it('defaults to every non-deleted status', async () => {
      await service.findAll({ page: 1, limit: 10 }, MERCHANT_ID);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'deliveryDriver.status IN (:...statuses)',
        { statuses: ['active', 'inactive', 'on_delivery', 'off_duty'] },
      );
    });
  });

  describe('update', () => {
    it('uses a partial UPDATE guarded against on_delivery when the status changes', async () => {
      await service.update(5, { status: 'off_duty' }, MERCHANT_ID);
      expect(uqb.set).toHaveBeenCalledWith({ status: 'off_duty' });
      expect(uqb.andWhere).toHaveBeenCalledWith('status <> :onDelivery', {
        onDelivery: 'on_delivery',
      });
    });

    it('409 when the driver is on a delivery', async () => {
      uqb.execute.mockResolvedValueOnce({ affected: 0 });
      await expect(
        service.update(5, { status: 'inactive' }, MERCHANT_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('checks phone uniqueness excluding itself', async () => {
      repo.findOne
        .mockResolvedValueOnce(driver())
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(driver());
      await service.update(5, { phone: '809 555 0000' }, MERCHANT_ID);
      expect(uqb.set).toHaveBeenCalledWith({ phone: '8095550000' });
    });

    it('404 for a driver of another merchant', async () => {
      repo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.update(5, { name: 'x' }, MERCHANT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setShift', () => {
    it.each([
      [true, 'active'],
      [false, 'off_duty'],
    ])('on_shift=%s → %s', async (onShift, status) => {
      await service.setShift(5, onShift, MERCHANT_ID);
      expect(uqb.set).toHaveBeenCalledWith({ status });
      expect(uqb.andWhere).toHaveBeenCalledWith('status IN (:...togglable)', {
        togglable: ['active', 'off_duty'],
      });
    });

    it.each(['on_delivery', 'inactive'])('409 while %s', async (status) => {
      uqb.execute.mockResolvedValueOnce({ affected: 0 });
      repo.findOne
        .mockResolvedValueOnce(driver({ status }))
        .mockResolvedValueOnce(driver({ status }));
      await expect(service.setShift(5, true, MERCHANT_ID)).rejects.toThrow(
        ConflictException,
      );
      expect(realtime.driverStatusChanged).not.toHaveBeenCalled();
    });

    it('announces the new status to the fleet and dispatch screens', async () => {
      repo.findOne
        .mockResolvedValueOnce(driver())
        .mockResolvedValueOnce(driver({ status: 'off_duty' }));
      await service.setShift(5, false, MERCHANT_ID);
      expect(realtime.driverStatusChanged).toHaveBeenCalledWith({
        merchantId: MERCHANT_ID,
        driverId: 5,
        status: 'off_duty',
      });
    });
  });

  it('update announces only when the status changes', async () => {
    await service.update(5, { name: 'Mario L.' }, MERCHANT_ID);
    expect(realtime.driverStatusChanged).not.toHaveBeenCalled();
    await service.update(5, { status: 'inactive' }, MERCHANT_ID);
    expect(realtime.driverStatusChanged).toHaveBeenCalledTimes(1);
  });

  it('remove refuses a driver on a delivery', async () => {
    uqb.execute.mockResolvedValueOnce({ affected: 0 });
    await expect(service.remove(5, MERCHANT_ID)).rejects.toThrow(
      ConflictException,
    );
  });

  it('summary groups the fleet by status', async () => {
    repo.query.mockResolvedValueOnce([
      { status: 'active', count: 5 },
      { status: 'on_delivery', count: '4' },
      { status: 'off_duty', count: 2 },
      { status: 'inactive', count: 1 },
    ]);
    const res = await service.summary(MERCHANT_ID);
    expect(res.data).toEqual({
      total: 12,
      available: 5,
      en_route: 4,
      unavailable: 3,
    });
    expect(repo.query.mock.calls[0][1]).toEqual([MERCHANT_ID, 'deleted']);
  });
});
