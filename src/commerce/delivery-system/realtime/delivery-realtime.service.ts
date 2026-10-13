//src/commerce/delivery-system/realtime/delivery-realtime.service.ts
//
// Eventos en vivo de Delivery Management hacia el backoffice: posición de los repartidores,
// cambios de asignaciones y de estado de la flota. Van a la sala del comercio del gateway
// /realtime (el socket entra en ella al autenticar).
//
// NUNCA lanza: si el gateway está apagado (WS_ENABLED=false) o aún no ha arrancado, el
// evento se pierde y las vistas siguen con su sondeo. Un fallo del canal en vivo no puede
// tumbar el alta de una posición o el cierre de un reparto.
import { Injectable, Logger } from '@nestjs/common';
import { RealtimeEventBusService } from 'src/realtime/realtime-event-bus.service';
import { merchantRoom } from 'src/realtime/realtime.constants';

export const DELIVERY_EVENTS = {
  locationUpdated: 'delivery:location_updated',
  assignmentChanged: 'delivery:assignment_changed',
  driverStatusChanged: 'delivery:driver_status_changed',
} as const;

export interface LocationUpdatedPayload {
  merchantId: number;
  assignmentId: number;
  trackingId: number;
  driverId: number | null;
  lat: number;
  lng: number;
  recorded_at: string;
  status: string;
  emittedAt: string;
}

export interface DeliveryAssignmentChangedPayload {
  merchantId: number;
  assignmentId: number;
  delivery_status: string;
  driverId: number | null;
  emittedAt: string;
}

export interface DriverStatusChangedPayload {
  merchantId: number;
  driverId: number;
  status: string;
  emittedAt: string;
}

@Injectable()
export class DeliveryRealtimeService {
  private readonly logger = new Logger('DeliveryRealtime');

  constructor(private readonly eventBus: RealtimeEventBusService) {}

  private emit(merchantId: number, event: string, payload: object): void {
    try {
      this.eventBus.emitToRoom(merchantRoom(merchantId), event, payload);
    } catch (error) {
      this.logger.debug(
        `Realtime event ${event} not sent: ${(error as Error)?.message ?? error}`,
      );
    }
  }

  locationUpdated(payload: Omit<LocationUpdatedPayload, 'emittedAt'>): void {
    this.emit(payload.merchantId, DELIVERY_EVENTS.locationUpdated, {
      ...payload,
      emittedAt: new Date().toISOString(),
    });
  }

  assignmentChanged(
    payload: Omit<DeliveryAssignmentChangedPayload, 'emittedAt'>,
  ): void {
    this.emit(payload.merchantId, DELIVERY_EVENTS.assignmentChanged, {
      ...payload,
      emittedAt: new Date().toISOString(),
    });
  }

  driverStatusChanged(
    payload: Omit<DriverStatusChangedPayload, 'emittedAt'>,
  ): void {
    this.emit(payload.merchantId, DELIVERY_EVENTS.driverStatusChanged, {
      ...payload,
      emittedAt: new Date().toISOString(),
    });
  }
}
