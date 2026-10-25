//src/qr-code/qr-location/entity/qr-location.entity.ts
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { QRMenu } from 'src/commerce/qr-code/qr-menu/entity/qr-menu.entity';
import { QRMenuType } from 'src/commerce/qr-code/constants/qr-menu-type.enum';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';

@Entity({ name: 'qr_location' })
export class QRLocation {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the QR Location',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant related',
  })
  @ManyToOne(() => Merchant)
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the QR Menu related',
  })
  @ManyToOne(() => QRMenu)
  @JoinColumn({ name: 'qr_menu_id' })
  qrMenu: QRMenu;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Table related (if applicable)',
  })
  @ManyToOne(() => Table, { nullable: true })
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text' })
  qr_code_url: string;

  @Column({ type: 'text' })
  qr_code_image: string;

  @Column({ type: 'enum', enum: QRMenuType })
  location_type: QRMenuType;

  @ApiProperty({
    example: 'active',
    description: 'Status of the QR MENU',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;
}
