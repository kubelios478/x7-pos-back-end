import * as request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, E2eApp } from './app';
import { registerTenant, statusWithBody, Tenant } from './fixtures';

interface ItemsPage {
  data: { id: number; product: { name: string } | null }[];
  total: number;
  totalPages: number;
  hasNext: boolean;
}

describe('GET /items pagination (e2e)', () => {
  let e2e: E2eApp;
  let server: App;
  let tenant: Tenant;

  beforeAll(async () => {
    e2e = await createE2eApp();
    server = e2e.app.getHttpServer() as App;
    tenant = await registerTenant(e2e.app, e2e.planId, 'items');
    const auth = { Authorization: `Bearer ${tenant.token}` };

    const post = async (path: string, body: object) =>
      (
        (
          await request(server)
            .post(path)
            .set(auth)
            .send(body)
            .expect(statusWithBody(201))
        ).body as { data: { id: number } }
      ).data.id;

    const locations = [
      await post('/api/locations', { name: 'Kitchen' }),
      await post('/api/locations', { name: 'Bar' }),
    ];
    // Nombres repetidos entre ubicaciones: el orden por nombre necesita un desempate.
    for (const [name, sku] of [
      ['Gamma', 'E2E-G'],
      ['Alpha', 'E2E-A'],
      ['Beta', 'E2E-B'],
    ]) {
      const productId = await post('/api/products', {
        name,
        sku,
        basePrice: 1,
      });
      const variantId = await post('/api/variants', {
        name: 'Regular',
        price: 1,
        sku: `${sku}-R`,
        productId,
      });
      for (const locationId of name === 'Gamma' ? [locations[0]] : locations) {
        await post('/api/items', {
          productId,
          variantId,
          locationId,
          currentQty: 1,
        });
      }
    }
  });

  afterAll(async () => {
    await e2e?.app.close();
  });

  const page = async (n: number) =>
    (
      await request(server)
        .get(`/api/items?page=${n}&limit=2`)
        .set({ Authorization: `Bearer ${tenant.token}` })
        .expect(statusWithBody(200))
    ).body as ItemsPage;

  it('walks every item once, in name order, two per page', async () => {
    const pages = [await page(1), await page(2), await page(3)];
    const rows = pages.flatMap((p) => p.data);

    expect(pages.map((p) => p.data.length)).toEqual([2, 2, 1]);
    expect(rows.map((r) => r.product?.name)).toEqual([
      'Alpha',
      'Alpha',
      'Beta',
      'Beta',
      'Gamma',
    ]);
    expect(new Set(rows.map((r) => r.id)).size).toBe(5);
    expect(pages[0]).toMatchObject({ total: 5, totalPages: 3, hasNext: true });
    expect(pages[2].hasNext).toBe(false);
  });
});
