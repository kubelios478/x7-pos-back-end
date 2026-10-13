-- Limpiar órdenes previas y reiniciar secuencias
TRUNCATE TABLE kitchen_event_log, kitchen_order_item, kitchen_order RESTART IDENTITY CASCADE;

DO $$
DECLARE
  v_order1_id INT;
  v_order2_id INT;
  v_order3_id INT;
BEGIN
  -- Orden 1: 1x Smash Burger Doble en estación Hot (6)
  INSERT INTO kitchen_order (merchant_id, station_id, priority, business_status, status, notes, started_at, created_at, updated_at)
  VALUES (2, 6, 0, 'pending', 'active', 'Table 1 • Station #KST-1 (Smash)', null, now() - interval '5 minutes', now())
  RETURNING id INTO v_order1_id;

  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, hold_until, status, notes, created_at, updated_at
  ) VALUES (
    v_order1_id, 16, 8, 1, 0,
    'main_course', 'held', now() + interval '10 minutes', 'active', 'Medium rare, extra pickles', now() - interval '5 minutes', now()
  );

  -- Orden 2: 1x Iced Latte en estación Hot (6)
  INSERT INTO kitchen_order (merchant_id, station_id, priority, business_status, status, notes, started_at, created_at, updated_at)
  VALUES (2, 6, 1, 'pending', 'active', 'Table 2 • Station #KST-1 (Latte)', null, now() - interval '3 minutes', now())
  RETURNING id INTO v_order2_id;

  INSERT INTO kitchen_order_item (
    kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
    course, preparation_status, status, notes, created_at, updated_at
  ) VALUES (
    v_order2_id, 11, 22, 1, 0,
    'beverage', 'pending', 'active', 'Oat milk, less ice', now() - interval '3 minutes', now()
  );
END $$;
