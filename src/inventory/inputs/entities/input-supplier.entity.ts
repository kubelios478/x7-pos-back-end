import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Input } from './input.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';

@Entity('input_suppliers')
@Index(['input', 'supplier'], { unique: true })
export class InputSupplier {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Input, (input) => input.suppliers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'input_id' })
  input: Input;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @CreateDateColumn()
  created_at: Date;
}
