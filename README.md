# Insurance Claim Processing System

An enterprise-grade decentralized and role-based Insurance Claim Processing platform built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Web3/Smart Contract** readiness.

---

## 1. Tech Stack Overview

- **Package Manager**: `npm` (v11.17.0 on Node.js v24.19.0)
- **Frontend Framework**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + Lucide Icons
- **Backend Framework**: Next.js Route Handlers / API Services (`src/server/`) + Server Middleware
- **Database / ORM**: Prisma ORM compatible with PostgreSQL and SQLite
- **Security & RBAC**: Dual-layer Route Guards (Server-side Next.js Middleware + Client-side `RoleGuard` wrapper)
- **Testing**: Vitest (Unit testing formatting utilities, permission matrices, and guards)

---

## 2. Standardized Route Architecture

### Public & Authentication
- `/` — System overview, persona quick switcher, and portal shortcuts
- `/login` — Sign in with manual credentials or 1-click persona logins
- `/register` — Account creation with customer KYC and Web3 payout address

### Customer Portal (`CUSTOMER` role)
- `/customer/dashboard` — Policy overview, claim metrics, and recent activity
- `/customer/policies` — Active and historical insurance policies
- `/customer/policies/[id]` — Detailed policy terms, limits, and deductible conditions
- `/customer/claims` — Submitted claim lifecycle tracking
- `/customer/claims/new` — 3-step claim filing with evidence document upload
- `/customer/claims/[id]` — Claim assessment details, evidence inspection, and receipts
- `/customer/payments` — Premium payments and claim payout receipts
- `/customer/notifications` — Real-time lifecycle alerts
- `/customer/profile` — Personal KYC information and Web3 payout wallet

### Staff Operations Desk (`CLAIM_REVIEWER`, `FINANCE`, `ADMIN` roles)
- `/staff/dashboard` — Operational metrics, priority claims queue
- `/staff/claims` — Assessment queue for incoming claims
- `/staff/claims/[id]/review` — Detailed claim assessment, evidence validation, and approve/reject decision
- `/staff/policies` — Policy verification registry
- `/staff/customers` — Customer directory and risk profiling
- `/staff/payments` — Payout queue for finance officers

### Admin Console (`ADMIN` role)
- `/admin/dashboard` — Global telemetry, system metrics, and governance shortcuts
- `/admin/users` — User management and customer directory
- `/admin/staff` — Staff roster and permission provisioning
- `/admin/policies` — Master policy product configurations
- `/admin/claims` — Global claims oversight and override capabilities
- `/admin/payments` — Liquidity pool reserves and settlement reconciliations
- `/admin/blockchain` — EVM node status, contract pause states, and oracle feeds
- `/admin/transactions` — Immutable on-chain ledger explorer
- `/admin/audit-logs` — Tamper-evident security and RBAC audit logs
- `/admin/settings` — System parameters, automated payout thresholds, and webhooks

---

## 3. Shared Layout & Route Guard Architecture

- **`PortalShell`** (`src/components/layout/PortalShell.tsx`): Reusable, responsive dashboard shell for desktop sidebar, mobile navigation drawer, header with live role switcher, notifications, and profile controls.
- **`RoleGuard`** (`src/components/layout/RoleGuard.tsx`): Client-side RBAC protection providing loading states, unauthorized 403 access denial screens, and automatic redirection to default role dashboards.
- **`Middleware`** (`src/middleware.ts`): Server-side Next.js edge route protection that validates authentication and prevents unauthorized cross-role portal access.

---

## 4. Shared Types & Centralized Utilities

- **Domain Enums** (`src/types/index.ts`):
  - `UserRole`: `CUSTOMER`, `CLAIM_REVIEWER`, `FINANCE`, `ADMIN`
  - `PolicyStatus`: `ACTIVE`, `PENDING`, `EXPIRED`, `CANCELLED`, `SUSPENDED`
  - `ClaimStatus`: `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `PAYMENT_PENDING`, `PAID`
  - `PaymentStatus`: `PENDING`, `PROCESSING`, `SUCCESS`, `FAILED`, `REJECTED`
- **Centralized Formatters** (`src/lib/formatters.ts`):
  - `formatCurrency()`: USD, VND, ETH, USDC formatting
  - `formatDate()`, `formatRelativeTime()`: ISO date strings and human-readable relative time
  - Visual status configurations (`getClaimStatusConfig`, `getPolicyStatusConfig`, `getPaymentStatusConfig`, `getRoleConfig`) with badge classes, dot indicators, and descriptions

---

## 5. Development & Testing Commands

```bash
# Run unit tests
npm test

# Run code linter
npm run lint

# Build production bundle
npm run build

# Start development server
npm run dev
```
