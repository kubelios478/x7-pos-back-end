import { PartialType } from '@nestjs/swagger';
import { CreateSuscriptionPlanDto } from './create-suscription-plan.dto';

export class UpdateSuscriptionPlanDto extends PartialType(
  CreateSuscriptionPlanDto,
) {}
