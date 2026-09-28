-- Migration 002: Add tx_hash column to outbox_events table
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66);
