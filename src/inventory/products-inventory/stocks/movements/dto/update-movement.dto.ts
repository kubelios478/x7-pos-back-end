import { PickType } from '@nestjs/swagger';
import { CreateMovementDto } from './create-movement.dto';

/**
 * Only the descriptive fields can change: quantity, type and stock item are part of the
 * kardex. A wrong movement is reversed (DELETE) or corrected with a new adjustment.
 */
export class UpdateMovementDto extends PickType(CreateMovementDto, [
  'reference',
  'reason',
] as const) {}
