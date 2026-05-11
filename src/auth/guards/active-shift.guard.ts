import {
    CanActivate,
    ExecutionContext,
    Injectable,
    PreconditionFailedException,
    UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Request } from 'express';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { CashShift } from '../../restaurant-operations/cashdrawer/cash-shifts/entities/cash-shift.entity';
import { CashShiftStatus } from '../../restaurant-operations/cashdrawer/cash-shifts/constants/cash-shift-status.enum';

/**
 * TAC 2: Guard that intercepts the request, verifies in the DB if the merchantId
 * of the AuthenticatedUser has a record in cash_shifts with status = 'OPEN'
 * and, if it exists, injects the activeShiftId into req.user.
 *
 * - No authenticated user -> 401 Unauthorized.
 * - No open cash shift -> 412 Precondition Failed.
 * - With active shift -> continues and injects activeShiftId.
 */
@Injectable()
export class ActiveShiftGuard implements CanActivate {
    constructor(private readonly dataSource: DataSource) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const user = request.user as AuthenticatedUser;

        if (!user?.merchant?.id) {
            throw new UnauthorizedException(
                'User must be authenticated and belong to a merchant',
            );
        }

        const activeShift = await this.dataSource
            .getRepository(CashShift)
            .findOne({
                where: {
                    merchantId: user.merchant.id,
                    status: CashShiftStatus.OPEN,
                },
                select: ['id'],
            });

        if (!activeShift) {
            throw new PreconditionFailedException(
                'No active cash shift found for this merchant. Open a cash shift before performing operations.',
            );
        }

        // Inject the activeShiftId into req.user so the service can use it
        // without the frontend having to send it
        (user as AuthenticatedUser).activeShiftId = activeShift.id;

        return true;
    }
}
