-- Migration: Historia X7P-4211 Dynamic Station Rerouting, Thermal Printer Fallback & High-Volume Load Balancing
ALTER TABLE kitchen_station 
  ADD COLUMN IF NOT EXISTS backup_station_id integer REFERENCES kitchen_station(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS max_active_tickets_capacity integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS auto_reroute_on_offline boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reroute_on_capacity boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fallback_action character varying(50) NOT NULL DEFAULT 'BACKUP_STATION';

-- Set initial backup routes for Merchant 2:
-- Hot Line (6) -> Expo (10)
-- Cold Prep (7) -> Expo (10)
-- Main Bar (8) -> Expo (10)
-- Desserts (9) -> Expo (10)
-- Expo (10) -> Hot Line (6)
UPDATE kitchen_station SET backup_station_id = 10, max_active_tickets_capacity = 15, fallback_action = 'BOTH' WHERE id IN (6, 7, 8, 9) AND backup_station_id IS NULL;
UPDATE kitchen_station SET backup_station_id = 6, max_active_tickets_capacity = 25, fallback_action = 'THERMAL_PRINTER' WHERE id = 10 AND backup_station_id IS NULL;
