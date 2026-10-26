import { RealtimeTestController } from './realtime-test.controller';

describe('RealtimeTestController', () => {
  const eventBus = { emitToRoom: jest.fn() };
  const userRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 1, merchant: { companyId: 5 } }),
  };
  const controller = new RealtimeTestController(
    eventBus as any,
    userRepo as any,
  );
  const user = { id: 1 } as any;

  beforeEach(() => eventBus.emitToRoom.mockClear());

  it.each([
    ['order.created', 'test.order.created'],
    ['test.ping', 'test.ping'],
    [undefined, 'test.notification'],
  ])('emits %s as %s, never as a real event', async (requested, emitted) => {
    await controller.broadcastToCompany(user, {
      event: requested,
      message: 'hi',
    } as any);

    expect(eventBus.emitToRoom).toHaveBeenCalledWith(
      expect.any(String),
      emitted,
      expect.objectContaining({ companyId: 5 }),
    );
  });
});
