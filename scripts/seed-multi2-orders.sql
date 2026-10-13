-- Limpiar órdenes previas y reiniciar secuencias
TRUNCATE TABLE kitchen_event_log, kitchen_order_item, kitchen_order RESTART IDENTITY CASCADE;

DO $$
DECLARE
  v_order1_id INT;
  v_order2_id INT;
BEGIN
  -- ==========================================
  -- ORDEN 1: Multi-Course (Mesa 1 • Estación 1)
  -- ==========================================
  INSERT INTO kitchen_order (merchant_id, station_id, priority, business_status, status, notes, started_at, created_at, updated_at)
  VALUES (2, 6, 0, 'pending', 'active', 'Table 1 • Station #KST-1 (Multi-Course 1)', null, now() - interval '5 minutes', now())
  RETURNING id INTO v_order1_id;

  -- 1x Aperitivo: Tacos al Pastor (pending)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, status, notes, created_at, updated_at
  ) VALUES (
    v_order1_id, 19, 18, 1, 0,
    'appetizer', 'pending', 'active', 'No cilantro, extra lime', now() - interval '5 minutes', now()
  );

  -- 1x Bebida: Iced Latte (pending)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, status, notes, created_at, updated_at
  ) VALUES (
    v_order1_id, 11, 22, 1, 0,
    'beverage', 'pending', 'active', 'Extra shot espresso, oat milk', now() - interval '5 minutes', now()
  );

  -- 1x Main Course: Smash Burger Doble (held, hold_until +10m)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, hold_until, status, notes, created_at, updated_at
  ) VALUES (
    v_order1_id, 16, 8, 1, 0,
    'main_course', 'held', now() + interval '10 minutes', 'active', 'Medium rare, extra cheese', now() - interval '5 minutes', now()
  );

  -- 1x Dessert: Croissant de Mantequilla (held, hold_until +20m)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, hold_until, status, notes, created_at, updated_at
  ) VALUES (
    v_order1_id, 12, 24, 1, 0,
    'dessert', 'held', now() + interval '20 minutes', 'active', 'Warm and crispy', now() - interval '5 minutes', now()
  );

  -- ==========================================
  -- ORDEN 2: Multi-Course (Mesa 2 • Estación 1)
  -- ==========================================
  INSERT INTO kitchen_order (merchant_id, station_id, priority, business_status, status, notes, started_at, created_at, updated_at)
  VALUES (2, 6, 1, 'pending', 'active', 'Table 2 • Station #KST-1 (Multi-Course 2)', null, now() - interval '2 minutes', now())
  RETURNING id INTO v_order2_id;

  -- 2x Aperitivo: Tacos al Pastor (pending)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, status, notes, created_at, updated_at
  ) VALUES (
    v_order2_id, 19, 18, 2, 0,
    'appetizer', 'pending', 'active', 'Spicy salsa on the side', now() - interval '2 minutes', now()
  );

  -- 2x Bebida: Iced Latte (pending)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, status, notes, created_at, updated_at
  ) VALUES (
    v_order2_id, 11, 22, 2, 0,
    'beverage', 'pending', 'active', 'Almond milk, less sweet', now() - interval '2 minutes', now()
  );

  -- 2x Main Course: Smash Burger Doble (held, hold_until +12m)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, hold_until, status, notes, created_at, updated_at
  ) VALUES (
    v_order2_id, 16, 8, 2, 0,
    'main_course', 'held', now() + interval '12 minutes', 'active', 'Well done, add crispy bacon', now() - interval '2 minutes', now()
  );

  -- 1x Dessert: Croissant de Mantequilla (held, hold_until +22m)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, hold_until, status, notes, created_at, updated_at
  ) VALUES (
    v_order2_id, 12, 24, 1, 0,
    'dessert', 'held', now() + interval '22 minutes', 'active', 'Extra powdered sugar, toasted', now() - interval '2 minutes', now()
  );
END $$;
