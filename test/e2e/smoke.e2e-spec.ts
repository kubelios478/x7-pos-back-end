import * as request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, E2eApp } from './app';
import { registerTenant, statusWithBody, Tenant } from './fixtures';

describe('Smoke (e2e)', () => {
  let e2e: E2eApp;
  let server: App;
  let tenantA: Tenant;
  let tenantB: Tenant;

  beforeAll(async () => {
    e2e = await createE2eApp();
    server = e2e.app.getHttpServer() as App;
    tenantA = await registerTenant(e2e.app, e2e.planId, 'tenant-a');
    tenantB = await registerTenant(e2e.app, e2e.planId, 'tenant-b');
  });

  afterAll(async () => {
    await e2e?.app.close();
  });

  const as = (tenant: Tenant) => ({ Authorization: `Bearer ${tenant.token}` });

  it('GET /api/health answers ok with the database up', async () => {
    const res = await request(server)
      .get('/api/health')
      .expect(statusWithBody(200));
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });

  it('login rejects a wrong password with 401', async () => {
    await request(server)
      .post('/api/auth/login')
      .send({ email: 'admin@tenant-a.example.com', password: 'wrong-pass' })
      .expect(401);
  });

  it('protected routes answer 401 without a token', async () => {
    await request(server).get('/api/orders').expect(401);
  });

  describe('order flow', () => {
    let orderId: number;
    let collaboratorId: number;
    const price = 12.5;

    beforeAll(async () => {
      const collaborator = await request(server)
        .post('/api/collaborators')
        .set(as(tenantA))
        .send({
          user_id: tenantA.userId,
          merchant_id: tenantA.merchantId,
          name: 'E2E Waiter',
          role: 'waiter',
          status: 'active',
        })
        .expect(statusWithBody(201));
      collaboratorId = (collaborator.body as { data: { id: number } }).data.id;

      // Crear pedidos y cobrarlos exige un turno de caja abierto por el colaborador, y
      // abrir un cajón, un turno de trabajo activo en el comercio.
      await request(server)
        .post('/api/shifts')
        .set(as(tenantA))
        .send({
          merchantId: tenantA.merchantId,
          startTime: new Date().toISOString(),
          status: 'active',
        })
        .expect(statusWithBody(201));
      const drawer = await request(server)
        .post('/api/cash-drawers')
        .set(as(tenantA))
        .send({ openingBalance: 0 })
        .expect(statusWithBody(201));
      await request(server)
        .post('/api/cash-shifts')
        .set(as(tenantA))
        .send({
          cashDrawerId: (drawer.body as { data: { id: number } }).data.id,
          openingBalance: 0,
        })
        .expect(statusWithBody(201));

      const customer = await request(server)
        .post('/api/customers')
        .set(as(tenantA))
        .send({
          name: 'E2E Customer',
          email: 'customer@tenant-a.example.com',
          address: '1 Customer Ave',
          city: 'Miami',
          state: 'Florida',
          country: 'United States',
        })
        .expect(statusWithBody(201));
      const customerId =
        (customer.body as { data?: { id: number }; id?: number }).data?.id ??
        (customer.body as { id: number }).id;

      const product = await request(server)
        .post('/api/products')
        .set(as(tenantA))
        .send({ name: 'E2E Burger', sku: 'E2E-BURGER', basePrice: price })
        .expect(statusWithBody(201));
      const productId = (product.body as { data: { id: number } }).data.id;

      const order = await request(server)
        .post('/api/orders')
        .set(as(tenantA))
        .send({
          merchantId: tenantA.merchantId,
          collaboratorId,
          customerId,
          type: 'take_out',
          items: [{ orderId: 1, productId, quantity: 2 }],
        })
        .expect(statusWithBody(201));
      orderId = (order.body as { data: { id: number } }).data.id;
    });

    it('another merchant cannot read the order', async () => {
      const res = await request(server)
        .get(`/api/orders/${orderId}`)
        .set(as(tenantB));
      expect([403, 404]).toContain(res.status);
    });

    it('a full card payment leaves the order paid', async () => {
      await request(server)
        .post('/api/order-payments')
        .set(as(tenantA))
        .send({ orderId, collaboratorId, amount: price * 2, method: 'card' })
        .expect(statusWithBody(201));

      const res = await request(server)
        .get(`/api/orders/${orderId}`)
        .set(as(tenantA))
        .expect(statusWithBody(200));
      expect(res.body.data).toMatchObject({ businessStatus: 'paid' });
    });
  });
});
