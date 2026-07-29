import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateApplicationDto } from './update-application.dto';

describe('UpdateApplicationDto', () => {
  it('accepts a partial payload with only status', async () => {
    const dto = plainToInstance(UpdateApplicationDto, { status: 'inactive' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts a partial payload with only name', async () => {
    const dto = plainToInstance(UpdateApplicationDto, { name: 'Renamed App' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('still rejects an invalid status value when provided', async () => {
    const dto = plainToInstance(UpdateApplicationDto, { status: 'not-a-real-status' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });
});
