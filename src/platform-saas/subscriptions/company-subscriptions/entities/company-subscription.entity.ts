import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { SubscriptionPlan } from '../../subscription-plan/entity/subscription-plan.entity';

@Entity({ name: 'company_subscription' })
export class CompanySubscription {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the subscription',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Company identifier' })
  @Column({ name: 'company_id', type: 'int' })
  company_id: number;

  @ManyToOne(() => Company, { eager: true })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => SubscriptionPlan, { eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  @Column({ type: 'date', nullable: true })
  renewalDate?: Date;

  @Column({ length: 50 })
  status: string;

  @Column({ name: 'payment_method', length: 50 })
  paymentMethod: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
