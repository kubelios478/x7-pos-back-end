//src/commerce/delivery-system/delivery-fee/delivery-fee.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { DeliveryFeeService } from './delivery-fee.service';
import { DeliveryFee } from './entity/delivery-fee.entity';
import { DeliveryZone } from '../delivery-zone/entity/delivery-zone.entity';

const MERCHANT_ID = 3;

describe('DeliveryFeeService', () => {
  let service: DeliveryFeeService;
  let feeRepo: jest.Mocked<Repository<DeliveryFee>>;
  let zoneRepo: jest.Mocked<Repository<DeliveryZone>>;
  let qb: Record<string, jest.Mock>;

  const zone = (over: Partial<DeliveryZone> = {}) =>
    ({
      id: 1,
      name: 'Centro, Zona Norte',
      status: 'active',
      ...over,
    }) as DeliveryZone;
  const fee = (over: Partial<DeliveryFee> = {}) =>
    ({
      id: 10,
      deliveryZone: zone(),
      base_fee: 5.99,
      per_km_fee: 1.5,
      min_order_amount: 10.99,
      free_above: 50,
      status: 'active',
      ...over,
    }) as DeliveryFee;

  beforeEach(async () => {
    qb = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[fee()], 1]),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryFeeService,
        {
          provide: getRepositoryToken(DeliveryFee),
          useValue: {
            create: jest.fn((v) => v),
            save: jest.fn((v) => Promise.resolve({ id: 10, ...v })),
            findOne: jest.fn().mockResolvedValue(null),
            createQueryBuilder: jest.fn(() => qb),
          },
        },
        {
          provide: getRepositoryToken(DeliveryZone),
          useValue: {
            findOne: jest.fn().mockResolvedValue(zone()),
            query: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get(DeliveryFeeService);
    feeRepo = module.get(getRepositoryToken(DeliveryFee));
    zoneRepo = module.get(getRepositoryToken(DeliveryZone));
  });

  describe('create', () => {
    const dto = {
      deliveryZone: 1,
      base_fee: 5.99,
      per_km_fee: 1.5,
      min_order_amount: 10.99,
      free_above: 50,
      status: 'active',
    };

    it('creates a fee for a zone of the JWT merchant (eager zone attached)', async () => {
      const result = await service.create(dto, MERCHANT_ID);
      expect(zoneRepo.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: 1,
          merchant: { id: MERCHANT_ID },
        }),
      });
      expect(result.data.deliveryZone.name).toBe('Centro, Zona Norte');
    });

    it('stores missing optional amounts as null', async () => {
      const result = await service.create(
        { deliveryZone: 1, base_fee: 3, status: 'inactive' },
        MERCHANT_ID,
      );
      expect(result.data).toMatchObject({
        per_km_fee: null,
        min_order_amount: null,
        free_above: null,
      });
    });

    it('404s for a zone of another merchant', async () => {
      zoneRepo.findOne.mockResolvedValue(null);
      await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects free_above <= min_order_amount', async () => {
      await expect(
        service.create({ ...dto, free_above: 10.99 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ ...dto, free_above: 5 }, MERCHANT_ID),
      ).rejects.toThrow(/must be greater than min_order_amount/);
    });

    it('rejects a second active fee for the same zone with 409', async () => {
      feeRepo.findOne.mockResolvedValue(fee({ id: 7 }));
      await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(
        ConflictException,
      );
      expect(feeRepo.save).not.toHaveBeenCalled();
    });

    it('allows an inactive draft next to an active fee', async () => {
      feeRepo.findOne.mockResolvedValue(fee({ id: 7 }));
      await expect(
        service.create({ ...dto, status: 'inactive' }, MERCHANT_ID),
      ).resolves.toBeDefined();
    });

    it('maps the unique-index violation of a race to 409', async () => {
      feeRepo.save.mockRejectedValue(
        Object.assign(new Error('dup'), { code: '23505' }),
      );
      await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('validates thresholds against the stored values', async () => {
      feeRepo.findOne.mockResolvedValueOnce(fee());
      await expect(
        service.update(10, { min_order_amount: 60 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('excludes itself from the single-active check', async () => {
      feeRepo.findOne.mockResolvedValueOnce(fee()).mockResolvedValueOnce(null);
      const result = await service.update(10, { base_fee: 6.5 }, MERCHANT_ID);
      expect(result.data.base_fee).toBe(6.5);
      expect(feeRepo.findOne).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
            id: expect.anything(),
          }),
        }),
      );
    });

    it('409s when activating while another fee is active', async () => {
      feeRepo.findOne
        .mockResolvedValueOnce(fee({ status: 'inactive' }))
        .mockResolvedValueOnce(fee({ id: 11 }));
      await expect(
        service.update(10, { status: 'active' }, MERCHANT_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('resolves a new zone id to the scoped entity', async () => {
      feeRepo.findOne.mockResolvedValueOnce(fee({ status: 'inactive' }));
      zoneRepo.findOne.mockResolvedValue(zone({ id: 2, name: 'Sur' }));
      const result = await service.update(10, { deliveryZone: 2 }, MERCHANT_ID);
      expect(result.data.deliveryZone).toMatchObject({ id: 2, name: 'Sur' });
    });
  });

  describe('findAll', () => {
    it('scopes by merchant, hides deleted zones and filters by zone name', async () => {
      await service.findAll(
        { page: 1, limit: 10, search: 'norte' },
        MERCHANT_ID,
      );
      expect(qb.where).toHaveBeenCalledWith('merchant.id = :merchantId', {
        merchantId: MERCHANT_ID,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'deliveryZone.status <> :deletedZone',
        {
          deletedZone: 'deleted',
        },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'deliveryZone.name ILIKE :term',
        {
          term: '%norte%',
        },
      );
    });
    it('filters by several statuses at once', async () => {
      await service.findAll(
        { page: 1, limit: 10, status: ['active', 'inactive'] },
        MERCHANT_ID,
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'deliveryFee.status IN (:...statuses)',
        {
          statuses: ['active', 'inactive'],
        },
      );
    });
  });

  describe('summary', () => {
    it('averages active fees, counts free-shipping zones and flags zones without fee', async () => {
      zoneRepo.query.mockResolvedValue([
        { id: 1, name: 'Centro', base_fee: '4.00', free_above: '50.00' },
        { id: 2, name: 'Norte', base_fee: '5.99', free_above: null },
        { id: 3, name: 'Sur', base_fee: null, free_above: null },
      ]);
      const { data } = await service.summary(MERCHANT_ID);
      expect(zoneRepo.query).toHaveBeenCalledWith(expect.any(String), [
        MERCHANT_ID,
        'active',
      ]);
      expect(data).toEqual({
        active_zones: 3,
        active_fees: 2,
        avg_base_fee: 5,
        free_shipping_zones: 1,
        zones_without_fee_count: 1,
        zones_without_fee: [{ id: 3, name: 'Sur' }],
      });
    });

    it('returns a null average when no zone has an active fee', async () => {
      const { data } = await service.summary(MERCHANT_ID);
      expect(data.avg_base_fee).toBeNull();
      expect(data.zones_without_fee_count).toBe(0);
    });

    it('requires a merchant', async () => {
      await expect(
        service.summary(undefined as unknown as number),
      ).rejects.toThrow();
    });
  });

  describe('quote', () => {
    it('computes base + distance x per km', async () => {
      feeRepo.findOne.mockResolvedValue(fee());
      const { data } = await service.quote(
        { delivery_zone_id: 1, subtotal: 20, distance_km: 3 },
        MERCHANT_ID,
      );
      expect(data).toMatchObject({ eligible: true, fee: 10.49, reason: null });
    });

    it('is free at or above free_above', async () => {
      feeRepo.findOne.mockResolvedValue(fee());
      const { data } = await service.quote(
        { delivery_zone_id: 1, subtotal: 50, distance_km: 3 },
        MERCHANT_ID,
      );
      expect(data).toMatchObject({ free_delivery: true, fee: 0 });
    });

    it('blocks below the minimum order with the missing amount', async () => {
      feeRepo.findOne.mockResolvedValue(fee());
      const { data } = await service.quote(
        { delivery_zone_id: 1, subtotal: 8, distance_km: 1 },
        MERCHANT_ID,
      );
      expect(data).toMatchObject({
        eligible: false,
        reason: 'below_min_order',
        shortfall: 2.99,
      });
      expect(data.message).toMatch(/Add \$2\.99 more/);
    });

    it('blocks a zone that is inactive or in maintenance', async () => {
      zoneRepo.findOne.mockResolvedValue(zone({ status: 'maintenance' }));
      feeRepo.findOne.mockResolvedValue(fee());
      const { data } = await service.quote(
        { delivery_zone_id: 1, subtotal: 30 },
        MERCHANT_ID,
      );
      expect(data).toMatchObject({
        eligible: false,
        reason: 'zone_not_accepting_orders',
      });
    });

    it('blocks a zone without an active fee', async () => {
      const { data } = await service.quote(
        { delivery_zone_id: 1, subtotal: 30 },
        MERCHANT_ID,
      );
      expect(data).toMatchObject({ eligible: false, reason: 'no_active_fee' });
    });
  });
});
