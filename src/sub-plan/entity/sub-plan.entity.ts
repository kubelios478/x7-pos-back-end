//src/sub-plan/entity/sub-plan.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sub_plan')
export class SubPlan {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the subscription plan',
  })
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 'Basic Plan',
    description: 'Name of the subscription plan',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: 'Includes basic features and limited support',
    description: 'Description of the subscription plan',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    example: 19.99,
    description: 'Price of the subscription plan',
  })
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: number;

  @ApiProperty({
    example: 'monthly',
    description: 'Billing cycle of the subscription plan',
  })
  @Column({ type: 'varchar', length: 50 })
  billingCycle: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the subscription plan',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;
}
