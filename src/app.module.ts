// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Modules
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { MerchantsModule } from './merchants/merchants.module';
import { CustomersModule } from './customers/customers.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { ProductsInventoryModule } from './products-inventory/products-inventory.module';
import { TablesModule } from './tables/tables.module';
import { SubPlanModule } from './sub-plan/sub-plan.module';
import { CollaboratorsModule } from './collaborators/collaborators.module';

// Entities;
import { User } from './users/entities/user.entity';
import { Company } from './companies/entities/company.entity';
import { Merchant } from './merchants/entities/merchant.entity';
import { Customer } from './customers/entities/customer.entity';
import { Category } from './products-inventory/category/entities/category.entity';
import { Table } from './tables/entities/table.entity';
import { Collaborator } from './collaborators/entities/collaborator.entity';
import { SubPlan } from './sub-plan/entity/sub-plan.entity';
import { Shift } from './shifts/entities/shift.entity';
import { ShiftsModule } from './shifts/shifts.module';
import { MerchSubModule } from './merch-sub/merch-sub.module';
import { MerchSub } from './merch-sub/entities/merch-sub.entity';
import { Product } from './products-inventory/products/entities/product.entity';
import { Supplier } from './products-inventory/suppliers/entities/supplier.entity';
import { Variant } from './products-inventory/variants/entities/variant.entity';
import { Modifier } from './products-inventory/modifiers/entities/modifier.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: parseInt(config.get('DB_PORT', '5432')),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),

        entities: [
          User,
          Company,
          Merchant,
          Customer,
          Table,
          SubPlan,
          Category,
          MerchSub,
          Product,
          Supplier,
          Variant,
          Modifier,
          Collaborator,
          Shift,
        ],
        synchronize: true,
      }),
    }),
    // Modules
    AuthModule,
    CompaniesModule,
    MerchantsModule,
    UsersModule,
    CustomersModule,
    TablesModule,
    MailModule,
    ProductsInventoryModule,
    CollaboratorsModule,
    SubPlanModule,
    ShiftsModule,
    MerchSubModule,
  ],
})
export class AppModule {}
