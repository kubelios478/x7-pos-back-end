-- Una sola tarifa ACTIVA por zona de reparto (delivery_fees).
--
-- El servicio ya lo comprueba antes de guardar (409), pero dos altas simultáneas pueden
-- pasar la comprobación a la vez; este índice único parcial es el respaldo en la base.
-- Idempotente. Falla si ya hay duplicados activos: desactiva los sobrantes antes con
--   SELECT delivery_zone_id, array_agg(id) FROM delivery_fees
--    WHERE status = 'active' GROUP BY 1 HAVING count(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_delivery_fees_one_active_per_zone
  ON delivery_fees (delivery_zone_id)
  WHERE status = 'active';
