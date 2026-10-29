import { normalizeTaxId } from './tax-id.util';

describe('normalizeTaxId', () => {
  it('keeps tax_id and drops nothing else', () => {
    expect(normalizeTaxId({ name: 'A', tax_id: '12-3456789' })).toEqual({
      name: 'A',
      tax_id: '12-3456789',
    });
  });

  it('maps the deprecated rut to tax_id', () => {
    expect(normalizeTaxId({ name: 'A', rut: '12-3456789' })).toEqual({
      name: 'A',
      tax_id: '12-3456789',
    });
  });

  it('prefers tax_id when both are sent', () => {
    expect(normalizeTaxId({ tax_id: '11-1111111', rut: '22-2222222' })).toEqual(
      {
        tax_id: '11-1111111',
      },
    );
  });

  it('leaves tax_id untouched when neither is sent (partial updates)', () => {
    expect(
      normalizeTaxId<{ name: string; tax_id?: string }>({ name: 'A' }),
    ).toEqual({ name: 'A' });
  });
});
