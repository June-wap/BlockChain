-- Migration 003: Harden outbox_events table with leasing, retries, and dead-letter support
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS max_retries INT NOT NULL DEFAULT 5;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS locked_by VARCHAR(64);
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE outbox_events DROP CONSTRAINT IF EXISTS outbox_events_status_check;
ALTER TABLE outbox_events ADD CONSTRAINT outbox_events_status_check 
  CHECK (status IN ('PENDING', 'PROCESSING', 'RETRY', 'PROCESSED', 'FAILED', 'DEAD_LETTER'));

CREATE INDEX IF NOT EXISTS idx_outbox_claim ON outbox_events(status, next_attempt_at);
