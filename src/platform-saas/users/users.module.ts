// src/platform-saas/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Company } from '../companies/entities/company.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { HttpModule } from '@nestjs/axios';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [
    HttpModule,
    MailModule,
    TypeOrmModule.forFeature([User, Company, Merchant]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

export { UsersService };
