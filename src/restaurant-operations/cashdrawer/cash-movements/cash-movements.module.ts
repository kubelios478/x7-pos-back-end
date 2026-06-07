import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashMovement } from './entities/cash-movement.entity';
import { CashMovementsService } from './cash-movements.service';
import { CashMovementsController } from './cash-movements.controller';
import { CashShiftsModule } from '../cash-shifts/cash-shifts.module';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { User } from '../../../platform-saas/users/entities/user.entity';
import { MailModule } from '../../../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CashMovement, CashDrawer, User]),
    forwardRef(() => CashShiftsModule),
    MailModule,
  ],
  controllers: [CashMovementsController],
  providers: [CashMovementsService],
  exports: [CashMovementsService],
})
export class CashMovementsModule { }
