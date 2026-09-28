-- Migration: 004_idempotency_keys.sql
-- Description: Stores idempotency keys for request deduplication across domain services

CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    target_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
