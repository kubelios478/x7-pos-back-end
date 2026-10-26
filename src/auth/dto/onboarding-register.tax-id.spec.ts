import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { OnboardingRegisterDto } from './onboarding-register.dto';

const base = {
  companyName: 'Acme Corp',
  companyEmail: 'contact@acme.com',
  address: '123 Main Street, Suite 100',
  city: 'Austin',
  state: 'Texas',
  country: 'USA',
  branchName: 'Downtown Branch',
  adminEmail: 'admin@acme.com',
  password: 'SecurePass123',
};

async function taxErrors(payload: object) {
  const errors = await validate(
    plainToInstance(OnboardingRegisterDto, payload),
  );
  return errors.filter((e) => ['tax_id', 'rut'].includes(e.property));
}

describe('OnboardingRegisterDto tax ID', () => {
  it('accepts tax_id', async () => {
    expect(await taxErrors({ ...base, tax_id: '12-3456789' })).toEqual([]);
  });

  it('accepts the deprecated rut alias', async () => {
    expect(await taxErrors({ ...base, rut: '12-3456789' })).toEqual([]);
  });

  it('requires one of them', async () => {
    const errors = await taxErrors(base);
    expect(errors.map((e) => e.property)).toEqual(['tax_id']);
  });

  it('rejects an invalid tax ID', async () => {
    expect(await taxErrors({ ...base, tax_id: '12;DROP' })).toHaveLength(1);
  });
});
