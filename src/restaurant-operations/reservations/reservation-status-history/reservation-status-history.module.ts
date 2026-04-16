import { Module } from '@nestjs/common';
import { ReservationStatusHistoryService } from './reservation-status-history.service';
import { ReservationStatusHistoryController } from './reservation-status-history.controller';

@Module({
  controllers: [ReservationStatusHistoryController],
  providers: [ReservationStatusHistoryService],
})
export class ReservationStatusHistoryModule {}
