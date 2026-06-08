import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class RealtimeEventBusService {
  private server: Server | undefined;

  bindServer(server: Server) {
    this.server = server;
  }

  emitToRoom<TPayload>(room: string, event: string, payload: TPayload) {
    if (!this.server) {
      throw new Error('Realtime server is not initialized');
    }
    this.server.to(room).emit(event, payload);
  }

  emitToAll<TPayload>(event: string, payload: TPayload) {
    if (!this.server) {
      throw new Error('Realtime server is not initialized');
    }
    this.server.emit(event, payload);
  }
}
