import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { SuscriptionPlan } from '../../suscription-plan/entity/suscription-plan.entity';

@Entity({ name: 'merchant_suscription' })
export class MerchantSuscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Merchant, { eager: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ManyToOne(() => SuscriptionPlan, { eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan: SuscriptionPlan;

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
