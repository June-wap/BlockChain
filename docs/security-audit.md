# Security Audit & Hardening Report
## Insurance Claim Processing System

### 1. Executive Summary
This document reports on the comprehensive security audit performed on the Insurance Claim Processing System backend, API routes, authentication framework, RBAC implementation, smart contract settlement layer, and database interactions.

---

### 2. Threat Vector Assessment & Classifications

| Threat Vector | Severity | Vulnerability Risk | Implemented Defense Mechanism | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Broken Access Control (IDOR)** | **CRITICAL** | Customer viewing or modifying another customer's policies, claims, or payment receipts. | Server-side `RbacGuard.assertOwnership(ownerId, currentUser)`. Every resource query checks the authenticated user identity against the record owner; customer query params cannot override session tokens. | **RESOLVED** |
| **Double Payout / Financial Drain** | **CRITICAL** | Reentrancy or repeated payment retry disbursing funds more than once. | 1. Database `UNIQUE` constraint on `payments.claim_id`.<br>2. Solidity `ReentrancyGuard` with Checks-Effects-Interactions pattern.<br>3. Blockchain service pre-flight reconciliation blocking duplicate broadcasts. | **RESOLVED** |
| **SQL Injection (SQLi)** | **HIGH** | Injection attacks via unescaped search strings or parameters. | All queries use parameterized statements (`$1, $2`) in PostgreSQL and typed Map keys in store models. No dynamic raw SQL string interpolation. | **RESOLVED** |
| **Authentication & Brute Force** | **HIGH** | Credential stuffing and password dictionary attacks. | `authRateLimiter` restricts login attempts to max 5 per minute per identifier. Passwords hashed using PBKDF2 (SHA-512) with 100,000 iterations and 16-byte random salts. Timing-safe comparisons prevent side-channel timing attacks. | **RESOLVED** |
| **Malicious File Upload** | **HIGH** | Uploading executable scripts (Web shells, SVG XSS) disguised as evidence. | 1. Strict whitelist of MIME types (`image/jpeg`, `image/png`, `application/pdf`, `image/webp`).<br>2. File size hard limit ($\le 10\text{MB}$).<br>3. File count cap ($\le 5$ files).<br>4. File name sanitization removing path traversal (`../`) and null bytes.<br>5. Deterministic SHA-256 hash stored in DB and anchored on-chain. | **RESOLVED** |
| **PII Leakage on Blockchain** | **HIGH** | Storing customer names, medical notes, or unencrypted evidence on-chain. | Smart Contract `InsuranceClaimHub.sol` stores ZERO PII. Strictly hashes (`claimHash`, `policyHash`, `evidenceRootHash`), recipient wallet address, integer currency amounts, and state enum integers. | **RESOLVED** |
| **Privilege Escalation** | **MEDIUM** | User passing `role=ADMIN` in registration or login requests. | 1. Registration endpoint strictly hard-codes `role = UserRole.CUSTOMER`. Client-provided roles are ignored.<br>2. Staff creation restricted to verified `ADMIN` callers via `RbacGuard.assertCanAdministerSystem`. | **RESOLVED** |
| **Credential & Secret Exposure** | **MEDIUM** | Passwords, private keys, or tokens appearing in audit logs or API payloads. | 1. `SecurityUtils.sanitizeMetadata` recursively strips all keys matching `password`, `secret`, `privatekey`, `token`, `jwt`.<br>2. User serialization explicitly strips `passwordHash` before returning responses. | **RESOLVED** |
| **Optimistic Concurrency Conflict** | **MEDIUM** | Two staff members approving/rejecting the same claim simultaneously. | Optimistic concurrency token `version` checked on mutations via `ClaimLifecycleEngine.assertVersionMatch(currentVersion, expectedVersion)`. Concurrent conflicting requests receive HTTP 409 Conflict. | **RESOLVED** |
| **Degraded RPC Availability** | **LOW** | Blockchain node offline or experiencing gas spikes crashing backend. | Graceful fallback mechanism in `BlockchainService.getTelemetry()` returns cached or degraded health state rather than throwing HTTP 500. | **RESOLVED** |

---

### 3. Security Hardening Best Practices Applied

1. **Defense in Depth**: Authorization is enforced both in API Route Handlers (via `RbacGuard`) and at the domain service layer (`PolicyService`, `ClaimService`, `BlockchainService`).
2. **Fail-Closed Principle**: If session tokens are missing, expired, or corrupted, access is immediately denied (`401 Unauthorized`).
3. **Immutable Audit Trail**: All financial actions, state changes, suspensions, and authentication events are logged to an append-only audit store with actor ID, IP address, and sanitized metadata.
