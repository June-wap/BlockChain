-- ============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Initial Relational Database Schema for Insurance Claim System
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    password_hash VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 2. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT
);

-- 3. User Roles Mapping
CREATE TABLE IF NOT EXISTS user_roles (
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role_id VARCHAR(32) NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- 4. Policies Table
CREATE TABLE IF NOT EXISTS policies (
    id VARCHAR(64) PRIMARY KEY,
    policy_number VARCHAR(64) NOT NULL UNIQUE,
    customer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    insurance_type VARCHAR(64) NOT NULL,
    coverage_amount BIGINT NOT NULL CHECK (coverage_amount > 0),
    premium_amount BIGINT NOT NULL CHECK (premium_amount > 0),
    deductible BIGINT NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED', 'SUSPENDED')),
    terms_uri VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policies_customer_id ON policies(customer_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_number ON policies(policy_number);

-- 5. Claims Table
CREATE TABLE IF NOT EXISTS claims (
    id VARCHAR(64) PRIMARY KEY,
    claim_number VARCHAR(64) NOT NULL UNIQUE,
    policy_id VARCHAR(64) NOT NULL REFERENCES policies(id) ON DELETE RESTRICT,
    customer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    incident_date DATE NOT NULL,
    incident_type VARCHAR(64) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requested_amount BIGINT NOT NULL CHECK (requested_amount > 0),
    approved_amount BIGINT CHECK (approved_amount >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN (
        'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAYMENT_PENDING', 'PAID'
    )),
    reviewer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    review_notes TEXT,
    blockchain_tx_hash VARCHAR(66),
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_customer_id ON claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_reviewer_id ON claims(reviewer_id);

-- 6. Claim Documents (Object Storage References)
CREATE TABLE IF NOT EXISTS claim_documents (
    id VARCHAR(64) PRIMARY KEY,
    claim_id VARCHAR(64) REFERENCES claims(id) ON DELETE CASCADE,
    storage_key VARCHAR(512) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    file_hash VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_docs_claim_id ON claim_documents(claim_id);

-- 7. Claim Reviews Table
CREATE TABLE IF NOT EXISTS claim_reviews (
    id VARCHAR(64) PRIMARY KEY,
    claim_id VARCHAR(64) NOT NULL REFERENCES claims(id) ON DELETE RESTRICT,
    reviewer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    decision VARCHAR(32) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
    approved_amount BIGINT CHECK (approved_amount >= 0),
    reason VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_reviews_claim_id ON claim_reviews(claim_id);

-- 8. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    claim_id VARCHAR(64) NOT NULL UNIQUE REFERENCES claims(id) ON DELETE RESTRICT,
    policy_id VARCHAR(64) NOT NULL REFERENCES policies(id) ON DELETE RESTRICT,
    customer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL CHECK (amount > 0),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REJECTED')),
    payment_method VARCHAR(64) NOT NULL DEFAULT 'FIAT_BANK_TRANSFER',
    recipient_wallet VARCHAR(42),
    recipient_bank_account VARCHAR(64),
    blockchain_tx_hash VARCHAR(66),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_claim_id ON payments(claim_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 9. Blockchain Transactions Table
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id VARCHAR(64) PRIMARY KEY,
    tx_hash VARCHAR(66) NOT NULL UNIQUE,
    network VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    claim_id VARCHAR(64) REFERENCES claims(id) ON DELETE SET NULL,
    payment_id VARCHAR(64) REFERENCES payments(id) ON DELETE SET NULL,
    from_address VARCHAR(42) NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    block_number BIGINT NOT NULL,
    gas_used BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED')),
    confirmation_count INT NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_bctx_claim_id ON blockchain_transactions(claim_id);
CREATE INDEX IF NOT EXISTS idx_bctx_status ON blockchain_transactions(status);

-- 10. System Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(64) NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    link_url VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- 11. Append-Only Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 12. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

-- 13. Transactional Outbox Events Table
CREATE TABLE IF NOT EXISTS outbox_events (
    id VARCHAR(64) PRIMARY KEY,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')),
    retry_count INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_events(status, created_at);

-- 14. Policy History Table
CREATE TABLE IF NOT EXISTS policy_history (
    id VARCHAR(64) PRIMARY KEY,
    policy_id VARCHAR(64) NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    previous_status VARCHAR(32),
    new_status VARCHAR(32),
    changed_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_history_policy_id ON policy_history(policy_id);

