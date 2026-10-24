import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { Company } from './entities/company.entity';
import { Merchant } from '../merchants/entities/merchant.entity';

/**
 * Keeps the deprecated `rut` field in company and merchant responses (same value as
 * tax_id) while clients move to `tax_id`. Remove once no client reads `rut`.
 */
@EventSubscriber()
export class LegacyRutSubscriber implements EntitySubscriberInterface {
  afterLoad(entity: unknown): void {
    this.expose(entity);
  }

  afterInsert(event: InsertEvent<unknown>): void {
    this.expose(event.entity);
  }

  afterUpdate(event: UpdateEvent<unknown>): void {
    this.expose(event.entity);
  }

  private expose(entity: unknown): void {
    if (entity instanceof Company || entity instanceof Merchant) {
      entity.rut = entity.tax_id;
    }
  }
}
