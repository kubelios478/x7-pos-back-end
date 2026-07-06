import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { InputUnit } from '../constants/input-unit.enum';
import { InputSupplier } from './input-supplier.entity';

@Entity('inputs')
@Index(['company_id', 'code'], { unique: true })
export class Input {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Company identifier' })
  @Column({ type: 'int' })
  company_id: number;

  @ManyToOne(() => Company, { eager: false })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ApiProperty({
    example: 'TOMATO_PASTE',
    description: 'Unique input code within the company',
  })
  @Column({ type: 'varchar', length: 80 })
  code: string;

  @ApiProperty({ example: 'Tomato paste', description: 'Input name' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ enum: InputUnit, example: InputUnit.GRAM })
  @Column({ type: 'enum', enum: InputUnit })
  unit: InputUnit;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @ApiProperty({ example: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => InputSupplier, (is) => is.input, { cascade: false })
  suppliers: InputSupplier[];
}
