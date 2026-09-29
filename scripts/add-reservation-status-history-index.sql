-- Índice del feed de auditoría de reservas: GET /api/reservation-status-history filtra por
-- reservation_id y ordena por changed_at DESC. Sin él, cada consulta recorre la tabla entera.
-- Idempotente. El nombre coincide con el @Index de ReservationStatusHistory.
--   psql -h localhost -U postgres -d x7_pos -f scripts/add-reservation-status-history-index.sql
CREATE INDEX IF NOT EXISTS "IDX_reservation_status_history_reservation_changed_at"
  ON reservation_status_history (reservation_id, changed_at);
