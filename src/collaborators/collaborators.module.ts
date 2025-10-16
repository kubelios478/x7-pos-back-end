import { Module } from '@nestjs/common';
import { CollaboratorsService } from './collaborators.service';
import { CollaboratorsController } from './collaborators.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collaborator } from './entities/collaborator.entity';
import { User } from '../users/entities/user.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { IsUniqueField } from 'src/validators/is-unique-field.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([Collaborator, User, Merchant])
  ],
  controllers: [CollaboratorsController],
  providers: [CollaboratorsService, IsUniqueField],
  exports: [IsUniqueField]
})
export class CollaboratorsModule { }

