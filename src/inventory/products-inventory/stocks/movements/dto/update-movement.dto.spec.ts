import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { UpdateMovementDto } from './update-movement.dto';

describe('UpdateMovementDto', () => {
  // same options as the global pipe in main.ts
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: UpdateMovementDto,
  };

  it('accepts the descriptive fields', async () => {
    await expect(
      pipe.transform({ reference: 'INV-77', reason: 'Typo' }, metadata),
    ).resolves.toEqual({ reference: 'INV-77', reason: 'Typo' });
  });

  it.each([{ quantity: 20 }, { type: 'OUT' }, { stockItemId: 3 }])(
    'rejects changing the kardex itself (%o)',
    async (body) => {
      await expect(pipe.transform(body, metadata)).rejects.toThrow();
    },
  );
});
