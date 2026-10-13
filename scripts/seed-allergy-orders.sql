-- Limpiar órdenes previas y reiniciar secuencias
TRUNCATE TABLE kitchen_event_log, kitchen_order_item, kitchen_order RESTART IDENTITY CASCADE;

DO $$
DECLARE
  v_order1_id INT;
  v_order2_id INT;
  v_order3_id INT;
BEGIN
  -- ====================================================================
  -- ORDEN 1: Alergia a Frutos Secos / Maní & Lácteos (Mesa 4)
  -- ====================================================================
  INSERT INTO kitchen_order (merchant_id, station_id, priority, business_status, status, notes, started_at, created_at, updated_at)
  VALUES (2, 6, 2, 'pending', 'active', 'Table 4', null, now() - interval '4 minutes', now())
  RETURNING id INTO v_order1_id;

  -- Item 1: Smash Burger Doble con Alergia a Maní + Modificadores (Remociones primero, Adiciones después)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, hold_until, status, notes, created_at, updated_at
  ) VALUES (
    v_order1_id, 16, 8, 1, 0,
    'main_course', 'held', now() + interval '10 minutes', 'active', 'Allergy: Peanuts, Gluten-Free Bun, No Onions, Extra Cheese', now() - interval '4 minutes', now()
  );

  -- Item 2: Iced Latte con Alergia a Lácteos
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, status, notes, created_at, updated_at
  ) VALUES (
    v_order1_id, 11, 22, 1, 0,
    'beverage', 'pending', 'active', 'Allergy: Dairy, Sub Oat Milk, No Whipped Cream, Extra Vanilla Syrup', now() - interval '4 minutes', now()
  );

  -- ====================================================================
  -- ORDEN 2: Restricciones Dietarias Críticas (Celíaco & Vegano) (Mesa 7)
  -- ====================================================================
  INSERT INTO kitchen_order (merchant_id, station_id, priority, business_status, status, notes, started_at, created_at, updated_at)
  VALUES (2, 6, 1, 'pending', 'active', 'Table 7', null, now() - interval '2 minutes', now())
  RETURNING id INTO v_order2_id;

  -- Item 1: Tacos al Pastor con Celíaco
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, status, notes, created_at, updated_at
  ) VALUES (
    v_order2_id, 19, 18, 2, 0,
    'appetizer', 'pending', 'active', 'Allergy: Celiac, 100% Gluten-Free Corn Tortillas, No Onions, No Cilantro, Extra Lime, Extra Salsa', now() - interval '2 minutes', now()
  );

  -- Item 2: Croissant de Mantequilla (Dessert inicia en HELD con hold_until +20m)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, hold_until, status, notes, created_at, updated_at
  ) VALUES (
    v_order2_id, 12, 24, 1, 0,
    'dessert', 'held', now() + interval '20 minutes', 'active', 'Vegan, No Butter Glaze, No Sugar, Extra Warm', now() - interval '2 minutes', now()
  );

  -- ====================================================================
  -- ORDEN 3: Modificadores Mixtos Estándar (Remociones / Adiciones) (Mesa 12)
  -- ====================================================================
  INSERT INTO kitchen_order (merchant_id, station_id, priority, business_status, status, notes, started_at, created_at, updated_at)
  VALUES (2, 6, 0, 'pending', 'active', 'Table 12 • Standard Line Order', null, now() - interval '1 minute', now())
  RETURNING id INTO v_order3_id;

  -- Item 1: Smash Burger con remociones en rojo y adiciones en verde (Main Course inicia en HELD con hold_until +10m)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, hold_until, status, notes, created_at, updated_at
  ) VALUES (
    v_order3_id, 16, 8, 2, 0,
    'main_course', 'held', now() + interval '10 minutes', 'active', 'No Onions, No Pickles, No Mayo, Extra Bacon, Extra Cheese, Well Done', now() - interval '1 minute', now()
  );

  -- Item 2: Bebida (Beverage inicia en PENDING)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, status, notes, created_at, updated_at
  ) VALUES (
    v_order3_id, 11, 22, 1, 0,
    'beverage', 'pending', 'active', 'No Sugar, Extra Ice', now() - interval '1 minute', now()
  );

  RAISE NOTICE '3 Allergy and Modifier test orders successfully seeded!';
END $$;
