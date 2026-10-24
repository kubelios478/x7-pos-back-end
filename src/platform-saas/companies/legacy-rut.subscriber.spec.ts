import { InsertEvent, UpdateEvent } from 'typeorm';
import { LegacyRutSubscriber } from './legacy-rut.subscriber';
import { Company } from './entities/company.entity';
import { Merchant } from '../merchants/entities/merchant.entity';

describe('LegacyRutSubscriber', () => {
  const subscriber = new LegacyRutSubscriber();

  it('exposes rut on loaded companies and merchants', () => {
    const company = Object.assign(new Company(), { tax_id: '12-3456789' });
    const merchant = Object.assign(new Merchant(), { tax_id: '98-7654321' });

    subscriber.afterLoad(company);
    subscriber.afterLoad(merchant);

    expect(company.rut).toBe('12-3456789');
    expect(merchant.rut).toBe('98-7654321');
  });

  it('refreshes rut after insert and update', () => {
    const merchant = Object.assign(new Merchant(), { tax_id: '11-1111111' });
    subscriber.afterInsert({
      entity: merchant,
    } as unknown as InsertEvent<unknown>);
    expect(merchant.rut).toBe('11-1111111');

    merchant.tax_id = '22-2222222';
    subscriber.afterUpdate({
      entity: merchant,
    } as unknown as UpdateEvent<unknown>);
    expect(merchant.rut).toBe('22-2222222');
  });

  it('ignores other entities', () => {
    const other: Record<string, unknown> = { tax_id: '12-3456789' };
    subscriber.afterLoad(other);
    expect(other).not.toHaveProperty('rut');
  });
});
