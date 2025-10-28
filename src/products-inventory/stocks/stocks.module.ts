import { Module } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { LocationsModule } from './locations/locations.module';
import { ItemsModule } from './items/items.module';
import { MovementsModule } from './movements/movements.module';

@Module({
  providers: [StocksService],
  imports: [LocationsModule, ItemsModule, MovementsModule]
})
export class StocksModule {}
