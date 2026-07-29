import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdatePlanFeatureDto } from './update-plan-features.dto';

describe('UpdatePlanFeatureDto', () => {
  it('accepts a partial payload with only status (no subscriptionPlan/feature/limit_value)', async () => {
    const dto = plainToInstance(UpdatePlanFeatureDto, {
      status: 'inactive',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts a partial payload with only limit_value', async () => {
    const dto = plainToInstance(UpdatePlanFeatureDto, {
      limit_value: 20,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('still rejects an invalid status value when provided', async () => {
    const dto = plainToInstance(UpdatePlanFeatureDto, {
      status: 'not-a-real-status',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });
});
