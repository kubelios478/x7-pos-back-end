// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Core & Platform Modules
import { AuthModule } from './auth/auth.module';
import { CoreModule } from './core/core.module';
import { PlatformSaasModule } from './platform-saas/platform-saas.module';
import { MailModule } from './mail/mail.module';
import { RealtimeModule } from './realtime/realtime.module';
import { OnboardingModule } from './onboarding/onboarding.module';

// Business & Operations Modules
import { CommerceModule } from './commerce/commerce.module';
import { GrowthModule } from './growth/growth.module';
import { FinanceHrModule } from './finance-hr/finance-hr.module';
import { InventoryModule } from './inventory/inventory.module';
import { RestaurantOperationsModule } from './restaurant-operations/restaurant-operations.module';

import { KitchenAnalyticsModule } from './restaurant-operations/kitchen-display-system/kitchen-analytics/kitchen-analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get('NODE_ENV') === 'development';
        return {
          type: 'postgres',
          host: config.get('DB_HOST'),
          port: parseInt(config.get('DB_PORT', '5432')),
          username: config.get('DB_USERNAME'),
          password: config.get('DB_PASSWORD'),
          database: config.get('DB_NAME'),

          // Only print SQL queries in development
          logging: isDev,

          // Automatic loading of all entities declared in each submodule (forFeature)
          autoLoadEntities: true,

          synchronize: false,
          ssl: {
            rejectUnauthorized: false,
          },
          extra: {
            ssl: {
              rejectUnauthorized: false,
            },
            max: 5,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 10000,
            prepare: false,
            statement_timeout: 10000,
          },
        };
      },
    }),
    // AccountPayableModule,
    AuthModule,
    OnboardingModule,
    CoreModule,
    InventoryModule,
    MailModule,
    RestaurantOperationsModule,
    PlatformSaasModule,
    CommerceModule,
    GrowthModule,
    FinanceHrModule,
    RealtimeModule,
    KitchenAnalyticsModule,
  ],
})
export class AppModule {}
