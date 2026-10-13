//src/commerce/delivery-system/delivery-tracking/delivery-tracking.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryTrackingController } from './delivery-tracking.controller';
import { DeliveryTrackingService } from './delivery-tracking.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

describe('DeliveryTrackingController', () => {
  let controller: DeliveryTrackingController;
  let service: Record<string, jest.Mock>;
  const user = { id: 2, merchant: { id: 3 } } as unknown as AuthenticatedUser;

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ data: {} }),
      findAll: jest.fn().mockResolvedValue({ data: [] }),
      findOne: jest.fn().mockResolvedValue({ data: {} }),
      update: jest.fn().mockResolvedValue({ data: {} }),
      remove: jest.fn().mockResolvedValue({ data: {} }),
      route: jest.fn().mockResolvedValue({ data: {} }),
      live: jest.fn().mockResolvedValue({ data: [] }),
      summary: jest.fn().mockResolvedValue({ data: {} }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryTrackingController],
      providers: [{ provide: DeliveryTrackingService, useValue: service }],
    }).compile();
    controller = module.get(DeliveryTrackingController);
  });

  it('passes the JWT merchant to every operation', async () => {
    const dto = { deliveryAssignment: 7, latitude: 18.47, longitude: -69.93 };
    await controller.create(dto, user);
    await controller.findAll({ page: 1, limit: 10 }, user);
    await controller.findOne(1, user);
    await controller.update(1, { latitude: 18.5 }, user);
    await controller.remove(1, user);
    await controller.route(7, user);
    await controller.live({ delivery_driver_id: 2 }, user);
    await controller.summary(user);

    expect(service.create).toHaveBeenCalledWith(dto, 3);
    expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 }, 3);
    expect(service.findOne).toHaveBeenCalledWith(1, 3);
    expect(service.update).toHaveBeenCalledWith(1, { latitude: 18.5 }, 3);
    expect(service.remove).toHaveBeenCalledWith(1, 3);
    expect(service.route).toHaveBeenCalledWith(7, 3);
    expect(service.live).toHaveBeenCalledWith({ delivery_driver_id: 2 }, 3);
    expect(service.summary).toHaveBeenCalledWith(3);
  });
});
