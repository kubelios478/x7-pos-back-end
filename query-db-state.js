const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'x7_admin',
  password: '2002',
  database: 'x7_pos',
});

async function main() {
  await client.connect();

  const suppliers = await client.query(
    'SELECT id, name, company_id FROM supplier WHERE "isActive"=true ORDER BY company_id, id'
  );
  console.log('\n--- SUPPLIERS (active) ---');
  console.table(suppliers.rows);

  const merchants = await client.query(
    'SELECT id, name, "companyId" as company_id FROM merchant ORDER BY id'
  );
  console.log('\n--- MERCHANTS ---');
  console.table(merchants.rows);

  const products = await client.query(
    'SELECT p.id, p.name, p."merchantId" as merchant_id FROM product p ORDER BY p."merchantId", p.id LIMIT 30'
  );
  console.log('\n--- PRODUCTS ---');
  console.table(products.rows);

  const pos = await client.query(
    'SELECT id, status, "supplierId" as supplier_id, "merchantId" as merchant_id, "totalAmount" as total FROM purchase_order ORDER BY id LIMIT 20'
  );
  console.log('\n--- PURCHASE ORDERS (existing) ---');
  console.table(pos.rows);

  await client.end();
}

main().catch(console.error);
