//src/commerce/delivery-system/delivery-zone/delivery-zone.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { DeliveryZoneService } from './delivery-zone.service';
import { DeliveryZone } from './entity/delivery-zone.entity';

const MERCHANT_ID = 3;

const SQUARE = {
  type: 'Polygon',
  coordinates: [
    [
      [-69.94, 18.45],
      [-69.92, 18.45],
      [-69.92, 18.47],
      [-69.94, 18.47],
      [-69.94, 18.45],
    ],
  ],
};

describe('DeliveryZoneService', () => {
  let service: DeliveryZoneService;
  let repository: jest.Mocked<Repository<DeliveryZone>>;
  let merchantRepository: jest.Mocked<Repository<Merchant>>;
  let qb: Record<string, jest.Mock>;

  const merchant = { id: MERCHANT_ID, name: 'Prueba' } as Merchant;
  const zone = (over: Partial<DeliveryZone> = {}): DeliveryZone =>
    ({
      id: 1,
      merchant,
      name: 'Centro, Zona Norte',
      description: null,
      geojson: SQUARE,
      status: 'active',
      ...over,
    }) as DeliveryZone;

  beforeEach(async () => {
    qb = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[zone()], 1]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryZoneService,
        {
          provide: getRepositoryToken(DeliveryZone),
          useValue: {
            create: jest.fn((v) => v),
            save: jest.fn((v) => Promise.resolve({ id: 1, ...v })),
            findOne: jest.fn(),
            find: jest.fn(),
            query: jest.fn(),
            createQueryBuilder: jest.fn(() => qb),
          },
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: { findOne: jest.fn().mockResolvedValue(merchant) },
        },
      ],
    }).compile();

    service = module.get(DeliveryZoneService);
    repository = module.get(getRepositoryToken(DeliveryZone));
    merchantRepository = module.get(getRepositoryToken(Merchant));
  });

  describe('create', () => {
    it('binds the zone to the JWT merchant, ignoring the body merchant', async () => {
      const result = await service.create(
        { merchant: 99, name: 'Norte', status: 'active', geojson: SQUARE },
        MERCHANT_ID,
      );
      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: MERCHANT_ID },
      });
      expect(result.data.merchant).toBe(merchant);
      expect(result.statusCode).toBe(201);
    });

    it('stores a JSON string boundary as a parsed object', async () => {
      const result = await service.create(
        { name: 'Norte', status: 'active', geojson: JSON.stringify(SQUARE) },
        MERCHANT_ID,
      );
      expect(result.data.geojson).toEqual(SQUARE);
    });

    it('accepts the maintenance status and an empty description', async () => {
      const result = await service.create(
        { name: 'Norte', status: 'maintenance', description: '' },
        MERCHANT_ID,
      );
      expect(result.data).toMatchObject({
        status: 'maintenance',
        description: null,
        geojson: null,
      });
    });

    it('rejects an unclosed polygon with 400', async () => {
      const open = {
        type: 'Polygon',
        coordinates: [
          [
            [-69.94, 18.45],
            [-69.92, 18.45],
            [-69.92, 18.47],
            [-69.94, 18.47],
          ],
        ],
      };
      await expect(
        service.create(
          { name: 'N', status: 'active', geojson: open },
          MERCHANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejects malformed JSON text with 400', async () => {
      await expect(
        service.create(
          { name: 'N', status: 'active', geojson: '{oops' },
          MERCHANT_ID,
        ),
      ).rejects.toThrow(/not valid JSON/);
    });

    it('refuses a user without merchant', async () => {
      await expect(
        service.create(
          { name: 'N', status: 'active' },
          undefined as unknown as number,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('scopes by merchant and includes maintenance zones by default', async () => {
      await service.findAll({ page: 1, limit: 10 }, MERCHANT_ID);
      expect(qb.where).toHaveBeenCalledWith('merchant.id = :merchantId', {
        merchantId: MERCHANT_ID,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'deliveryZone.status IN (:...statuses)',
        { statuses: ['active', 'inactive', 'maintenance'] },
      );
    });

    it('searches name and description, escaping LIKE wildcards', async () => {
      await service.findAll(
        { page: 1, limit: 10, search: ' 50%_off ' },
        MERCHANT_ID,
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(deliveryZone.name ILIKE :term OR deliveryZone.description ILIKE :term)',
        { term: '%50\\%\\_off%' },
      );
    });

    it('filters by several statuses at once', async () => {
      await service.findAll(
        { page: 1, limit: 10, status: ['active', 'maintenance'] },
        MERCHANT_ID,
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'deliveryZone.status IN (:...statuses)',
        {
          statuses: ['active', 'maintenance'],
        },
      );
    });
  });

  describe('findOne (eager merchant)', () => {
    it('loads the merchant relation, scoped to the JWT merchant', async () => {
      repository.findOne.mockResolvedValue(zone());
      const result = await service.findOne(1, MERCHANT_ID);
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 1,
            merchant: { id: MERCHANT_ID },
          }),
          relations: ['merchant'],
        }),
      );
      expect(result.data.merchant.name).toBe('Prueba');
    });

    it('404s for another merchant zone', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne(1, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates fields one by one and never reassigns the merchant', async () => {
      repository.findOne.mockResolvedValue(zone());
      const result = await service.update(
        1,
        { merchant: 99, status: 'inactive', name: 'Renamed' },
        MERCHANT_ID,
      );
      expect(result.data.merchant).toBe(merchant);
      expect(result.data).toMatchObject({
        status: 'inactive',
        name: 'Renamed',
      });
      expect(result.data.geojson).toEqual(SQUARE);
    });

    it('clears the boundary when geojson is null', async () => {
      repository.findOne.mockResolvedValue(zone());
      const result = await service.update(1, { geojson: null }, MERCHANT_ID);
      expect(result.data.geojson).toBeNull();
    });

    it('rejects an invalid boundary', async () => {
      repository.findOne.mockResolvedValue(zone());
      await expect(
        service.update(
          1,
          { geojson: { type: 'Point', coordinates: [0, 0] } },
          MERCHANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('soft-deletes a scoped zone', async () => {
      repository.findOne.mockResolvedValue(zone());
      const result = await service.remove(1, MERCHANT_ID);
      expect(result.data.status).toBe('deleted');
    });
  });

  describe('locate (point-in-polygon)', () => {
    it('reports active zones as covering and others as blocked', async () => {
      repository.find.mockResolvedValue([
        zone({ id: 1, status: 'active' }),
        zone({ id: 2, status: 'maintenance', name: 'Sur' }),
        zone({ id: 3, geojson: null }),
      ]);
      const { data } = await service.locate(18.46, -69.93, MERCHANT_ID);
      expect(data.covered).toBe(true);
      expect(data.zones.map((z) => z.id)).toEqual([1]);
      expect(data.blocked_zones.map((z) => z.id)).toEqual([2]);
    });

    it('is not covered outside every polygon', async () => {
      repository.find.mockResolvedValue([zone()]);
      const { data } = await service.locate(18.6, -69.93, MERCHANT_ID);
      expect(data).toMatchObject({
        covered: false,
        zones: [],
        blocked_zones: [],
      });
    });

    it('is not covered when only a maintenance zone contains the point', async () => {
      repository.find.mockResolvedValue([zone({ status: 'maintenance' })]);
      const { data } = await service.locate(18.46, -69.93, MERCHANT_ID);
      expect(data.covered).toBe(false);
      expect(data.blocked_zones).toHaveLength(1);
    });
  });

  describe('coverage', () => {
    it('computes the geofenced share of delivery orders', async () => {
      repository.query
        .mockResolvedValueOnce([{ delivery_orders: 8, matched_orders: 6 }])
        .mockResolvedValueOnce([{ active_zones: 4, zones_without_geojson: 2 }]);
      const { data } = await service.coverage(MERCHANT_ID);
      expect(data).toEqual({
        delivery_orders: 8,
        matched_orders: 6,
        coverage_pct: 75,
        active_zones: 4,
        zones_without_geojson: 2,
      });
      expect(repository.query).toHaveBeenCalledWith(expect.any(String), [
        MERCHANT_ID,
      ]);
      expect(repository.query).toHaveBeenCalledWith(expect.any(String), [
        MERCHANT_ID,
        'active',
        ['active', 'inactive', 'maintenance'],
      ]);
    });

    it('returns null percentage when there are no delivery orders', async () => {
      repository.query.mockResolvedValue([
        { delivery_orders: 0, matched_orders: 0 },
      ]);
      const { data } = await service.coverage(MERCHANT_ID);
      expect(data.coverage_pct).toBeNull();
    });
  });

  describe('radiusPolygon', () => {
    it('returns a ready-to-save GeoJSON polygon without touching the database', () => {
      const { data } = service.radiusPolygon({
        lat: 18.4662,
        lng: -69.9384,
        radius_km: 3,
        segments: 16,
      });
      expect(data.geojson.type).toBe('Polygon');
      expect(data.vertex_count).toBe(16);
      expect(data.radius_km).toBe(3);
      expect(repository.query).not.toHaveBeenCalled();
    });
  });
});
