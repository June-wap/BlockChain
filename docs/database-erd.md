# Database Design & Entity Relationship Diagram (ERD)
## Insurance Claim Processing System

This document specifies the relational database schema, integrity constraints, indexing strategy, and ERD for the Insurance Claim Processing System.

### Design Principles
1. **Financial Integrity**: Money amounts are stored as integer values in minor units (e.g. cents for USD or whole dong for VND) to eliminate floating-point imprecision.
2. **PII and Evidence Isolation**: Customer personal data, health details, and raw documents are stored securely in the database and object storage; only cryptographically generated hashes and state transitions are anchored to the blockchain.
3. **Audit Immutability**: The `audit_logs` table is append-only. No records may be deleted or updated in place.
4. **Referential Integrity**: Cascading deletes are prevented on critical entities (`claims`, `payments`, `audit_logs`) to prevent accidental destruction of compliance records.

---

### Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : has
    ROLES ||--o{ USER_ROLES : assigned_to
    USERS ||--o{ POLICIES : owns
    POLICIES ||--o{ CLAIMS : covers
    USERS ||--o{ CLAIMS : files
    CLAIMS ||--o{ CLAIM_DOCUMENTS : contains
    CLAIMS ||--o{ CLAIM_REVIEWS : reviewed_in
    CLAIMS ||--o{ PAYMENTS : pays
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ AUDIT_LOGS : performs
    CLAIMS ||--o{ BLOCKCHAIN_TRANSACTIONS : recorded_in
    PAYMENTS ||--o{ BLOCKCHAIN_TRANSACTIONS : settles_in

    USERS {
        string id PK
        string email UK
        string full_name
        string phone
        string password_hash
        string wallet_address
        string status
        datetime created_at
        datetime updated_at
    }

    ROLES {
        string id PK
        string name UK "CUSTOMER, CLAIM_REVIEWER, FINANCE, ADMIN"
        string description
    }

    USER_ROLES {
        string user_id PK, FK
        string role_id PK, FK
        datetime assigned_at
    }

    POLICIES {
        string id PK
        string policy_number UK
        string customer_id FK
        string insurance_type
        bigint coverage_amount "stored in integer units"
        bigint premium_amount "stored in integer units"
        date start_date
        date end_date
        string status "ACTIVE, PENDING, EXPIRED, CANCELLED, SUSPENDED"
        string terms_uri
        datetime created_at
        datetime updated_at
    }

    CLAIMS {
        string id PK
        string claim_number UK
        string policy_id FK
        string customer_id FK
        date incident_date
        string incident_type
        string location
        text description
        bigint requested_amount
        bigint approved_amount
        string status "SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, PAYMENT_PENDING, PAID"
        string reviewer_id FK
        string blockchain_tx_hash
        datetime created_at
        datetime updated_at
    }

    CLAIM_DOCUMENTS {
        string id PK
        string claim_id FK
        string storage_key
        string original_filename
        string mime_type
        bigint file_size
        string file_hash
        datetime created_at
    }

    CLAIM_REVIEWS {
        string id PK
        string claim_id FK
        string reviewer_id FK
        string decision "APPROVED, REJECTED"
        bigint approved_amount
        string reason
        text notes
        datetime created_at
    }

    PAYMENTS {
        string id PK
        string claim_id FK, UK
        string policy_id FK
        string customer_id FK
        bigint amount
        string status "PENDING, PROCESSING, SUCCESS, FAILED, REJECTED"
        string payment_method "FIAT_BANK_TRANSFER, CRYPTO_SMART_CONTRACT"
        string recipient_wallet
        string recipient_bank_account
        string blockchain_tx_hash
        datetime processed_at
        datetime created_at
    }

    BLOCKCHAIN_TRANSACTIONS {
        string id PK
        string tx_hash UK
        string network
        string action "CLAIM_RECORDED, CLAIM_APPROVED, CLAIM_REJECTED, PAYMENT_DISBURSED"
        string claim_id FK
        string payment_id FK
        string from_address
        string contract_address
        bigint block_number
        bigint gas_used
        string status "PENDING, CONFIRMED, FAILED"
        int confirmation_count
        datetime submitted_at
        datetime confirmed_at
    }

    NOTIFICATIONS {
        string id PK
        string user_id FK
        string title
        text message
        string type
        boolean read
        string link_url
        datetime created_at
    }

    AUDIT_LOGS {
        string id PK
        datetime timestamp
        string actor_id FK
        string actor_name
        string role
        string action
        string entity_type
        string entity_id
        string ip_address
        jsonb metadata
    }
```
