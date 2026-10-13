//src/commerce/delivery-system/delivery-zone/delivery-zone.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryZoneController } from './delivery-zone.controller';
import { DeliveryZoneService } from './delivery-zone.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

describe('DeliveryZoneController', () => {
  let controller: DeliveryZoneController;
  let service: Record<string, jest.Mock>;
  const user = { id: 2, merchant: { id: 3 } } as unknown as AuthenticatedUser;

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ data: {} }),
      findAll: jest.fn().mockResolvedValue({ data: [] }),
      findOne: jest.fn().mockResolvedValue({ data: {} }),
      update: jest.fn().mockResolvedValue({ data: {} }),
      remove: jest.fn().mockResolvedValue({ data: {} }),
      locate: jest.fn().mockResolvedValue({ data: {} }),
      coverage: jest.fn().mockResolvedValue({ data: {} }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryZoneController],
      providers: [{ provide: DeliveryZoneService, useValue: service }],
    }).compile();
    controller = module.get(DeliveryZoneController);
  });

  it('passes the JWT merchant to every operation', async () => {
    const dto = { name: 'Norte', status: 'active' };
    await controller.create(dto, user);
    await controller.findAll({ page: 1, limit: 10 }, user);
    await controller.findOne(1, user);
    await controller.update(1, { status: 'maintenance' }, user);
    await controller.remove(1, user);
    await controller.locate({ lat: 18.46, lng: -69.93 }, user);
    await controller.coverage(user);

    expect(service.create).toHaveBeenCalledWith(dto, 3);
    expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 }, 3);
    expect(service.findOne).toHaveBeenCalledWith(1, 3);
    expect(service.update).toHaveBeenCalledWith(
      1,
      { status: 'maintenance' },
      3,
    );
    expect(service.remove).toHaveBeenCalledWith(1, 3);
    expect(service.locate).toHaveBeenCalledWith(18.46, -69.93, 3);
    expect(service.coverage).toHaveBeenCalledWith(3);
  });

  it('declares locate and coverage before the :id route', () => {
    const names = Object.getOwnPropertyNames(DeliveryZoneController.prototype);
    expect(names.indexOf('locate')).toBeLessThan(names.indexOf('findOne'));
    expect(names.indexOf('coverage')).toBeLessThan(names.indexOf('findOne'));
  });
});
