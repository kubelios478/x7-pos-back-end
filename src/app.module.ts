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
import { TablesModule } from './tables/tables.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PlanApplicationsModule } from './subscriptions/plan-applications/plan-applications.module';
import { MerchantSubscriptionModule } from './subscriptions/merchant-subscriptions/merchant-subscription.module';
import { ApplicationsModule } from './subscriptions/applications/applications.module';
import { SubscriptionApplicationModule } from './subscriptions/subscription-application/subscription-application.module';
import { FeaturesModule } from './subscriptions/features/features.module';
import { CollaboratorsModule } from './collaborators/collaborators.module';
import { ShiftAssignmentsModule } from './shift-assignments/shift-assignments.module';
import { TableAssignmentsModule } from './table-assignments/table-assignments.module';
import { ProductsInventoryModule } from './products-inventory/products-inventory.module';

// Entities;
import { User } from './users/entities/user.entity';
import { Company } from './companies/entities/company.entity';
import { Merchant } from './merchants/entities/merchant.entity';
import { Customer } from './customers/entities/customer.entity';
import { Category } from './products-inventory/category/entities/category.entity';
import { Table } from './tables/entities/table.entity';
import { Collaborator } from './collaborators/entities/collaborator.entity';

import { Shift } from './shifts/entities/shift.entity';
import { ShiftsModule } from './shifts/shifts.module';
import { Product } from './products-inventory/products/entities/product.entity';
import { Supplier } from './products-inventory/suppliers/entities/supplier.entity';
import { ShiftAssignment } from './shift-assignments/entities/shift-assignment.entity';
import { TableAssignment } from './table-assignments/entities/table-assignment.entity';
import { Variant } from './products-inventory/variants/entities/variant.entity';
import { Modifier } from './products-inventory/modifiers/entities/modifier.entity';
import { SubscriptionPlan } from './subscriptions/subscription-plan/entity/subscription-plan.entity';
import { MerchantSubscription } from './subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { ApplicationEntity } from './subscriptions/applications/entity/application-entity';
import { PlanApplication } from './subscriptions/plan-applications/entity/plan-applications.entity';
import { SubscriptionApplication } from './subscriptions/subscription-application/entity/subscription-application.entity';
import { FeatureEntity } from './subscriptions/features/entity/features.entity';

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
          SubscriptionPlan,
          Category,
          Collaborator,
          Shift,
          ShiftAssignment,
          TableAssignment,
          MerchantSubscription,
          ApplicationEntity,
          PlanApplication,
          SubscriptionApplication,
          FeatureEntity,
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
    MailModule,
    CompaniesModule,
    MerchantsModule,
    UsersModule,
    CustomersModule,

    TablesModule,
    CollaboratorsModule,
    ShiftsModule,
    ShiftAssignmentsModule,
    TableAssignmentsModule,

    ProductsInventoryModule,

    SubscriptionsModule,
    MerchantSubscriptionModule,

    ApplicationsModule,
    CollaboratorsModule,
    ShiftsModule,

    PlanApplicationsModule,

    SubscriptionApplicationModule,

    FeaturesModule,
  ],
})
export class AppModule {}
