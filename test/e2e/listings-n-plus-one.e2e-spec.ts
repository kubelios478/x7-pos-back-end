import * as request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, E2eApp } from './app';
import { registerTenant, statusWithBody, Tenant } from './fixtures';

interface CategoryRow {
  name: string;
  parents: { id: number; parentName: string }[];
}

interface ModifierRow {
  name: string;
  product: { id: number; name: string; variants: unknown[] } | null;
}

describe('Listings without N+1 (e2e)', () => {
  let e2e: E2eApp;
  let server: App;
  let tenant: Tenant;
  const ids: Record<string, number> = {};

  const auth = () => ({ Authorization: `Bearer ${tenant.token}` });
  const post = async (path: string, body: object) =>
    (
      (
        await request(server)
          .post(path)
          .set(auth())
          .send(body)
          .expect(statusWithBody(201))
      ).body as { data: { id: number } }
    ).data.id;

  beforeAll(async () => {
    e2e = await createE2eApp();
    server = e2e.app.getHttpServer() as App;
    tenant = await registerTenant(e2e.app, e2e.planId, 'listings');

    ids.Root = await post('/api/category', { name: 'Root' });
    ids.Mid = await post('/api/category', { name: 'Mid', parentId: ids.Root });
    ids.Leaf = await post('/api/category', { name: 'Leaf', parentId: ids.Mid });
    ids.Solo = await post('/api/category', { name: 'Solo' });

    ids.Burger = await post('/api/products', {
      name: 'Burger',
      sku: 'E2E-BURGER',
      basePrice: 10,
      categoryId: ids.Leaf,
    });
    ids.Fries = await post('/api/products', {
      name: 'Fries',
      sku: 'E2E-FRIES',
      basePrice: 4,
    });
    await post('/api/variants', {
      name: 'Double',
      price: 14,
      sku: 'E2E-BURGER-D',
      productId: ids.Burger,
    });
    await post('/api/modifiers', {
      name: 'Bacon',
      priceDelta: 2,
      productId: ids.Burger,
    });
    await post('/api/modifiers', {
      name: 'Cheese',
      priceDelta: 1,
      productId: ids.Burger,
    });
    await post('/api/modifiers', {
      name: 'Salt',
      priceDelta: 0,
      productId: ids.Fries,
    });
  });

  afterAll(async () => {
    await e2e?.app.close();
  });

  it('lists every category with its ancestors, root first', async () => {
    const res = await request(server)
      .get('/api/category?limit=10')
      .set(auth())
      .expect(statusWithBody(200));
    const byName = new Map(
      (res.body as { data: CategoryRow[] }).data.map((c) => [
        c.name,
        c.parents,
      ]),
    );

    expect(byName.get('Root')).toEqual([]);
    expect(byName.get('Solo')).toEqual([]);
    expect(byName.get('Mid')).toEqual([{ id: ids.Root, parentName: 'Root' }]);
    expect(byName.get('Leaf')).toEqual([
      { id: ids.Root, parentName: 'Root' },
      { id: ids.Mid, parentName: 'Mid' },
    ]);
  });

  it('lists modifiers with their full product, shared products included', async () => {
    const res = await request(server)
      .get('/api/modifiers?limit=10')
      .set(auth())
      .expect(statusWithBody(200));
    const rows = (res.body as { data: ModifierRow[] }).data;

    expect(rows.map((m) => [m.name, m.product?.name])).toEqual([
      ['Bacon', 'Burger'],
      ['Cheese', 'Burger'],
      ['Salt', 'Fries'],
    ]);
    const burger = rows[0].product;
    expect(burger).toMatchObject({
      id: ids.Burger,
      category: { id: ids.Leaf, name: 'Leaf' },
    });
    expect(burger?.variants).toHaveLength(1);
    expect(rows[1].product).toEqual(burger);
  });
});
