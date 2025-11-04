import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Item } from 'src/products-inventory/stocks/items/entities/item.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('movement')
export class Movement {
  @ApiProperty({ example: 1, description: 'Movement ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Stock Item ID associated with the movement',
  })
  @Column('int')
  stockItemId: number;

  @ManyToOne(() => Item, (item) => item.movements)
  @JoinColumn({ name: 'stockItemId' })
  item: Item;

  @ApiProperty({ example: 10, description: 'Quantity of the movement' })
  @Column('int')
  quantity: number;

  @ApiProperty({
    example: 'entry',
    description: 'Type of movement (entry/exit)',
  })
  @Column('varchar')
  type: string;

  @ApiProperty({
    example: 'REF-001',
    description: 'Movement reference (optional)',
    nullable: true,
  })
  @Column('varchar', { nullable: true })
  reference: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({
    example: '2023-01-01T12:00:00Z',
    description: 'Movement creation date',
  })
  @CreateDateColumn()
  createdAt: Date;
}
