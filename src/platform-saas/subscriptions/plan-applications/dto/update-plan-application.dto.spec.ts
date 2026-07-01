import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdatePlanApplicationDto } from './update-plan-application.dto';

describe('UpdatePlanApplicationDto', () => {
  it('accepts a partial payload with only limits and status (no application/subscriptionPlan)', async () => {
    const dto = plainToInstance(UpdatePlanApplicationDto, {
      limits: 'Updated limit',
      status: 'inactive',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('still rejects an invalid status value when provided', async () => {
    const dto = plainToInstance(UpdatePlanApplicationDto, {
      status: 'not-a-real-status',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });
});
