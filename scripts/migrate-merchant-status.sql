-- Add operational status to merchant branches (default: active)
ALTER TABLE merchant
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

UPDATE merchant
SET status = 'active'
WHERE status IS NULL OR status = '';
