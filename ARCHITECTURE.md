# Pawnify — Architecture Overview

> This is a human-readable summary. For the exhaustive, source-cited, AI-oriented version — module-by-module breakdown, exact file/line citations, and known drift versus this document — see [`.agents/architecture.md`](.agents/architecture.md) and the rest of [`.agents/`](.agents/).

## What Pawnify is

Pawnify is a worldwide, multi-tenant pawn-loan / collateral lending management platform. Organizations (tenants) run one or more branches, onboard customers, issue loans against physical collateral (precious metals and other asset categories), track repayments through an atomic waterfall allocation, and maintain an immutable financial ledger. It supports configurable currencies, weight units (gram / troy ounce / tola), purity expressions (karat / millesimal fineness / percentage), and day-count conventions, rather than being hardcoded to any single jurisdiction.

It ships in two modes:

- **Self-hosted / open-source** — run your own instance against your own database, free for internal business use (see `LICENSE`).
- **Cloud SaaS** — a multi-tenant hosted offering with subscription billing (Dodo Payments), operated commercially.

## Repository layout

This is two independently-run projects in one repo, not a monorepo-tooled workspace:

```
pawnify/
├── backend/     NestJS API — new, partial (auth, cron, customers, health, market-rates, organizations, storage, webhooks)
├── web/         Next.js 15 App Router application — mature; still owns most business logic
│                (loans, payments, followups, billing, settings, staff, reports, dashboard)
├── .agents/     Detailed, source-cited AI-context documentation (start at AGENTS.md)
└── docker-compose.yml   Self-hosted stack: Postgres + backend + web
```

`backend/` and `web/` each have their own `package.json`, `package-lock.json`, and `.env`. There is currently no shared workspace tool (no Turborepo/Nx/pnpm workspaces) and no CI pipeline — see `.agents/roadmap.md` for the full list of gaps.

## Why two projects

Pawnify originally ran entirely as a single Next.js application (server actions, Prisma, Supabase — all in what is now `web/`). A standalone NestJS API (`backend/`) is being extracted to eventually own the REST surface and business logic independently of the frontend. That extraction is in progress: `backend/` currently covers auth, health, customers (search only), market rates, organizations (policy/team), storage, cron, and billing webhooks (Dodo Payments). Everything else — loans, payments, followups, billing logic, settings, staff management, reports, the dashboard — still lives in `web/`'s own server actions and service layer. See `.agents/decisions.md` (DEC-006 onward) for the fuller reasoning, and `.agents/backend.md` / `.agents/frontend.md` for what each side actually implements today.

## Core engineering invariants

These hold regardless of which side of the split code lives on:

1. **Decimal-only money and weight math.** Native JavaScript `Number`/floats are never used for principal, interest, fees, or precious-metal weights — always `Prisma.Decimal`.
2. **Atomic repayment waterfall.** A payment allocates to outstanding charges, then accrued interest, then principal, inside a single database transaction. Partial writes are treated as data-integrity incidents.
3. **Row-Level Security as the tenant boundary.** Every tenant-scoped table carries `organizationId` and is meant to be isolated via Postgres RLS policies (`backend/sql/rls_policies.sql`), keyed off a session variable set per request.
4. **Immutable ledger.** Every financial event (disbursement, payment, closure, item release) writes an append-only `LedgerEntry` row.

**Important:** as of this writing, invariant 3 is documented but not actually wired up at the application layer in several read paths — see `.agents/security.md` and the "Detected Issues Register" in `.agents/roadmap.md` before treating tenant isolation as a solved problem, especially if you're evaluating this for production SaaS use with real customer data.

## Tech stack

| Layer | `backend/` | `web/` |
| --- | --- | --- |
| Framework | NestJS 11 | Next.js 15 (App Router) |
| Database access | Prisma 7 + Supabase client | Prisma 7 (driver adapter) + Supabase client |
| Auth | JWT guard (validates better-auth/Supabase-issued tokens) | better-auth |
| Validation | class-validator DTOs | Zod |
| State/API (frontend) | — | Redux Toolkit Query |
| Testing | Jest | Vitest |

Full inventories, including exact package versions, are in `.agents/backend.md` and `.agents/frontend.md`.

## Where to go next

- **New to this repo, human or AI:** start at [`AGENTS.md`](AGENTS.md).
- **Setting up locally:** [`CONTRIBUTING.md`](CONTRIBUTING.md).
- **Deploying:** [`.agents/deployment.md`](.agents/deployment.md).
- **Every business rule the code actually enforces:** [`.agents/business-rules.md`](.agents/business-rules.md).
- **Known bugs, debt, and the full detected-issues register:** [`.agents/roadmap.md`](.agents/roadmap.md).
