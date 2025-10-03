import { ApiProperty } from '@nestjs/swagger';
import { SubPlan } from '../entity/sub-plan.entity';

export class SubPlanResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Basic Plan' })
  name: string;

  @ApiProperty({ example: 'Acceso limitado a funcionalidades' })
  description: string;

  @ApiProperty({ example: 9.99 })
  price: number;

  @ApiProperty({ example: 'monthly' })
  billingCycle: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: '2025-10-01T20:10:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-10-01T20:15:00.000Z' })
  updatedAt: Date;

  constructor(entity: SubPlan) {
    this.id = entity.id;
    this.name = entity.name;
    this.description = entity.description;
    this.price = Number(entity.price);
    this.billingCycle = entity.billingCycle;
    this.status = entity.status;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}
