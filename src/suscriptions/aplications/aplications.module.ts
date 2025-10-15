import { Module } from '@nestjs/common';
import { AplicationsController } from './aplications.controller';
import { AplicationsService } from './aplications.service';
import { AplicationEntity } from './entity/aplication-entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([AplicationEntity])],
  controllers: [AplicationsController],
  providers: [AplicationsService],
  exports: [AplicationsService],
})
export class AplicationsModule {}
