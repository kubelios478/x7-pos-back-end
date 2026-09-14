import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { CollaboratorsService } from './collaborators.service';
import { CollaboratorsController } from './collaborators.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collaborator } from './entities/collaborator.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { IsUniqueField } from 'src/validators/is-unique-field.validator';
import { Shift } from 'src/restaurant-operations/shift/shifts/entities/shift.entity';
import { ShiftAssignment } from 'src/restaurant-operations/shift/shift-assignments/entities/shift-assignment.entity';
import { TableAssignment } from 'src/restaurant-operations/dining-system/table-assignments/entities/table-assignment.entity';
import { CashDrawer } from 'src/restaurant-operations/cashdrawer/cash-drawers/entities/cash-drawer.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';

@Module({
  imports: [
    AuthModule,
    // Shift is used to assign the employee to their recurring shift; the other four are registered in READ ONLY for the operational summary of the detailed log. Each remains the property of its module, which is responsible for creating them.
    TypeOrmModule.forFeature([
      Collaborator,
      User,
      Merchant,
      Shift,
      ShiftAssignment,
      TableAssignment,
      CashDrawer,
      Order,
    ]),
  ],
  controllers: [CollaboratorsController],
  providers: [CollaboratorsService, IsUniqueField],
  exports: [IsUniqueField],
})
export class CollaboratorsModule {}
