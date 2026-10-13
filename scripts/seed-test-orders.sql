-- Limpiar órdenes previas y reiniciar secuencias
TRUNCATE TABLE kitchen_event_log, kitchen_order_item, kitchen_order RESTART IDENTITY CASCADE;

-- Crear 2 órdenes por cada estación del Merchant 2:
-- Estación 6: Hot Line & Grill Station (station_number: 1 -> KST-1)
-- Estación 8: Main Bar & Beverage Station (station_number: 3 -> KST-3)
-- Estación 9: Desserts & Bakery Hub (station_number: 4 -> KST-4)
-- Estación 10: Expo & Final Quality Check (station_number: 5 -> KST-5)

INSERT INTO kitchen_order (merchant_id, station_id, priority, business_status, status, notes, started_at, created_at, updated_at)
VALUES
  (2, 6, 0, 'pending', 'active', 'Table 1 • Station #KST-1 (AUTO)', null, now() - interval '8 minutes', now()),
  (2, 6, 1, 'pending', 'active', 'Table 2 • Station #KST-1 (AUTO)', null, now() - interval '7 minutes', now()),
  (2, 8, 0, 'pending', 'active', 'Table 3 • Station #KST-3 (MANUAL)', null, now() - interval '6 minutes', now()),
  (2, 8, 2, 'pending', 'active', 'Table 4 • Station #KST-3 (MANUAL)', null, now() - interval '5 minutes', now()),
  (2, 9, 0, 'pending', 'active', 'Table 5 • Station #KST-4 (SUMMARY)', null, now() - interval '4 minutes', now()),
  (2, 9, 3, 'pending', 'active', 'Table 6 • Station #KST-4 (SUMMARY)', null, now() - interval '3 minutes', now()),
  (2, 10, 0, 'pending', 'active', 'Table 7 • Station #KST-5 (GRID)', null, now() - interval '2 minutes', now()),
  (2, 10, 1, 'pending', 'active', 'Table 8 • Station #KST-5 (GRID)', null, now() - interval '1 minute', now());

-- Para cada una de las 8 órdenes del Merchant 2, insertar los 4 ítems requeridos:
-- - Main: 2 Smash Burger Doble (product_id: 16, variant_id: 8)
-- - Bebida: 3 Iced Latte (product_id: 11, variant_id: 22)
-- - Aperitivo: 2 Tacos al Pastor (product_id: 19, variant_id: 18)
-- - Dulce / Postre: 1 Croissant de Mantequilla (product_id: 12, variant_id: 24)

DO $$
DECLARE
  order_rec RECORD;
BEGIN
  FOR order_rec IN SELECT id FROM kitchen_order WHERE merchant_id = 2 ORDER BY id LOOP
    -- Main: 2x Smash Burger Doble
    INSERT INTO kitchen_order_item (
      kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
      course, preparation_status, hold_until, status, notes, created_at, updated_at
    ) VALUES (
      order_rec.id, 16, 8, 2, 0,
      'main_course', 'held', now() + interval '10 minutes', 'active', 'Medium rare, extra pickles', now(), now()
    );

    -- Bebida: 3x Iced Latte
    INSERT INTO kitchen_order_item (
      kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
      course, preparation_status, status, notes, created_at, updated_at
    ) VALUES (
      order_rec.id, 11, 22, 3, 0,
      'beverage', 'pending', 'active', 'Less ice, oat milk', now(), now()
    );

    -- Aperitivo: 2x Tacos al Pastor
    INSERT INTO kitchen_order_item (
      kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
      course, preparation_status, status, notes, created_at, updated_at
    ) VALUES (
      order_rec.id, 19, 18, 2, 0,
      'appetizer', 'pending', 'active', 'No cilantro, lime on side', now(), now()
    );

    -- Dulce / Postre: 1x Croissant de Mantequilla
    INSERT INTO kitchen_order_item (
      kitchen_order_id, product_id, variant_id, quantity, prepared_quantity,
      course, preparation_status, hold_until, status, notes, created_at, updated_at
    ) VALUES (
      order_rec.id, 12, 24, 1, 0,
      'dessert', 'held', now() + interval '20 minutes', 'active', 'Warm and crispy', now(), now()
    );
  END LOOP;
END $$;

