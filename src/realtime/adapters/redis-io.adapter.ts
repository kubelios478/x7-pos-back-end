import { CorsIoAdapter } from './cors-io.adapter';
import type { INestApplicationContext } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { DefaultEventsMap, Server, type ServerOptions } from 'socket.io';

/** socket.io Server type aligned with default event maps (IoAdapter is untyped). */
type IoServer = Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  unknown
>;

export class RedisIoAdapter extends CorsIoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | undefined;

  constructor(
    app: INestApplicationContext,
    private readonly redisUrl: string,
    origins: string[] | null = null,
  ) {
    super(app, origins);
  }

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: this.redisUrl });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): IoServer {
    const created: unknown = super.createIOServer(port, options);
    if (!(created instanceof Server)) {
      throw new Error(
        'Expected socket.io Server from IoAdapter.createIOServer',
      );
    }
    if (this.adapterConstructor) {
      created.adapter(this.adapterConstructor);
    }
    return created as IoServer;
  }
}
