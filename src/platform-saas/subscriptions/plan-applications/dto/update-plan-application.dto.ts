//src/subscriptions/plan-applications/dto/update-plan-applications.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreatePlanApplicationDto } from './create-plan-application.dto';

export class UpdatePlanApplicationDto extends PartialType(
  CreatePlanApplicationDto,
) {}
