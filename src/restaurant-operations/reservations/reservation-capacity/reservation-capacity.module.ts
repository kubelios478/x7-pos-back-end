import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationSettings } from './entities/reservation-settings.entity';
import { Reservation } from '../reservation/entities/reservation.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { ReservationCapacityService } from './reservation-capacity.service';
import { ReservationCapacityController } from './reservation-capacity.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReservationSettings, Reservation, Table, User])],
  controllers: [ReservationCapacityController],
  providers: [ReservationCapacityService],
  exports: [ReservationCapacityService],
})
export class ReservationCapacityModule {}
