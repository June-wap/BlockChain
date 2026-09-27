# API Contract & Schema Specification
## Insurance Claim Processing System

This document specifies the exact REST API contract between the Frontend and Backend. All endpoints return JSON with consistent response envelopes and HTTP status codes.

---

### Standard Response Envelope

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3,
    "timestamp": "2026-09-28T00:00:00.000Z"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Requested amount ($5,000) exceeds maximum coverage limit ($3,000).",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2026-09-28T00:00:00.000Z"
  }
}
```

---

### 1. Authentication Domain

#### `POST /api/auth/register`
- **Role Required**: Public (Unauthenticated)
- **Description**: Registers a new user. Strictly creates accounts with role `CUSTOMER`.
- **Request Body**:
  ```json
  {
    "fullName": "Nguyen Van A",
    "email": "customer@example.com",
    "password": "SecurePassword123!",
    "phone": "+84 912 345 678",
    "walletAddress": "0x71C8366453AB548A31D08f237B855D282126B39a"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "usr_1727481234",
        "email": "customer@example.com",
        "fullName": "Nguyen Van A",
        "role": "CUSTOMER",
        "status": "ACTIVE"
      },
      "token": "jwt_usr_1727481234_..."
    }
  }
  ```
- **Error Codes**: `VALIDATION_FAILED` (400), `CONFLICT` (409)

#### `POST /api/auth/login`
- **Role Required**: Public
- **Description**: Authenticates user and returns capability flags and auth token. Sets HTTP-only cookies `auth_role` and `auth_token`.
- **Request Body**:
  ```json
  {
    "email": "reviewer@insurance.com",
    "password": "password123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "usr_reviewer_1",
        "email": "reviewer@insurance.com",
        "fullName": "Le Minh Reviewer",
        "role": "CLAIM_REVIEWER",
        "status": "ACTIVE"
      },
      "token": "jwt_usr_reviewer_1_...",
      "capabilities": ["canReviewClaims", "canApproveClaims", "canRejectClaims"]
    }
  }
  ```
- **Error Codes**: `VALIDATION_FAILED` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403 - Suspended), `RATE_LIMIT_EXCEEDED` (429)

#### `POST /api/auth/logout`
- **Role Required**: Authenticated
- **Description**: Clears session cookies and logs audit event.

#### `GET /api/auth/me`
- **Role Required**: Authenticated
- **Description**: Returns authenticated user profile and capability matrix.

---

### 2. Policies Domain

#### `GET /api/policies`
- **Role Required**: `CUSTOMER`, `CLAIM_REVIEWER`, `FINANCE`, `ADMIN`
- **Scoping**: Customers strictly view only their own policies.
- **Query Params**: `status` (`ALL`, `ACTIVE`, `EXPIRED`, `SUSPENDED`, `CANCELLED`), `search` (string)
- **Response `200 OK`**: Array of `PolicyDetail` objects.

#### `GET /api/policies/:id`
- **Role Required**: `CUSTOMER` (owns policy) or Staff/Admin
- **Response `200 OK`**: `PolicyDetail` with full coverage breakdown.
- **Error Codes**: `NOT_FOUND` (404), `FORBIDDEN` (403)

---

### 3. Claims Domain

#### `POST /api/claims`
- **Role Required**: `CUSTOMER`
- **Description**: Submits a new insurance claim in `SUBMITTED` state.
- **Request Body**:
  ```json
  {
    "policyId": "pol-101",
    "incidentDate": "2026-09-15",
    "incidentType": "Inpatient Hospitalization",
    "location": "Central Medical Hospital",
    "requestedAmount": 1850,
    "description": "Emergency hospitalization with acute surgical procedure.",
    "evidenceFiles": [
      {
        "fileName": "hospital_discharge.pdf",
        "fileUrl": "blob:...",
        "fileSize": 1450000,
        "mimeType": "application/pdf",
        "fileHash": "0x5f4dcc3b5aa765d61d8327deb882cf99..."
      }
    ],
    "idempotencyKey": "idem_12345"
  }
  ```
- **Response `201 Created`**: Complete `Claim` object.
- **Error Codes**: `VALIDATION_FAILED` (400), `FORBIDDEN` (403), `BUSINESS_RULE_VIOLATION` (422)

#### `GET /api/claims`
- **Role Required**: `CUSTOMER`, `CLAIM_REVIEWER`, `FINANCE`, `ADMIN`
- **Query Params**: `status`, `search`, `page`, `limit`

#### `GET /api/claims/:id`
- **Role Required**: `CUSTOMER` (owner) or Staff/Admin
- **Response `200 OK`**: Enriched claim with policy summary, reviews, payment, and blockchain transaction.

#### `POST /api/claims/:id/approve` (or `/api/staff/claims/:id/approve`)
- **Role Required**: `CLAIM_REVIEWER`, `ADMIN`
- **Request Body**:
  ```json
  {
    "approvedAmount": 1850,
    "notes": "Evidence verified against hospitalization coverage.",
    "version": 1,
    "idempotencyKey": "idem_appr_101"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "claim": { ... },
      "txHash": "0x98f2b..."
    },
    "message": "Claim approved successfully and recorded on-chain."
  }
  ```
- **Error Codes**: `CONFLICT` (409 - Concurrency conflict), `BUSINESS_RULE_VIOLATION` (422)

#### `POST /api/claims/:id/reject` (or `/api/staff/claims/:id/reject`)
- **Role Required**: `CLAIM_REVIEWER`, `ADMIN`
- **Request Body**:
  ```json
  {
    "reason": "Incident date falls outside policy coverage term.",
    "notes": "Reviewed and checked against terms.",
    "version": 1
  }
  ```
- **Response `200 OK`**: Updated `Claim` in `REJECTED` state.

#### `GET /api/claims/:id/evidence/:evidenceId`
- **Role Required**: `CUSTOMER` (owner) or Staff/Admin
- **Description**: Returns verified evidence metadata and download location.

---

### 4. Staff Queue & Review Domain

#### `GET /api/staff/claims`
- **Role Required**: `CLAIM_REVIEWER`, `FINANCE`, `ADMIN`
- **Query Params**: `status`, `insuranceType`, `search`, `page`, `limit`

#### `GET /api/staff/claims/:id/review`
- **Role Required**: `CLAIM_REVIEWER`, `ADMIN`
- **Description**: Returns complete review dossier: policy, customer-safe profile, evidence with hashes, prior claims history, automated validation checklist, and concurrency version.

---

### 5. Payments Domain

#### `GET /api/payments`
- **Role Required**: `CUSTOMER` (own payments only), `FINANCE`, `ADMIN` (all payments)
- **Query Params**: `status`, `page`, `limit`

#### `GET /api/payments/:id`
- **Role Required**: `CUSTOMER` (owner) or Finance/Admin

#### `POST /api/payments/:id/disburse`
- **Role Required**: `FINANCE`, `ADMIN` (STRICT: Customers cannot call)
- **Description**: Executes smart contract settlement and transitions claim to `PAID`.
- **Response `200 OK`**: `{ success: true, data: { payment, claim, txHash } }`

#### `POST /api/payments/:id/retry`
- **Role Required**: `FINANCE`, `ADMIN`
- **Description**: Reconciles on-chain state to prevent double-payment before re-submitting transaction.

---

### 6. Admin Domain

#### `GET /api/admin/dashboard`
- **Role Required**: `ADMIN`
- **Description**: Returns 8 KPIs, distribution series, trends, recent transactions, and recent audit activity.

#### `GET /api/admin/users` & `POST /api/admin/users/:id/status`
- **Role Required**: `ADMIN`
- **Description**: List users without exposing password hashes. Activate or suspend accounts with mandatory reason.

#### `GET /api/admin/staff` & `POST /api/admin/staff`
- **Role Required**: `ADMIN`
- **Description**: Manage staff members, onboard new staff, and adjust roles (`CLAIM_REVIEWER`, `FINANCE`, `ADMIN`).

#### `GET /api/admin/policies` & `POST /api/admin/policies`
- **Role Required**: `ADMIN`
- **Description**: System-wide policy oversight, creation, and status transitions (`ACTIVE`, `SUSPENDED`, `CANCELLED`).

#### `GET /api/admin/blockchain/dashboard`
- **Role Required**: `ADMIN`
- **Description**: Node telemetry, contract balance, transaction counts, degraded RPC fallback.

#### `GET /api/admin/blockchain/transactions`
- **Role Required**: `ADMIN`
- **Description**: Smart contract transaction ledger with block inspection, gas usage, and confirmations.

#### `GET /api/admin/audit-logs`
- **Role Required**: `ADMIN`
- **Description**: Append-only audit records filtered by actor, action, entity, and date.
