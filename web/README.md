# Pawnify — Institutional Open-Source Collateral & Asset Lending Platform

<div align="center">
  <h3>The Operational Standard for Physical Collateral &amp; Precious Metals Lending</h3>
  <p>
    <b>Multi-Tenant PostgreSQL RLS</b> • <b>4-Decimal Micro-Weight Precision</b> • <b>Atomic Waterfall Accounting</b> • <b>Worldwide Presets</b>
  </p>
</div>

---

## Overview

**Pawnify** is an institutional-grade, open-source asset finance and collateral lending platform. Built with **Next.js 15 (App Router)**, **PostgreSQL (Supabase)**, **Prisma ORM**, and **Row-Level Security**, Pawnify models physical collateral workflows with exact mathematical precision, ACID transaction safety, and worldwide regulatory adaptability.

---

## Architecture & Engineering Pillars

1. **Load-Bearing PostgreSQL Row-Level Security (RLS)**
   Multi-tenancy is enforced inside PostgreSQL via session-scoped variables (`app.current_organization_id`). Tenant isolation is guaranteed at the database layer.
2. **Prisma Decimal Engine (Zero JavaScript Floats)**
   Native JavaScript floating-point numbers (`Number`) are strictly forbidden. All monetary balances use arbitrary-precision `Decimal`. Precious metal weights are tracked to 4 decimal places (`@db.Decimal(10, 4)`) across Grams, Troy Ounces, and Tolas.
3. **Atomic Payment Waterfall Allocations**
   Every payment executes inside an atomic database transaction (`prisma.$transaction`). Funds cascade strictly through outstanding charges, accrued simple interest, and remaining principal with immutable double-entry ledger records.
4. **Worldwide Jurisdiction Presets**
   - **United States**: USD (`$`), Grams/Troy Ounces, Karat purity, Actual/360 day count.
   - **United Kingdom**: GBP (`£`), Grams, Millesimal Fineness (`999`), Actual/365 day count.
   - **India**: INR (`₹`), Grams, Karat purity, Tiered LTV slabs (85% / 80% / 75%).

---

## Self-Hosting Quickstart (Docker Compose)

Pawnify is free to self-host for internal business operations under the **Business Source License 1.1** (converts to open-source MIT after 3 years).

```bash
# 1. Clone repository
git clone https://github.com/pawnify/pawnify.git && cd pawnify

# 2. Copy configuration template
cp .env.example .env

# 3. Launch PostgreSQL & Pawnify via Docker Compose
docker-compose up -d --build

# 4. Access the platform
open http://localhost:3000
```

---

## Running Locally for Development

```bash
# Install dependencies
npm install

# Run migrations & seed worldwide multi-tenant presets
npx prisma migrate deploy
npm run db:seed

# Start development server
npm run dev
```

---

## Testing & Verification

Pawnify maintains a comprehensive Vitest unit test suite verifying:
- Atomic repayment waterfall allocations
- Multi-unit valuation & purity factor conversions
- Parameterized Actual/365 and Actual/360 interest accrual

```bash
npm test
```

---

## Licensing

Pawnify is distributed under the **Business Source License 1.1** (`LICENSE`). You may self-host and modify Pawnify for internal lending operations at no charge. Commercial offering of Pawnify as a managed cloud service by third parties requires a commercial license agreement.
