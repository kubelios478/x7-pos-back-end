import { RealtimeEventBusService } from './realtime-event-bus.service';
import type { Server } from 'socket.io';

describe('RealtimeEventBusService', () => {
  it('throws when server is not bound', () => {
    const bus = new RealtimeEventBusService();
    expect(() => bus.emitToAll('x', { ok: true })).toThrow(
      'Realtime server is not initialized',
    );
  });

  it('emits to all when server is bound', () => {
    const bus = new RealtimeEventBusService();
    const serverMock = {
      emit: jest.fn(),
    };

    bus.bindServer(serverMock as unknown as Server);
    bus.emitToAll('evt', { a: 1 });

    expect(serverMock.emit).toHaveBeenCalledWith('evt', { a: 1 });
  });
});
