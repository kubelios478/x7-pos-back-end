//src/configuration/entity/configuration-entity.ts
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'configuration' })
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class Configuration {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Company, (company) => company.configurations)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date of the configuration creation',
  })
  @Column({ type: 'date' })
  createdAt: Date;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date of the configuration update',
  })
  @Column({ type: 'date' })
  updatedAt: Date;

  @ApiProperty({
    example: 'Created by user',
    description: 'User who created the configuration',
  })
  @Column({ type: 'varchar', length: 100 })
  createdBy: string;

  @ApiProperty({
    example: 'Updated by user',
    description: 'User who updated the configuration',
  })
  @Column({ type: 'varchar', length: 100 })
  updatedBy: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the configuration',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;
}
