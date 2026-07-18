# Pawnify Project Context

## Overview
Pawnify is transitioning from a single-tenant, Indian-market-specific screening assignment into a production-grade, worldwide multi-tenant Pawn-Loan Broker Management Platform with both Self-Hosted (OSS) and Cloud (SaaS) deployment modes.

## Deployment Modes
1. **Self-Hosted / Open-Source**: Single operator running their own instance against their own database (Supabase self-hosted or BYO Supabase Cloud project).
2. **Cloud SaaS**: Multi-tenant subscription platform with isolated `Organization` tenants, multi-branch support, and platform operator billing/admin controls.

## Core Architectural Pillars
- **Multi-Tenancy Foundation**: `Organization` and `Branch` models top-to-bottom. Every tenant-scoped model (`Customer`, `Loan`, `LoanItem`, `LoanCharge`, `Payment`, `LedgerEntry`, `FollowUp`, `KycDocument`) carries `organizationId`.
- **Load-Bearing RLS**: Row-Level Security enforced at Postgres level. Tenant CRUD uses Supabase client SDK carrying authenticated JWTs; Prisma reserved for schema migrations and service-role cross-tenant admin operations.
- **Configurable Worldwide Rules Engine**: Replaces hardcoded Indian RBI slabs, ₹50,000 PAN rules, and fixed KYC enum with per-organization `LoanPolicy` and `DocumentType` models.
- **Precision & Safety Invariants**:
  - `Prisma.Decimal` arbitrary precision math for all monetary and weight calculations.
  - Atomic repayment waterfall (Charges -> Accrued Interest -> Principal Reduction) inside strict database transactions.
  - Immutable `LedgerEntry` financial audit trail.
