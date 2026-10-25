import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { QrMenuController } from './qr-menu/qr-menu.controller';
import { QrMenuSectionController } from './qr-menu-section/qr-menu-section.controller';
import { QRMenuItemController } from './qr-menu-item/qr-menu-item.controller';
import { QRLocationController } from './qr-location/qr-location.controller';
import { QROrderController } from './qr-order/qr-order.controller';
import { QROrderItemController } from './qr-order-item/qr-order-item.controller';

// Estos controladores declaran los guards método por método, sin guard de clase. A
// GET /qr-menu-sections le faltaba: la ruta no exigía token ni aplicaba @Roles ni el plan.
const CONTROLLERS = [
  QrMenuController,
  QrMenuSectionController,
  QRMenuItemController,
  QRLocationController,
  QROrderController,
  QROrderItemController,
];

const ROUTE_METHODS = ['create', 'findAll', 'findOne', 'update', 'remove'];

describe('QR controllers guards', () => {
  const cases = CONTROLLERS.flatMap((controller) =>
    ROUTE_METHODS.map(
      (method) => [controller.name, method, controller] as const,
    ),
  );

  it.each(cases)(
    '%s.%s requires JWT, roles and the plan feature',
    (_n, method, controller) => {
      const handler = (
        controller.prototype as unknown as Record<string, unknown>
      )[method];
      expect(handler).toBeInstanceOf(Function);
      const guards = [
        ...((Reflect.getMetadata(GUARDS_METADATA, controller) as unknown[]) ??
          []),
        ...((Reflect.getMetadata(
          GUARDS_METADATA,
          handler as object,
        ) as unknown[]) ?? []),
      ];
      expect(guards).toEqual(
        expect.arrayContaining([JwtAuthGuard, RolesGuard, FeatureAccessGuard]),
      );
    },
  );
});
