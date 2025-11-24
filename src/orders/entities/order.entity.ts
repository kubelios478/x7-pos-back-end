import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Table } from '../../tables/entities/table.entity';
import { Collaborator } from '../../collaborators/entities/collaborator.entity';
import { MerchantSubscription } from '../../subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { OrderStatus } from '../constants/order-status.enum';
import { OrderBusinessStatus } from '../constants/order-business-status.enum';
import { OrderType } from '../constants/order-type.enum';
import { CashTransaction } from '../../cash-transactions/entities/cash-transaction.entity';
import { Receipt } from '../../receipts/entities/receipt.entity';

@Entity('orders')
@Index(['merchant_id', 'business_status', 'created_at'])
export class Order {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Order' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Merchant owning the Order' })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ManyToOne(() => Merchant, (merchant) => merchant.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({ example: 1, description: 'Identifier of the Table associated with the Order' })
  @Column({ name: 'table_id' })
  table_id: number;

  @ManyToOne(() => Table, (table) => table.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @ApiProperty({ example: 1, description: 'Identifier of the Collaborator (waiter) who took the order' })
  @Column({ name: 'collaborator_id' })
  collaborator_id: number;

  @ManyToOne(() => Collaborator, (collaborator) => collaborator.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'collaborator_id' })
  collaborator: Collaborator;

  @ApiProperty({ example: 1, description: 'Identifier of the Subscription associated with the Order' })
  @Column({ name: 'subscription_id' })
  subscription_id: number;

  @ManyToOne(() => MerchantSubscription, (subscription) => subscription.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'subscription_id' })
  subscription: MerchantSubscription;

  @ApiProperty({ 
    example: OrderBusinessStatus.PENDING, 
    enum: OrderBusinessStatus,
    description: 'Business status of the Order (pending, in_progress, completed, cancelled)' 
  })
  @Column({ type: 'varchar', length: 50, name: 'business_status' })
  business_status: OrderBusinessStatus;

  @ApiProperty({ 
    example: OrderType.DINE_IN, 
    enum: OrderType,
    description: 'Type of the Order (dine_in, take_out, delivery)' 
  })
  @Column({ type: 'varchar', length: 50 })
  type: OrderType;

  @ApiProperty({ example: 1, description: 'Identifier of the Customer associated with the Order' })
  @Column({ name: 'customer_id' })
  customer_id: number;

  @ManyToOne(() => Customer, (customer) => customer.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ApiProperty({ 
    example: OrderStatus.ACTIVE, 
    enum: OrderStatus,
    description: 'Logical status for deletion (active, deleted)' 
  })
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.ACTIVE })
  status: OrderStatus;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp of the Order' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-15T10:00:00Z', required: false, description: 'Closing timestamp of the Order' })
  @Column({ type: 'timestamp', name: 'closed_at', nullable: true })
  closed_at: Date | null;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp of the Order' })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @ApiProperty({
    type: () => CashTransaction,
    isArray: true,
    required: false,
    description: 'List of cash transactions for this order',
  })
  @OneToMany(() => CashTransaction, (cashTransaction) => cashTransaction.order)
  cashTransactions: CashTransaction[];

  @ApiProperty({
    type: () => Receipt,
    isArray: true,
    required: false,
    description: 'List of receipts for this order',
  })
  @OneToMany(() => Receipt, (receipt) => receipt.order)
  receipts: Receipt[];
}

/*
Table Order {
  id BIGSERIAL [pk]
  merchant_id BIGSERIAL [ref: > Merchant.id]
  table_id BIGSERIAL [ref: > Table.id]
  collaborator_id BIGSERIAL [ref: > Collaborator.id] // mesero que tomó la orden
  subscription_id BIGSERIAL [ref: > merchants_subscriptions.id]
  business_status VARCHAR(50) // pending, in_progress, completed, cancelled
  type VARCHAR(50) // dine_in, take_out, delivery
  created_at TIMESTAMP
  closed_at TIMESTAMP
  customer_id BIGSERIAL [ref: > Customer.id]
  status OrderStatus // ACTIVE, DELETED (for logical deletion)
  Indexes {
    (merchant_id, business_status, created_at)
  }
}
*/
