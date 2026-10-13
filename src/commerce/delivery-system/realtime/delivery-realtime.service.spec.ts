//src/commerce/delivery-system/realtime/delivery-realtime.service.spec.ts
import { RealtimeEventBusService } from 'src/realtime/realtime-event-bus.service';
import { DeliveryRealtimeService } from './delivery-realtime.service';

describe('DeliveryRealtimeService', () => {
  const bus = { emitToRoom: jest.fn() };
  const service = new DeliveryRealtimeService(
    bus as unknown as RealtimeEventBusService,
  );

  beforeEach(() => bus.emitToRoom.mockReset());

  it('emits to the merchant room with a timestamp', () => {
    service.assignmentChanged({
      merchantId: 3,
      assignmentId: 7,
      delivery_status: 'picked_up',
      driverId: 2,
    });
    expect(bus.emitToRoom).toHaveBeenCalledWith(
      'merchant:3',
      'delivery:assignment_changed',
      expect.objectContaining({
        assignmentId: 7,
        delivery_status: 'picked_up',
        emittedAt: expect.any(String),
      }),
    );
  });

  it('never throws when the gateway is not running', () => {
    bus.emitToRoom.mockImplementation(() => {
      throw new Error('Realtime server is not initialized');
    });
    expect(() =>
      service.driverStatusChanged({
        merchantId: 3,
        driverId: 2,
        status: 'active',
      }),
    ).not.toThrow();
  });
});
