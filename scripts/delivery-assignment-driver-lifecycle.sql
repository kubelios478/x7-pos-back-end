-- Ciclo de vida de asignaciones de reparto + flota de repartidores.
--
-- La app arranca con synchronize=true, que crea solo las columnas nuevas
-- (assignment_type, external_delivery_id, external_tracking_url, external_dsp_fee), el
-- valor 'failed' del enum y el índice único uq_delivery_assignments_external_delivery.
-- Lo que synchronize NO puede hacer por sí solo está aquí. Idempotente.

-- 1) EJECUTAR ANTES DE DESPLEGAR. El enum delivery_status pierde 'unassigned' (ahora es
--    'pending'); si queda alguna fila con ese valor, synchronize falla al recrear el tipo.
UPDATE delivery_assignments
   SET delivery_status = 'pending'
 WHERE delivery_status::text = 'unassigned';

-- 2) vehicleType a los valores canónicos (car, motorcycle, bicycle, e_scooter, on_foot).
--    La app ya mapea al leer las variantes conocidas, pero los filtros SQL de otros módulos
--    (p. ej. delivery-tracking) leen la columna en crudo. Lo no reconocido se deja igual:
--    revísalo con la consulta del final.
UPDATE delivery_drivers
   SET "vehicleType" = CASE lower(regexp_replace("vehicleType", '[[:space:]_-]', '', 'g'))
         WHEN 'car' THEN 'car' WHEN 'auto' THEN 'car' WHEN 'automobile' THEN 'car'
         WHEN 'carro' THEN 'car' WHEN 'coche' THEN 'car'
         WHEN 'motorcycle' THEN 'motorcycle' WHEN 'motorbike' THEN 'motorcycle'
         WHEN 'moto' THEN 'motorcycle' WHEN 'motocicleta' THEN 'motorcycle'
         WHEN 'bicycle' THEN 'bicycle' WHEN 'bike' THEN 'bicycle' WHEN 'bicicleta' THEN 'bicycle'
         WHEN 'escooter' THEN 'e_scooter' WHEN 'scooter' THEN 'e_scooter' WHEN 'patinete' THEN 'e_scooter'
         WHEN 'onfoot' THEN 'on_foot' WHEN 'foot' THEN 'on_foot' WHEN 'walking' THEN 'on_foot'
         WHEN 'apie' THEN 'on_foot'
         ELSE "vehicleType" END;

-- 3) Teléfonos normalizados (apto para tel:): sin espacios, guiones, puntos ni paréntesis,
--    conservando el + inicial. La app ya guarda así las altas/ediciones nuevas.
UPDATE delivery_drivers
   SET phone = CASE WHEN btrim(phone) LIKE '+%' THEN '+' ELSE '' END
               || regexp_replace(regexp_replace(btrim(phone), '^\+', ''), '[[:space:]().-]', '', 'g')
 WHERE phone ~ '[[:space:]().-]';

-- 4) OPCIONAL: respaldo en BD de "un teléfono por comercio" (el servicio ya responde 409).
--    Falla si hay duplicados; localízalos antes con:
--      SELECT merchant_id, phone, array_agg(id) FROM delivery_drivers
--       WHERE status <> 'deleted' GROUP BY 1, 2 HAVING count(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_delivery_drivers_merchant_phone
  ON delivery_drivers (merchant_id, phone)
  WHERE status <> 'deleted';

-- Revisión: valores de vehículo que siguen sin reconocerse.
-- SELECT id, "vehicleType" FROM delivery_drivers
--  WHERE "vehicleType" NOT IN ('car', 'motorcycle', 'bicycle', 'e_scooter', 'on_foot');
