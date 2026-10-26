import * as request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, E2eApp } from './app';
import { registerTenant, statusWithBody, Tenant } from './fixtures';

const ORIGIN = 'http://frontend.e2e.test';

describe('Listings that used to return everything (e2e)', () => {
  let e2e: E2eApp;
  let server: App;
  let tenant: Tenant;

  const auth = () => ({ Authorization: `Bearer ${tenant.token}` });
  // Algunas rutas responden { data: {...} } y otras la entidad sola (customers).
  const post = async (path: string, body: object) => {
    const res = await request(server)
      .post(path)
      .set(auth())
      .send(body)
      .expect(statusWithBody(201));
    const created = res.body as { data?: { id: number }; id?: number };
    return (created.data?.id ?? created.id) as number;
  };

  beforeAll(async () => {
    e2e = await createE2eApp();
    server = e2e.app.getHttpServer() as App;
    tenant = await registerTenant(e2e.app, e2e.planId, 'listing');

    // Un cajón necesita un turno de trabajo activo; los turnos de caja, un colaborador.
    await post('/api/shifts', {
      merchantId: tenant.merchantId,
      startTime: new Date().toISOString(),
      status: 'active',
    });
    const collaboratorId = await post('/api/collaborators', {
      user_id: tenant.userId,
      merchant_id: tenant.merchantId,
      name: 'E2E Cashier',
      role: 'waiter',
      status: 'active',
    });
    const drawerId = await post('/api/cash-drawers', { openingBalance: 0 });

    // 55 turnos ya cerrados, uno por día: abrirlos y cerrarlos por la API no agrega nada.
    await e2e.dataSource.query(
      `INSERT INTO cash_shifts
         (merchant_id, cash_drawer_id, opened_by, closed_by, opening_balance,
          status, opened_at, closed_at)
       SELECT $1, $2, $3, $3, 0, 'CLOSED',
              TIMESTAMP '2026-01-01' + n * INTERVAL '1 day',
              TIMESTAMP '2026-01-01' + n * INTERVAL '1 day' + INTERVAL '8 hours'
       FROM generate_series(1, 55) AS n`,
      [tenant.merchantId, drawerId, collaboratorId],
    );

    for (const n of [1, 2, 3]) {
      await post('/api/customers', {
        name: `Customer ${n}`,
        email: `customer${n}@listing.example.com`,
        address: '1 Customer Ave',
        city: 'Miami',
        state: 'Florida',
        country: 'United States',
      });
    }
  });

  afterAll(async () => {
    await e2e?.app.close();
  });

  describe('GET /cash-shifts', () => {
    interface ShiftsPage {
      data: { id: number; openedAt: string }[];
      total: number;
      totalPages: number;
      hasNext: boolean;
    }
    const shifts = async (query = '') =>
      (
        await request(server)
          .get(`/api/cash-shifts${query}`)
          .set(auth())
          .expect(statusWithBody(200))
      ).body as ShiftsPage;

    it('returns the 50 most recent shifts by default', async () => {
      const page = await shifts();

      expect(page.data).toHaveLength(50);
      expect(page).toMatchObject({ total: 55, totalPages: 2, hasNext: true });
      const opened = page.data.map((s) => new Date(s.openedAt).getTime());
      expect(opened).toEqual([...opened].sort((a, b) => b - a));
      expect(new Date(page.data[0].openedAt).toISOString()).toContain(
        '2026-02-25',
      );
    });

    it('serves the rest on the next page', async () => {
      const page = await shifts('?page=2');
      expect(page.data).toHaveLength(5);
      expect(page.hasNext).toBe(false);
    });

    it('rejects limit above 100', async () => {
      await request(server)
        .get('/api/cash-shifts?limit=101')
        .set(auth())
        .expect(400);
    });
  });

  describe('GET /customers', () => {
    it('returns every customer, with no total header, without page or limit', async () => {
      const res = await request(server)
        .get('/api/customers')
        .set(auth())
        .expect(statusWithBody(200));

      expect(res.body).toHaveLength(3);
      expect(res.headers['x-total-count']).toBeUndefined();
    });

    it('pages and sends X-Total-Count, readable from the frontend origin', async () => {
      const res = await request(server)
        .get('/api/customers?limit=2')
        .set(auth())
        .set('Origin', ORIGIN)
        .expect(statusWithBody(200));

      expect(res.body).toHaveLength(2);
      expect(res.headers['x-total-count']).toBe('3');
      expect(res.headers['access-control-expose-headers']).toContain(
        'X-Total-Count',
      );
    });
  });
});
