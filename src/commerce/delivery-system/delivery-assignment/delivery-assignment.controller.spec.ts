//src/commerce/delivery-system/delivery-assignment/delivery-assignment.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DeliveryAssignmentController } from './delivery-assignment.controller';
import { DeliveryAssignmentService } from './delivery-assignment.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { QueryDeliveryAssignmentDto } from './dto/query-delivery-assignment.dto';
import { CreateDeliveryAssignmentDto } from './dto/create-delivery-assignment.dto';
import { UpdateDeliveryAssignmentDto } from './dto/update-delivery-assignment.dto';
import { AssignmentType } from './constants/assignment-type.enum';
import { DeliveryStatus } from './constants/delivery-status.enum';

describe('DeliveryAssignmentController', () => {
  let controller: DeliveryAssignmentController;
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
      externalQuote: jest.fn().mockResolvedValue({ data: {} }),
      externalDispatch: jest.fn().mockResolvedValue({ data: {} }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryAssignmentController],
      providers: [{ provide: DeliveryAssignmentService, useValue: service }],
    }).compile();
    controller = module.get(DeliveryAssignmentController);
  });

  it('passes the JWT merchant to every operation', async () => {
    const quote = { order_id: 7, provider: AssignmentType.UBER_DIRECT };
    await controller.create({ order: 7, deliveryDriver: 5 }, user);
    await controller.findAll({ page: 1, limit: 10 }, user);
    await controller.summary(user);
    await controller.findOne(1, user);
    await controller.update(
      1,
      { delivery_status: DeliveryStatus.PICKED_UP },
      user,
    );
    await controller.remove(1, user);
    await controller.externalQuote(quote, user);
    await controller.externalDispatch(quote, user);

    expect(service.create).toHaveBeenCalledWith(
      { order: 7, deliveryDriver: 5 },
      3,
    );
    expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 }, 3);
    expect(service.summary).toHaveBeenCalledWith(3);
    expect(service.findOne).toHaveBeenCalledWith(1, 3);
    expect(service.update).toHaveBeenCalledWith(
      1,
      { delivery_status: 'picked_up' },
      3,
    );
    expect(service.remove).toHaveBeenCalledWith(1, 3);
    expect(service.externalQuote).toHaveBeenCalledWith(quote, 3);
    expect(service.externalDispatch).toHaveBeenCalledWith(quote, 3);
  });

  it('declares GET summary before GET :id', () => {
    const routes = Object.getOwnPropertyNames(
      DeliveryAssignmentController.prototype,
    );
    expect(routes.indexOf('summary')).toBeLessThan(routes.indexOf('findOne'));
  });

  describe('DTOs', () => {
    it('accepts comma-separated and repeated multi-value filters', async () => {
      const csv = plainToInstance(QueryDeliveryAssignmentDto, {
        delivery_status: 'picked_up, in_transit',
        assignment_type: 'doordash_drive,uber_direct',
      });
      const repeated = plainToInstance(QueryDeliveryAssignmentDto, {
        delivery_status: ['pending', 'assigned,failed'],
      });
      expect(csv.delivery_status).toEqual(['picked_up', 'in_transit']);
      expect(csv.assignment_type).toEqual(['doordash_drive', 'uber_direct']);
      expect(repeated.delivery_status).toEqual([
        'pending',
        'assigned',
        'failed',
      ]);
      expect(await validate(csv)).toHaveLength(0);

      const bad = plainToInstance(QueryDeliveryAssignmentDto, {
        delivery_status: 'picked_up,unassigned',
      });
      expect(await validate(bad)).not.toHaveLength(0);
    });

    it('only accepts https tracking URLs', async () => {
      const http = plainToInstance(CreateDeliveryAssignmentDto, {
        order: 1,
        external_tracking_url: 'http://track.example.com/x',
      });
      const https = plainToInstance(CreateDeliveryAssignmentDto, {
        order: 1,
        external_tracking_url: 'https://track.example.com/x',
      });
      expect(await validate(http)).not.toHaveLength(0);
      expect(await validate(https)).toHaveLength(0);
    });

    it('does not expose the server-managed timestamps to clients', () => {
      const create = new CreateDeliveryAssignmentDto();
      const update = new UpdateDeliveryAssignmentDto();
      for (const field of ['assigned_at', 'picked_up_at', 'delivered_at']) {
        expect(field in create).toBe(false);
        expect(field in update).toBe(false);
      }
    });
  });
});
