// src/companies/entities/company.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { MerchantSummaryDto } from '../../merchants/dtos/merchant-summary.dto';
import { ApiProperty } from '@nestjs/swagger';
import { CustomerSummaryDto } from 'src/customers/dtos/customer-summary.dto';
import { Customer } from 'src/customers/entities/customer.entity';

@Entity()
export class Company {
  @ApiProperty({ example: 1, description: 'Unique identifier of the company' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Acme Corp', description: 'Name of the company' })
  @Column()
  name: string;

  @ApiProperty({
    example: 'contact@acme.com',
    description: 'Contact email of the company',
  })
  @Column({ nullable: true })
  email: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Phone number of the company',
  })
  @Column({ nullable: true })
  phone?: string;

  @ApiProperty({
    example: '1234567890',
    description: 'RUT of the company',
  })
  @Column({ nullable: true })
  rut: string;

  @ApiProperty({
    example: '123 Main St',
    description: 'Address of the company',
  })
  @Column({ nullable: true })
  address: string;

  @ApiProperty({
    example: 'Miami',
    description: 'City of the company',
  })
  @Column({ nullable: true })
  city: string;

  @ApiProperty({
    example: 'California',
    description: 'State of the company',
  })
  @Column({ nullable: true })
  state: string;

  @ApiProperty({
    example: 'USA',
    description: 'Country of the company',
  })
  @Column({ nullable: true })
  country: string;

  @ApiProperty({
    type: () => MerchantSummaryDto,
    isArray: true,
    description:
      'List of merchants (id and merchantId) associated with the company',
    required: false,
  })
  @OneToMany(() => Merchant, (merchant) => merchant.company)
  merchants: Merchant[];

  @ApiProperty({
    type: () => CustomerSummaryDto,
    isArray: true,
    description:
      'List of customers (id and customerId) associated with the company',
    required: false,
  })
  @OneToMany(() => Customer, (customer) => customer.company)
  customers: Customer[];
}
