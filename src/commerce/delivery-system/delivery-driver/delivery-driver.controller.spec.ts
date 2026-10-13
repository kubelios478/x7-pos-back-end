//src/commerce/delivery-system/delivery-driver/delivery-driver.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DeliveryDriverController } from './delivery-driver.controller';
import { DeliveryDriverService } from './delivery-driver.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CreateDeliveryDriverDto } from './dto/create-delivery-driver.dto';
import { QueryDeliveryDriverDto } from './dto/query-delivery-driver.dto';
import { VehicleType } from './constants/delivery-driver.constants';
import { normalizeVehicleType } from './utils/delivery-driver-normalize.util';

describe('DeliveryDriverController', () => {
  let controller: DeliveryDriverController;
  let service: Record<string, jest.Mock>;
  const user = { id: 2, merchant: { id: 3 } } as unknown as AuthenticatedUser;

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ data: {} }),
      findAll: jest.fn().mockResolvedValue({ data: [] }),
      findOne: jest.fn().mockResolvedValue({ data: {} }),
      update: jest.fn().mockResolvedValue({ data: {} }),
      remove: jest.fn().mockResolvedValue({ data: {} }),
      summary: jest.fn().mockResolvedValue({ data: {} }),
      setShift: jest.fn().mockResolvedValue({ data: {} }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryDriverController],
      providers: [{ provide: DeliveryDriverService, useValue: service }],
    }).compile();
    controller = module.get(DeliveryDriverController);
  });

  it('passes the JWT merchant to every operation', async () => {
    const dto = {
      name: 'Mario',
      phone: '+18095551234',
      vehicleType: VehicleType.CAR,
    };
    await controller.create(dto, user);
    await controller.findAll({ page: 1, limit: 10 }, user);
    await controller.summary(user);
    await controller.findOne(1, user);
    await controller.update(1, { name: 'M' }, user);
    await controller.setShift(1, { on_shift: false }, user);
    await controller.remove(1, user);

    expect(service.create).toHaveBeenCalledWith(dto, 3);
    expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 }, 3);
    expect(service.summary).toHaveBeenCalledWith(3);
    expect(service.findOne).toHaveBeenCalledWith(1, 3);
    expect(service.update).toHaveBeenCalledWith(1, { name: 'M' }, 3);
    expect(service.setShift).toHaveBeenCalledWith(1, false, 3);
    expect(service.remove).toHaveBeenCalledWith(1, 3);
  });

  it('declares GET summary before GET :id', () => {
    const routes = Object.getOwnPropertyNames(
      DeliveryDriverController.prototype,
    );
    expect(routes.indexOf('summary')).toBeLessThan(routes.indexOf('findOne'));
  });

  describe('CreateDeliveryDriverDto', () => {
    const build = (over: Record<string, unknown> = {}) =>
      plainToInstance(CreateDeliveryDriverDto, {
        name: 'Mario Lopez',
        phone: '+1 (809) 555-1234',
        vehicleType: 'E-Scooter',
        ...over,
      });

    it('normalises the phone and the vehicle label', async () => {
      const dto = build();
      expect(dto.phone).toBe('+18095551234');
      expect(dto.vehicleType).toBe('e_scooter');
      expect(await validate(dto)).toHaveLength(0);
    });

    it.each([
      ['on foot', 'on_foot'],
      ['ON FOOT', 'on_foot'],
      ['Motorcycle', 'motorcycle'],
      ['bicycle', 'bicycle'],
      ['e_scooter', 'e_scooter'],
      ['Car', 'car'],
    ])('vehicle %s → %s', (input, expected) => {
      expect(build({ vehicleType: input }).vehicleType).toBe(expected);
    });

    it.each([
      [{ vehicleType: 'tank' }],
      [{ status: 'on_delivery' }],
      [{ name: 'x'.repeat(101) }],
      [{ phone: '+1 809 555 1234 5678 90123' }],
      [{ phone: 'call me' }],
      [{ merchant: 1 }],
    ])('rejects %j', async (over) => {
      const errors = await validate(build(over), {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errors).not.toHaveLength(0);
    });

    it('maps legacy free-text vehicles and leaves unknown ones untouched', () => {
      expect(normalizeVehicleType('Moto')).toBe('motorcycle');
      expect(normalizeVehicleType('bike')).toBe('bicycle');
      expect(normalizeVehicleType('Van')).toBeNull();
    });
  });

  it('query DTO splits multi-value status and vehicle filters', async () => {
    const dto = plainToInstance(QueryDeliveryDriverDto, {
      status: 'active,off_duty',
      vehicleType: ['Car', 'On Foot'],
    });
    expect(dto.status).toEqual(['active', 'off_duty']);
    expect(dto.vehicleType).toEqual(['car', 'on_foot']);
    expect(await validate(dto)).toHaveLength(0);
  });
});
