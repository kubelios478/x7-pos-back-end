import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateSupplierDto } from './create-supplier.dto';
import { UpdateSupplierDto } from './update-supplier.dto';

async function taxIdErrors(
  cls: typeof CreateSupplierDto | typeof UpdateSupplierDto,
  tax_id: unknown,
) {
  const errors = await validate(
    plainToInstance(cls, { name: 'Sysco', tax_id }) as object,
  );
  return errors.filter((e) => e.property === 'tax_id');
}

describe('CreateSupplierDto.tax_id', () => {
  it.each([
    '12-3456789', // US EIN
    '123456789',
    '12.345.678-K', // CL RUT
    '12345678-9',
    '20-12345678-3', // AR CUIT
    'DE123456789', // EU VAT
  ])('accepts %s', async (taxId) => {
    expect(await taxIdErrors(CreateSupplierDto, taxId)).toEqual([]);
  });

  it.each(['', 'ABC', '12-', '-123', '12_345', '12;DROP'])(
    'rejects %j',
    async (taxId) => {
      expect(await taxIdErrors(CreateSupplierDto, taxId)).toHaveLength(1);
    },
  );

  it('is optional', async () => {
    expect(await taxIdErrors(CreateSupplierDto, undefined)).toEqual([]);
  });

  it('applies the same rule on update', async () => {
    expect(await taxIdErrors(UpdateSupplierDto, '12-3456789')).toEqual([]);
    expect(await taxIdErrors(UpdateSupplierDto, '12;DROP')).toHaveLength(1);
  });
});
