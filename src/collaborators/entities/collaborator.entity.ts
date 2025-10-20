import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    Index,
    JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ShiftRole } from '../constants/shift-role.enum';
import { CollaboratorStatus } from '../constants/collaborator-status.enum';

@Entity("collaborator")
@Index(["user_id"], { unique: true })
export class Collaborator {
    @ApiProperty({ example: 1, description: 'Unique identifier of the Collaborator' })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ example: 1, description: 'Identifier of the User associated with the Collaborator' })
    @Column({ name: 'user_id' })
    user_id: number;

    @ManyToOne(() => User, (user) => user.collaborators, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ApiProperty({ example: 1, description: 'Identifier of the Merchant owning the Collaborator' })
    @Column({ name: 'merchant_id' })
    merchant_id: number;

    @ManyToOne(() => Merchant, (merchant) => merchant.collaborators, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'merchant_id' })
    merchant: Merchant;

    @ApiProperty({ example: 'Juan Pérez', description: 'Name of the Collaborator (can be different from User name for customization)' })
    @Column({ type: 'varchar', length: 150 })
    name: string;

    @ApiProperty({ 
        example: ShiftRole.WAITER, 
        enum: ShiftRole,
        description: 'Role of the Collaborator (mesero, cajero, cocinero, etc.)' 
    })
    @Column({ type: 'enum', enum: ShiftRole })
    role: ShiftRole;

    @ApiProperty({ 
        example: CollaboratorStatus.ACTIVO, 
        enum: CollaboratorStatus,
        description: 'Current status of the Collaborator' 
    })
    @Column({ type: 'enum', enum: CollaboratorStatus })
    status: CollaboratorStatus;

    @ApiProperty({ example: '2023-10-01T12:00:00Z', description: 'Creation timestamp of the Collaborator record' })
    @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
    created_at: Date;

    @ApiProperty({ example: '2023-10-01T12:00:00Z', description: 'Last update timestamp of the Collaborator record' })
    @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
    updated_at: Date;
}

/*
Table Collaborator {
  id BIGSERIAL [pk]
  user_id BIGINT [ref: > User.id]          // referencia al usuario del sistema
  merchant_id BIGINT [ref: > Merchant.id]
  name VARCHAR(150)                        // puede duplicarse del User para personalización
  role ShiftRole                            // mesero, cajero, cocinero, etc.
  status VARCHAR(50)
  created_at TIMESTAMP
  updated_at TIMESTAMP
  Indexes {
        (user_id)[unique]
    }
}
*/

