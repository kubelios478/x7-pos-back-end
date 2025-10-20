// src/suscriptions/aplications/entity/aplication-entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('aplication')
export class AplicationEntity {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the application',
  })
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 'My Application',
    description: 'Name of the application',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: 'This is a sample application',
    description: 'Description of the application',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    example: 'Utility',
    description: 'Category of the application',
  })
  @Column({ type: 'varchar', length: 50 })
  category: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the application',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;
}
