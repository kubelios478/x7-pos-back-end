import { Module } from '@nestjs/common';
import { ShiftModule } from './shift/shift.module';
import { TipsModule } from './tips/tips.module';
import { CashdrawerModule } from './cashdrawer/cashdrawer.module';
import { KitchenDisplaySystemModule } from './kitchen-display-system/kitchen-display-system.module';
import { DiningSystemModule } from './dining-system/dining-system.module';
import { ReservationsModule } from './reservations/reservations.module';

@Module({
  imports: [
    ShiftModule,
    TipsModule,
    CashdrawerModule,
    KitchenDisplaySystemModule,
    DiningSystemModule,
    ReservationsModule,
  ],
  controllers: [],
  providers: [],
  exports: [
    ShiftModule,
    TipsModule,
    CashdrawerModule,
    KitchenDisplaySystemModule,
    DiningSystemModule,
  ],
})
export class RestaurantOperationsModule { }
