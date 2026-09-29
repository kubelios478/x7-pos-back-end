-- Motor de aforo y ritmo de reservas (ReservationCapacityModule). Idempotente.
--   psql -h localhost -U postgres -d x7_pos -f scripts/add-reservation-capacity.sql
--
-- 1) Ajustes por comercio: aforo, franja, límite de llegadas por franja y turnos de servicio.
--    Sin fila, el comercio usa los turnos por defecto, el aforo de sus mesas y ningún límite.
CREATE TABLE IF NOT EXISTS reservation_settings (
  id                    SERIAL PRIMARY KEY,
  merchant_id           INTEGER NOT NULL UNIQUE REFERENCES merchant(id) ON DELETE CASCADE,
  seat_capacity         INTEGER NULL CHECK (seat_capacity IS NULL OR seat_capacity > 0),
  slot_interval_minutes INTEGER NOT NULL DEFAULT 15 CHECK (slot_interval_minutes IN (15, 30)),
  max_covers_per_slot   INTEGER NULL CHECK (max_covers_per_slot IS NULL OR max_covers_per_slot > 0),
  shifts                JSONB NULL,
  updated_by            INTEGER NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP NOT NULL DEFAULT now()
);

-- 2) Auditoría del override del encargado: quién autorizó forzar una franja llena y cuándo.
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS capacity_override_by INTEGER NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS capacity_override_at TIMESTAMP NULL;
