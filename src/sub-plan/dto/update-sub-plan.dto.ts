import { PartialType } from '@nestjs/swagger';
import { CreateSubPlanDto } from './create-sub-plan.dto';

export class UpdateSubPlanDto extends PartialType(CreateSubPlanDto) {}
