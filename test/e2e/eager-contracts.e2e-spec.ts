import * as request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, E2eApp } from './app';
import { registerTenant, statusWithBody, Tenant } from './fixtures';

/**
 * Contrato de las respuestas de QR y delivery, cuyas entidades cargaban relaciones
 * eager. Se guarda la forma (claves y tipos), no los valores: ids y fechas cambian en
 * cada corrida, pero un objeto anidado que deja de venir cambia la forma.
 */
type Shape = string | Shape[] | { [key: string]: Shape };

function shapeOf(value: unknown): Shape {
  if (value === null) return 'null';
  if (Array.isArray(value)) return value.length ? [shapeOf(value[0])] : [];
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as object)
        .sort()
        .map((key) => [key, shapeOf((value as Record<string, unknown>)[key])]),
    );
  }
  return typeof value;
}

describe('QR and delivery response contracts (e2e)', () => {
  let e2e: E2eApp;
  let server: App;
  let tenant: Tenant;
  const ids: Record<string, number> = {};

  const auth = () => ({ Authorization: `Bearer ${tenant.token}` });
  // Algunas rutas responden { data: {...} } y otras la entidad sola.
  const idOf = (body: unknown) => {
    const b = body as { data?: { id: number }; id?: number };
    return (b.data?.id ?? b.id) as number;
  };
  const post = async (path: string, body: object) =>
    (
      await request(server)
        .post(`/api/${path}`)
        .set(auth())
        .send(body)
        .expect(statusWithBody(201))
    ).body as unknown;
  const call = async (
    method: 'get' | 'patch' | 'delete',
    path: string,
    body?: object,
  ) => {
    const req = request(server)[method](`/api/${path}`).set(auth());
    if (body) void req.send(body);
    return (await req.expect(statusWithBody(200))).body as unknown;
  };

  beforeAll(async () => {
    e2e = await createE2eApp();
    server = e2e.app.getHttpServer() as App;
    tenant = await registerTenant(e2e.app, e2e.planId, 'contracts');
    const merchant = tenant.merchantId;

    // Lo que el POS necesita para tener una orden, igual que en el smoke.
    await post('shifts', {
      merchantId: merchant,
      startTime: new Date().toISOString(),
      status: 'active',
    });
    ids.collaborator = idOf(
      await post('collaborators', {
        user_id: tenant.userId,
        merchant_id: merchant,
        name: 'E2E Waiter',
        role: 'waiter',
        status: 'active',
      }),
    );
    const drawer = idOf(await post('cash-drawers', { openingBalance: 0 }));
    await post('cash-shifts', { cashDrawerId: drawer, openingBalance: 0 });
    ids.customer = idOf(
      await post('customers', {
        name: 'E2E Customer',
        email: 'customer@contracts.example.com',
        address: '1 Customer Ave',
        city: 'Miami',
        state: 'Florida',
        country: 'United States',
      }),
    );
    ids.product = idOf(
      await post('products', {
        name: 'E2E Pizza',
        sku: 'E2E-PIZZA',
        basePrice: 9,
      }),
    );
    ids.variant = idOf(
      await post('variants', {
        name: 'Large',
        price: 12,
        sku: 'E2E-PIZZA-L',
        productId: ids.product,
      }),
    );
    ids.order = idOf(
      await post('orders', {
        merchantId: merchant,
        collaboratorId: ids.collaborator,
        customerId: ids.customer,
        type: 'take_out',
        items: [{ orderId: 1, productId: ids.product, quantity: 1 }],
      }),
    );
    // La asignación de delivery exige una orden de tipo delivery.
    ids.deliveryOrder = idOf(
      await post('orders', {
        merchantId: merchant,
        collaboratorId: ids.collaborator,
        customerId: ids.customer,
        type: 'delivery',
        deliveryAddress: '1 Customer Ave, Miami',
        items: [{ orderId: 1, productId: ids.product, quantity: 1 }],
      }),
    );
    ids.floorPlan = idOf(
      await post('floor-plan', {
        merchant,
        name: 'Main floor',
        width: 20,
        height: 10,
        status: 'active',
      }),
    );
    ids.floorZone = idOf(
      await post('floor-zone', {
        merchant,
        name: 'Terrace',
        color: '#00aa00',
        floorPlan: ids.floorPlan,
        status: 'active',
      }),
    );
    ids.table = idOf(
      await post('tables', {
        merchant_id: merchant,
        number: 'T1',
        capacity: 4,
        status: 'available',
        location: 'Terrace',
        rotation: 0,
        shape: 'Square',
        pos_x: 1,
        pos_y: 1,
        floorZone: ids.floorZone,
        floorPlan: ids.floorPlan,
      }),
    );
  });

  afterAll(async () => {
    await e2e?.app.close();
  });

  // Cada recurso: crear, listar, detalle y editar, en orden de dependencia.
  const resources: {
    name: string;
    path: string;
    create: () => object;
    patch: object;
    // Algunos PATCH de QR validan el cuerpo completo, como una creación.
    patchNeedsFullBody?: true;
  }[] = [
    {
      name: 'qrMenu',
      path: 'qr-menus',
      create: () => ({
        merchant: tenant.merchantId,
        name: 'Dinner',
        description: 'Dinner menu',
        status: 'active',
        design_theme: 'dark',
        qr_type: 'Table',
      }),
      patch: { name: 'Dinner menu' },
      patchNeedsFullBody: true,
    },
    {
      name: 'qrMenuSection',
      path: 'qr-menu-sections',
      create: () => ({
        qrMenu: ids.qrMenu,
        name: 'Pizzas',
        description: 'Stone oven',
        status: 'active',
        display_order: 1,
      }),
      patch: { name: 'Our pizzas' },
      patchNeedsFullBody: true,
    },
    {
      name: 'qrMenuItem',
      path: 'qr-menu-items',
      create: () => ({
        qrMenuSection: ids.qrMenuSection,
        product: ids.product,
        variant: ids.variant,
        status: 'active',
        display_order: 1,
        notes: 'Popular',
        is_visible: true,
      }),
      patch: { notes: 'Best seller' },
      patchNeedsFullBody: true,
    },
    {
      name: 'qrLocation',
      path: 'qr-locations',
      create: () => ({
        merchant: tenant.merchantId,
        qrMenu: ids.qrMenu,
        table: ids.table,
        name: 'Table 1 QR',
        qr_code_url: 'https://qr.example.com/t1',
        qr_code_image: 'https://qr.example.com/t1.png',
        location_type: 'Table',
        status: 'active',
      }),
      patch: { name: 'Table one QR' },
    },
    {
      name: 'qrOrder',
      path: 'qr-orders',
      create: () => ({
        merchant: tenant.merchantId,
        qrLocation: ids.qrLocation,
        customer: ids.customer,
        table: ids.table,
        order: ids.order,
        notes: 'No onions',
        total_amount: 9,
        qr_order_status: 'Submitted',
        status: 'active',
      }),
      patch: { notes: 'Extra napkins' },
      patchNeedsFullBody: true,
    },
    {
      name: 'qrOrderItem',
      path: 'qr-order-items',
      create: () => ({
        qrOrder: ids.qrOrder,
        product: ids.product,
        variant: ids.variant,
        quantity: 1,
        price: 12,
        // La columna es NOT NULL aunque el DTO la declara opcional (sin ella, 500).
        notes: 'Thin crust',
        status: 'active',
      }),
      patch: { notes: 'Well done' },
      patchNeedsFullBody: true,
    },
    {
      name: 'deliveryZone',
      path: 'delivery-zone',
      create: () => ({
        name: 'Downtown',
        description: 'City center',
        status: 'active',
      }),
      patch: { name: 'Downtown core' },
    },
    {
      name: 'deliveryFee',
      path: 'delivery-fee',
      create: () => ({
        deliveryZone: ids.deliveryZone,
        base_fee: 3.5,
        status: 'active',
      }),
      patch: { base_fee: 4 },
    },
    {
      name: 'deliveryDriver',
      path: 'delivery-driver',
      create: () => ({
        name: 'E2E Rider',
        phone: '+13055550100',
        vehicleType: 'motorcycle',
      }),
      patch: { name: 'E2E Rider One' },
    },
    {
      name: 'deliveryAssignment',
      path: 'delivery-assignment',
      create: () => ({
        order: ids.deliveryOrder,
        deliveryDriver: ids.deliveryDriver,
      }),
      patch: { status: 'active' },
    },
    {
      name: 'deliveryTracking',
      path: 'delivery-tracking',
      create: () => ({
        deliveryAssignment: ids.deliveryAssignment,
        latitude: 25.7617,
        longitude: -80.1918,
      }),
      patch: { latitude: 25.7618 },
    },
  ];

  it.each(resources.map((r) => [r.name, r] as const))(
    '%s keeps its response shape',
    async (_name, r) => {
      const created = await post(r.path, r.create());
      ids[r.name] = idOf(created);

      expect({
        create: shapeOf(created),
        list: shapeOf(await call('get', r.path)),
        detail: shapeOf(await call('get', `${r.path}/${ids[r.name]}`)),
        patch: shapeOf(
          await call(
            'patch',
            `${r.path}/${ids[r.name]}`,
            r.patchNeedsFullBody ? { ...r.create(), ...r.patch } : r.patch,
          ),
        ),
      }).toMatchSnapshot();
    },
  );

  it.each([...resources].reverse().map((r) => [r.name, r] as const))(
    '%s keeps its delete response shape',
    async (_name, r) => {
      expect(
        shapeOf(await call('delete', `${r.path}/${ids[r.name]}`)),
      ).toMatchSnapshot();
    },
  );
});
