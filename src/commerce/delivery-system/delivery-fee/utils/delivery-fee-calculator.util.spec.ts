//src/commerce/delivery-system/delivery-fee/utils/delivery-fee-calculator.util.spec.ts
import { computeDeliveryFee } from './delivery-fee-calculator.util';

const schedule = {
  base_fee: 5.99,
  per_km_fee: 1.5,
  min_order_amount: 10.99,
  free_above: 50,
};

describe('computeDeliveryFee', () => {
  it('charges base_fee + distance x per_km_fee', () => {
    const quote = computeDeliveryFee(schedule, 20, 3);
    expect(quote).toMatchObject({
      eligible: true,
      free_delivery: false,
      distance_charge: 4.5,
      fee: 10.49,
    });
  });

  it('has no floating point residue', () => {
    // 5.99 + 3 × 1.1 = 9.290000000000001 en coma flotante.
    const quote = computeDeliveryFee(
      { base_fee: 5.99, per_km_fee: 1.1 },
      20,
      3,
    );
    expect(quote.fee).toBe(9.29);
  });

  it('applies a flat fee when per_km_fee is null or zero', () => {
    expect(
      computeDeliveryFee({ ...schedule, per_km_fee: null }, 20, 8).fee,
    ).toBe(5.99);
    expect(computeDeliveryFee({ ...schedule, per_km_fee: 0 }, 20, 8).fee).toBe(
      5.99,
    );
  });

  it('waives the fee when subtotal >= free_above (inclusive)', () => {
    const quote = computeDeliveryFee(schedule, 50, 10);
    expect(quote).toMatchObject({
      free_delivery: true,
      fee: 0,
      distance_charge: 0,
    });
  });

  it('charges just below the free threshold', () => {
    expect(computeDeliveryFee(schedule, 49.99, 0).fee).toBe(5.99);
  });

  it('blocks below the minimum order and reports the shortfall', () => {
    const quote = computeDeliveryFee(schedule, 8.5, 2);
    expect(quote.eligible).toBe(false);
    expect(quote.shortfall).toBe(2.49);
  });

  it('accepts exactly the minimum order', () => {
    expect(computeDeliveryFee(schedule, 10.99, 0).eligible).toBe(true);
  });

  it('accepts decimal strings as Postgres returns them', () => {
    const quote = computeDeliveryFee(
      {
        base_fee: '5.99',
        per_km_fee: '1.50',
        min_order_amount: null,
        free_above: null,
      },
      20,
      2,
    );
    expect(quote.fee).toBe(8.99);
  });

  it('ignores negative or invalid distances', () => {
    expect(computeDeliveryFee(schedule, 20, -4).fee).toBe(5.99);
    expect(computeDeliveryFee(schedule, 20, Number.NaN).fee).toBe(5.99);
  });
});
