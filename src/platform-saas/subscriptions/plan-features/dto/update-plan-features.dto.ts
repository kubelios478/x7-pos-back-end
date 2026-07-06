// src/subscriptions/plan-features/dto/update-plan-features.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreatePlanFeatureDto } from './create-plan-feature.dto';

export class UpdatePlanFeatureDto extends PartialType(CreatePlanFeatureDto) {}
