//src/commerce/delivery-system/delivery-fee/delivery-fee.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryFeeController } from './delivery-fee.controller';
import { DeliveryFeeService } from './delivery-fee.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

describe('DeliveryFeeController', () => {
  let controller: DeliveryFeeController;
  let service: Record<string, jest.Mock>;
  const user = { id: 2, merchant: { id: 3 } } as unknown as AuthenticatedUser;

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ data: {} }),
      findAll: jest.fn().mockResolvedValue({ data: [] }),
      findOne: jest.fn().mockResolvedValue({ data: {} }),
      update: jest.fn().mockResolvedValue({ data: {} }),
      remove: jest.fn().mockResolvedValue({ data: {} }),
      quote: jest.fn().mockResolvedValue({ data: {} }),
      summary: jest.fn().mockResolvedValue({ data: {} }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryFeeController],
      providers: [{ provide: DeliveryFeeService, useValue: service }],
    }).compile();
    controller = module.get(DeliveryFeeController);
  });

  it('passes the JWT merchant to every operation', async () => {
    const dto = { deliveryZone: 1, base_fee: 5.99, status: 'active' };
    const quote = { delivery_zone_id: 1, subtotal: 20, distance_km: 3 };
    await controller.create(dto, user);
    await controller.findAll({ page: 1, limit: 10 }, user);
    await controller.findOne(1, user);
    await controller.update(1, { status: 'inactive' }, user);
    await controller.remove(1, user);
    await controller.quote(quote, user);
    await controller.summary(user);

    expect(service.create).toHaveBeenCalledWith(dto, 3);
    expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 }, 3);
    expect(service.findOne).toHaveBeenCalledWith(1, 3);
    expect(service.summary).toHaveBeenCalledWith(3);
    expect(service.update).toHaveBeenCalledWith(1, { status: 'inactive' }, 3);
    expect(service.remove).toHaveBeenCalledWith(1, 3);
    expect(service.quote).toHaveBeenCalledWith(quote, 3);
  });
});
