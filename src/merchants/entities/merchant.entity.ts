// src/companies/entities/Merchant.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { CustomerSummaryDto } from '../../customers/dtos/customer-summary.dto';
import { ApiProperty } from '@nestjs/swagger';
import { UserSummaryDto } from 'src/users/dtos/user-summary.dto';
import { Category } from 'src/products-inventory/category/entities/category.entity';
import { Table } from 'src/tables/entities/table.entity';
import { Collaborator } from 'src/collaborators/entities/collaborator.entity';

@Entity()
export class Merchant {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Merchant' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Acme Corp', description: 'Name of the Merchant' })
  @Column({ unique: true })
  name: string;

  @ApiProperty({
    example: 'contact@acme.com',
    description: 'Contact email of the Merchant',
  })
  @Column({ nullable: true })
  email: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Phone number of the customer',
  })
  @Column({ nullable: true })
  phone?: string;

  @ApiProperty({
    example: '1234567890',
    description: 'RUT of the customer',
  })
  @Column({ nullable: true })
  rut: string;

  @ApiProperty({
    example: '123 Main St',
    description: 'Address of the Merchant',
  })
  @Column({ nullable: true })
  address: string;

  @ApiProperty({
    example: 'Miami',
    description: 'City of the Merchant',
  })
  @Column({ nullable: true })
  city: string;

  @ApiProperty({
    example: 'California',
    description: 'State of the Merchant',
  })
  @Column({ nullable: true })
  state: string;

  @ApiProperty({
    example: 'USA',
    description: 'Country of the Merchant',
  })
  @Column({ nullable: true })
  country: string;

  @ApiProperty({
    example: 1234567890,
    description: 'company ID associated with the Merchant ',
  })
  @Column()
  companyId: number;

  @ApiProperty({
    type: () => Company,
    example: 1234567890,
    description: 'Company associated with the merchant',
  })
  @ManyToOne(() => Company, (company) => company, {
    nullable: true,
  })
  company?: Company;

  @ApiProperty({
    type: () => UserSummaryDto,
    isArray: true,
    description:
      'List of users (id and merchantId) associated with the merchant',
  })
  @OneToMany(() => User, (user) => user.merchant)
  users: UserSummaryDto[];

  @ApiProperty({
    type: () => CustomerSummaryDto,
    isArray: true,
    description:
      'List of customers (id and merchantId) associated with the merchant',
    required: false,
  })
  @OneToMany(() => Customer, (customer) => customer.merchant)
  customers: CustomerSummaryDto[];

  @ApiProperty({
    type: () => Category,
    isArray: true,
    required: false,
    description: 'List of categories associated with the merchant',
  })
  @OneToMany(() => Category, (category) => category.merchant)
  categories: Category[];
  @OneToMany(() => Table, (table) => table.merchant)
  tables: Table[];

  @OneToMany(() => Collaborator, (collaborator) => collaborator.merchant)
  collaborators: Collaborator[];
}
