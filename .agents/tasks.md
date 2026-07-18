# Pawnify Roadmap & Master Task List

## Phase 0 — Audit & Plan (Current)
- [x] Comprehensive code audit vs. README/ARCHITECTURE claims
- [x] Establish `.agents/` continuity structure (`context.md`, `tasks.md`, `lessons.md`, `schema.md`, `decisions.md`)
- [x] Deliver Phase 0 Implementation Plan & Audit Findings table
- [x] User review and approval of Phase 0 audit & open questions

## Phase 1 — Multi-Tenancy, Policies & RLS
- [x] Schema evolution: introduce `Organization`, `Branch`, `LoanPolicy`, `DocumentType`
- [x] Add `organizationId` to all domain models (`Customer`, `Loan`, `LoanItem`, `LoanCharge`, `Payment`, `LedgerEntry`, `FollowUp`, `KycDocument`)
- [x] Implement load-bearing Postgres Row-Level Security (RLS) policies for tenant isolation
- [x] Establish Supabase Client SDK path for tenant CRUD & keep Prisma for schema/migrations/service-role queries

## Phase 2 — Worldwide Feature Generalization & Onboarding
- [x] Dashboard & UI components: replace hardcoded ₹/INR with `LoanPolicy.currencySymbol` / `currencyCode`
- [x] Customer & KYC module: dynamic `DocumentType` list & masking rules replacing fixed Aadhaar/PAN enum
- [x] Loan builder & Valuation engine: configurable `WeightUnit` (Gram, Troy Ounce, Tola) and `PurityExpression` (Karat, Millesimal Fineness, Percentage)
- [x] Policy-driven LTV slabs & Mandatory ID enforcement in `createLoan` server logic
- [x] Interest engine: parameterized day-count convention (`ACTUAL_365`, `ACTUAL_360`)
- [x] Shared First-Run / Tenant Onboarding Wizard with policy presets (US, UK, India, Blank)

## Phase 3 — Public Marketing Website
- [x] Responsive landing page (`/`), pricing page (`/pricing`), open-source page (`/open-source`), docs shell (`/docs`), legal stubs (`/privacy`, `/terms`)
- [x] Premium domain-specific visual direction (assay stamps, hallmarks, ledger vernacular) distinct from generic fintech

## Phase 4 — Self-Hosting Packaging & Cloud SaaS Billing
- [x] Docker Compose setup & documented `.env.example`
- [x] Document both self-hosted Supabase stack and BYO Supabase Cloud project paths
- [x] Rewrite public `README.md` for OSS users, add `LICENSE` and `CONTRIBUTING.md`
- [x] Cloud SaaS layer: Stripe/MoR billing integration, server-side plan gating, platform operator dashboard

## Phase 5 — Hardening, Automated Testing & Compliance Audit
- [x] Extended Vitest suite: parameterized interest & LTV tests (`src/__tests__/jurisdiction.test.ts`)
- [x] RLS cross-tenant isolation verification (`src/__tests__/rls-isolation.test.ts`)
- [x] Full audit of financial copy & architectural decisions log (`.agents/decisions.md`)

## Phase 6 — Universal Worldwide Configuration & Multi-Asset Lending Platform
- [x] Universal Country & Currency Configuration Registry (`src/lib/config/jurisdictions.ts`)
- [x] Universal Multi-Asset Categories Registry (`src/lib/config/asset-categories.ts`) supporting Precious Metals, Watches, Fine Art, Vehicles, Luxury Goods, and General Collateral
- [x] Universal Interactive Asset Calculator Widget (`src/components/marketing/universal-asset-calculator.tsx`) on homepage
- [x] Setup Wizard enhanced with 10+ global country presets and custom jurisdiction rules (`/onboarding`)
- [x] Verified via `src/__tests__/universal-assets.test.ts` (28/28 Vitest tests passing)
