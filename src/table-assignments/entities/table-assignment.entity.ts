import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Shift } from '../../shifts/entities/shift.entity';
import { Table } from '../../tables/entities/table.entity';
import { Collaborator } from '../../collaborators/entities/collaborator.entity';

@Entity('table_assignments')
export class TableAssignment {
  @ApiProperty({ example: 1, description: 'Unique identifier of the table assignment' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'ID of the shift this assignment belongs to' })
  @Column({ type: 'int' })
  shiftId: number;

  @ApiProperty({ example: 1, description: 'ID of the table being assigned' })
  @Column({ type: 'int' })
  tableId: number;

  @ApiProperty({ example: 1, description: 'ID of the collaborator assigned to the table' })
  @Column({ type: 'int' })
  collaboratorId: number;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Timestamp when the table was assigned' })
  @Column({ type: 'timestamp' })
  assignedAt: Date;

  @ApiProperty({ example: '2024-01-15T16:00:00Z', description: 'Timestamp when the table was released', required: false })
  @Column({ type: 'timestamp', nullable: true })
  releasedAt?: Date;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp of the table assignment record' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Last update timestamp of the table assignment record' })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Shift, { eager: true })
  @JoinColumn({ name: 'shiftId' })
  shift: Shift;

  @ManyToOne(() => Table, { eager: true })
  @JoinColumn({ name: 'tableId' })
  table: Table;

  @ManyToOne(() => Collaborator, { eager: true })
  @JoinColumn({ name: 'collaboratorId' })
  collaborator: Collaborator;
}

/*
Table TableAssignment {
  id BIGSERIAL [pk]
  shift_id BIGSERIAL [ref: > Shift.id]
  table_id BIGSERIAL [ref: > Table.id]
  collaborator_id BIGSERIAL [ref: > Collaborator.id]
  assigned_at TIMESTAMP
  released_at TIMESTAMP
}
*/