-- Limpiar órdenes previas y reiniciar secuencias
TRUNCATE TABLE kitchen_event_log, kitchen_order_item, kitchen_order RESTART IDENTITY CASCADE;

DO $$
DECLARE
  v_order_id INT;
BEGIN
  -- 1 Orden Multi-Artículo con 4 cursos: Aperitivo, Bebida, Plato Principal, Postre
  INSERT INTO kitchen_order (merchant_id, station_id, priority, business_status, status, notes, started_at, created_at, updated_at)
  VALUES (2, 6, 0, 'pending', 'active', 'Table 1 • Station #KST-1 (Multi-Course)', null, now() - interval '2 minutes', now())
  RETURNING id INTO v_order_id;

  -- 1x Aperitivo: Tacos al Pastor (pending)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, status, notes, created_at, updated_at
  ) VALUES (
    v_order_id, 19, 18, 1, 0,
    'appetizer', 'pending', 'active', 'No cilantro, lime on side', now() - interval '2 minutes', now()
  );

  -- 1x Bebida: Iced Latte (pending)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, status, notes, created_at, updated_at
  ) VALUES (
    v_order_id, 11, 22, 1, 0,
    'beverage', 'pending', 'active', 'Extra shot espresso', now() - interval '2 minutes', now()
  );

  -- 1x Main Course: Smash Burger Doble (held, hold_until +10m)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, hold_until, status, notes, created_at, updated_at
  ) VALUES (
    v_order_id, 16, 8, 1, 0,
    'main_course', 'held', now() + interval '10 minutes', 'active', 'Medium rare, extra cheese', now() - interval '2 minutes', now()
  );

  -- 1x Dessert: Croissant de Mantequilla (held, hold_until +20m)
  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, hold_until, status, notes, created_at, updated_at
  ) VALUES (
    v_order_id, 12, 24, 1, 0,
    'dessert', 'held', now() + interval '20 minutes', 'active', 'Warm and crispy', now() - interval '2 minutes', now()
  );
END $$;
