import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';

/**
 * Socket.IO adapter that applies the allowed origins when the server is created: engine.io
 * builds its CORS handling at that moment, so changing it later (afterInit) has no effect.
 * `origins` null keeps the gateway's own setting.
 */
export class CorsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly origins: string[] | null,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    const withCors: ServerOptions | undefined =
      this.origins && options
        ? {
            ...options,
            cors: { ...(options.cors ?? {}), origin: this.origins },
          }
        : options;
    return super.createIOServer(port, withCors);
  }
}
