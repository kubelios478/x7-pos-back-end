import type { DefaultEventsMap, Socket } from 'socket.io';
import type { RealtimeAuthenticatedUser } from './realtime-auth.service';

/** Socket.IO client with typed `data` for the `/realtime` namespace. */
export type RealtimeSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  { user?: RealtimeAuthenticatedUser }
>;
