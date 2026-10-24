import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { OnboardingRegisterDto } from './onboarding-register.dto';

const valid = {
  companyName: 'Acme Corp',
  companyEmail: 'contact@acme.com',
  rut: '12.345.678-9',
  address: '123 Main Street, Suite 100',
  city: 'Austin',
  state: 'Texas',
  country: 'USA',
  branchName: 'Downtown Branch',
  adminEmail: 'admin@acme.com',
  password: 'SecurePass123',
};

async function invalidProperties(overrides: Partial<typeof valid>) {
  const dto = plainToInstance(OnboardingRegisterDto, {
    ...valid,
    ...overrides,
  });
  return (await validate(dto)).map((e) => e.property);
}

describe('OnboardingRegisterDto', () => {
  it('accepts a plain ASCII payload', async () => {
    expect(await invalidProperties({})).toEqual([]);
  });

  it.each([
    { city: 'Coeur d’Alene', state: 'Idaho' },
    { city: "Coeur d'Alene", state: 'Idaho' },
    { city: 'San José', state: 'California' },
    { city: 'Santiago', state: 'Región Metropolitana', country: 'Perú' },
    { city: 'Winston-Salem', state: 'N. Carolina' },
    { companyName: "Joe's Diner & Grill", branchName: 'Café Ñandú 2' },
  ])('accepts accents and apostrophes: %j', async (overrides) => {
    expect(await invalidProperties(overrides)).toEqual([]);
  });

  it.each([
    { city: 'Austin; DROP' },
    { state: '<script>' },
    { country: 'USA1' },
    { companyName: 'Acme / Corp' },
  ])('still rejects symbols: %j', async (overrides) => {
    expect(await invalidProperties(overrides)).toEqual(Object.keys(overrides));
  });
});
