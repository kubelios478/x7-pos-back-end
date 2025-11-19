/// src/subscriptions/features/entity/features.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('feature')
export class FeatureEntity {
  @ApiProperty({
    example: 'feature_123',
    description: 'The unique identifier of the feature',
  })
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 'Advanced Analytics',
    description: 'The name of the feature',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: 'Provides advanced data analytics capabilities',
    description: 'A brief description of the feature',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    example: 'unit',
    description: 'The billing unit for the feature (e.g., unit, user, gb)',
  })
  @Column({ type: 'varchar', length: 50 })
  Unit: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the subscription plan',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;
}
