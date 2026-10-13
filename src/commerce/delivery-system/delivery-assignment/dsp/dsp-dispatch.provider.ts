//src/commerce/delivery-system/delivery-assignment/dsp/dsp-dispatch.provider.ts
//
// Puerto hacia los DSP (DoorDash Drive, Uber Direct). La integración REAL está pendiente:
// no hay credenciales ni contratos, así que el módulo registra `NotConfiguredDspDispatchProvider`
// y los endpoints de cotización/despacho responden 503. Mientras tanto, los datos externos
// (id, URL de seguimiento, coste) los introduce el cliente al crear/editar la asignación.
// Para integrar un proveedor: implementar esta interfaz y registrarla con el token
// DSP_DISPATCH_PROVIDER en delivery-assignment.module.ts.
import { Injectable } from '@nestjs/common';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { DeliveryZone } from '../../delivery-zone/entity/delivery-zone.entity';
import { AssignmentType } from '../constants/assignment-type.enum';

export const DSP_DISPATCH_PROVIDER = Symbol('DSP_DISPATCH_PROVIDER');

export interface DspDispatchRequest {
  provider: AssignmentType;
  order: Order;
  zone: DeliveryZone | null;
}

export interface DspQuote {
  provider: AssignmentType;
  quote_id: string;
  fee: number;
  currency: string;
  expires_at: Date | null;
  estimated_pickup_at: Date | null;
  estimated_dropoff_at: Date | null;
}

export interface DspRunnerResult {
  external_delivery_id: string;
  external_tracking_url: string | null;
  fee: number | null;
}

export interface DspDispatchProvider {
  /** false = sin credenciales: el servicio responde 503 y NUNCA inventa una cotización. */
  isConfigured(provider: AssignmentType): boolean;
  quote(request: DspDispatchRequest): Promise<DspQuote>;
  requestRunner(
    request: DspDispatchRequest & { quote_id?: string },
  ): Promise<DspRunnerResult>;
}

@Injectable()
export class NotConfiguredDspDispatchProvider implements DspDispatchProvider {
  isConfigured(): boolean {
    return false;
  }

  quote(): Promise<DspQuote> {
    return Promise.reject(new Error('DSP provider not configured'));
  }

  requestRunner(): Promise<DspRunnerResult> {
    return Promise.reject(new Error('DSP provider not configured'));
  }
}
