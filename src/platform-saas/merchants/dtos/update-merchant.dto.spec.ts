import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateMerchantDto } from './update-merchant.dto';

describe('UpdateMerchantDto timezone', () => {
  const errorsFor = async (timezone: string) =>
    (await validate(plainToInstance(UpdateMerchantDto, { timezone }))).filter(
      (e) => e.property === 'timezone',
    );

  it('accepts an IANA time zone', async () => {
    expect(await errorsFor('America/New_York')).toHaveLength(0);
  });

  it('rejects anything that is not an IANA time zone', async () => {
    const [error] = await errorsFor('Eastern time');
    expect(Object.values(error.constraints ?? {})).toEqual([
      'timezone must be a valid IANA time zone, e.g. America/New_York',
    ]);
  });
});
