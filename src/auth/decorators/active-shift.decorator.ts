// src/auth/decorators/active-shift.decorator.ts
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ActiveShiftGuard } from '../guards/active-shift.guard';

export const REQUIRE_ACTIVE_SHIFT_KEY = 'requireActiveShift';

/**
 * Decorator that activates the ActiveShiftGuard on the endpoint.
 *
 * This guard will check the DB to see if the authenticated user's merchant
 * has a cash shift with status = 'OPEN'. If so, it injects
 * the `activeShiftId` into `req.user` so that the service can use it
 * without the frontend needing to send it.
 *
 * If there is no active shift, it returns 412 Precondition Failed.
 *
 * @example
 * @RequireActiveShift()
 * @Post('pay')
 * async processPayment(@Body() dto: PaymentDto, @AuthUser() user: AuthenticatedUser) {
 *   // user.activeShiftId is already available here
 * }
 */
export const RequireActiveShift = () =>
    applyDecorators(
        SetMetadata(REQUIRE_ACTIVE_SHIFT_KEY, true),
        UseGuards(ActiveShiftGuard),
    );
