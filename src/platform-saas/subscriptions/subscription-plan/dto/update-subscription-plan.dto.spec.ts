import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateSubscriptionPlanDto } from './update-subscription-plan.dto';

describe('UpdateSubscriptionPlanDto', () => {
  it('accepts a partial payload with only status', async () => {
    const dto = plainToInstance(UpdateSubscriptionPlanDto, { status: 'inactive' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts a partial payload with only name', async () => {
    const dto = plainToInstance(UpdateSubscriptionPlanDto, { name: 'Renamed Plan' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('still rejects an invalid status value when provided', async () => {
    const dto = plainToInstance(UpdateSubscriptionPlanDto, { status: 'not-a-real-status' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });
});
