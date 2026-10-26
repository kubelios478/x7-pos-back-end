import * as request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, E2eApp } from './app';
import { registerTenant, statusWithBody, Tenant } from './fixtures';

interface VariantRow {
  id: number;
  name: string;
  sku: string | null;
  productId: number;
  isActive: boolean;
}

describe('Variants without SKU (e2e)', () => {
  let e2e: E2eApp;
  let server: App;
  let tenant: Tenant;
  const ids: Record<string, number> = {};

  const auth = () => ({ Authorization: `Bearer ${tenant.token}` });
  const post = async (path: string, body: object) =>
    (
      (
        await request(server)
          .post(`/api/${path}`)
          .set(auth())
          .send(body)
          .expect(statusWithBody(201))
      ).body as { data: { id: number } }
    ).data.id;
  const variantRow = async (id: number) =>
    (
      await e2e.dataSource.query<VariantRow[]>(
        `SELECT id, name, sku, "productId", "isActive" FROM variant WHERE id = $1`,
        [id],
      )
    )[0];

  beforeAll(async () => {
    e2e = await createE2eApp();
    server = e2e.app.getHttpServer() as App;
    tenant = await registerTenant(e2e.app, e2e.planId, 'variants');

    ids.burger = await post('products', {
      name: 'Burger',
      sku: 'E2E-BURGER',
      basePrice: 10,
    });
    ids.fries = await post('products', {
      name: 'Fries',
      sku: 'E2E-FRIES',
      basePrice: 4,
    });
    // Una variante con SKU, desactivada después: el caso que antes se sobrescribía.
    ids.old = await post('variants', {
      name: 'Old double',
      price: 14,
      sku: 'E2E-BURGER-D',
      productId: ids.burger,
    });
    await request(server)
      .delete(`/api/variants/${ids.old}`)
      .set(auth())
      .expect(statusWithBody(200));
  });

  afterAll(async () => {
    await e2e?.app.close();
  });

  it('creates a variant without SKU and leaves the inactive one alone', async () => {
    const id = await post('variants', {
      name: 'Large',
      price: 6,
      productId: ids.fries,
    });

    expect(id).not.toBe(ids.old);
    expect(await variantRow(id)).toMatchObject({
      name: 'Large',
      sku: null,
      productId: ids.fries,
      isActive: true,
    });
    expect(await variantRow(ids.old)).toMatchObject({
      name: 'Old double',
      sku: 'E2E-BURGER-D',
      productId: ids.burger,
      isActive: false,
    });
  });

  it('allows a second variant without SKU next to an active one', async () => {
    const id = await post('variants', {
      name: 'Small',
      price: 3,
      sku: '  ',
      productId: ids.fries,
    });
    expect((await variantRow(id)).sku).toBeNull();
  });

  it('still rejects a repeated SKU', async () => {
    await post('variants', {
      name: 'Medium',
      price: 5,
      sku: 'E2E-FRIES-M',
      productId: ids.fries,
    });
    const res = await request(server)
      .post('/api/variants')
      .set(auth())
      .send({
        name: 'Other',
        price: 5,
        sku: 'E2E-FRIES-M',
        productId: ids.fries,
      });
    expect(res.status).toBe(409);
  });
});
