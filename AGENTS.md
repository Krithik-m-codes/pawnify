# Pawnify — Monorepo Agent Guide (AGENTS.md)

Primary onboarding document for any AI agent (or human) opening this repository for the first time. It is a condensed synthesis of twelve companion documents under .agents/ — architecture.md, backend.md, frontend.md, database.md, api.md, business-rules.md, coding-standards.md, security.md, deployment.md, testing.md, roadmap.md, glossary.md — plus a rewritten .agents/decisions.md. Every section below states the load-bearing facts and points to the relevant .agents/ file for full depth, exact line numbers, and reproduction steps. Do not treat brevity here as license to skip the linked file when precision matters — in particular before touching authentication, money math, or tenant scoping.

Five other files under .agents/ — context.md, lessons.md, schema.md, tasks.md, and the pre-existing version of decisions.md — are pre-restructure historical notes describing this codebase before backend/ existed, when it was a single flat-layout Next.js application. They may be stale relative to current code and relative to the document set above. Current source code is authoritative; every place this document set found a conflict between those notes and current code, the conflict is called out inline in the relevant .agents/ file rather than silently resolved. .agents/decisions.md has been rewritten to preserve its still-valid historical entries (DEC-001 through DEC-005) while adding new entries (DEC-006 onward) documenting the backend/ extraction; the other four historical files have not been similarly updated and should be read with more skepticism than anything cited below.

## 1. Project Overview, Business Purpose, Target Users

Pawnify is a multi-tenant pawn-loan / asset-backed lending platform (architecture.md §1; glossary.md scope note; roadmap.md subsystem convention). It manages the full lifecycle of a collateral-backed loan: customer onboarding and KYC/identity verification, collateral valuation (primarily gold and silver, priced per gram against live spot rates) and tiered loan-to-value (LTV) capping, loan disbursement, simple daily interest accrual, a strict repayment waterfall, loan closure, and physical collateral release — plus supporting operations: staff and role management, follow-up/collections tasks, billing-plan quotas for a Cloud SaaS offering, and portfolio dashboards/reports (business-rules.md §§2-8; glossary.md §§4-8).

Business purpose: let a pawn-broking or asset-lending business run its entire loan book digitally, either self-hosted at no cost under the repository's license, or as a paid Cloud SaaS product with tiered active-loan and branch quotas (decisions.md DEC-002, DEC-004; business-rules.md §7; glossary.md §8). The Licensed Work name in the root LICENSE file, "Pawnify Institutional Collateral & Asset Lending Platform," and a partially-built worldwide jurisdiction/currency/weight-unit configuration layer (12 jurisdiction presets, 6 generic asset categories beyond precious metals) indicate an ambition beyond a single-country pawn shop, though in practice the enforced loan-creation path today only supports gold/silver collateral and several India-specific defaults (mobile-number format, PAN document type, ₹ symbol in ledger text) leak into the "worldwide" runtime regardless of an organization's configured currency (glossary.md §§3, 10-11; business-rules.md §10.7).

Target users: pawn-shop or lending-business staff (STAFF role) who record loans, payments, and follow-ups; branch managers and organization admins/owners (BRANCH_MANAGER, ADMIN, OWNER roles) who configure lending policy and manage staff; and, for the Cloud SaaS path, a platform-operator concept (PLATFORM_OPERATOR role) with a cross-tenant billing-administration surface. In practice only ADMIN is meaningfully checked anywhere in web/'s authorization code — BRANCH_MANAGER and PLATFORM_OPERATOR are declared Role enum values with no observed authorization branch anywhere in either subsystem, and web/'s platform-admin page currently has essentially no working role gate at all (see §15) (glossary.md §1; business-rules.md §9.2; frontend.md §3.4).

## 2. Current Maturity — Read This Before Making Changes

This is a monorepo mid-migration between two independently-versioned npm projects joined only by convention: no root package.json, no turbo.json/nx.json/pnpm-workspace.yaml/lerna.json, and no CI of any kind (no .github directory anywhere) (architecture.md §0; roadmap.md §1; deployment.md §5).

- web/ is the mature, feature-complete subsystem: a Next.js App Router application (Prisma, Supabase-hosted Postgres, better-auth, Redux Toolkit Query) holding essentially all of Pawnify's real business logic — loans, payments, interest, valuation, follow-ups, billing, settings, staff, reports, dashboard (architecture.md §3.2; backend.md "What backend/ does not yet implement").
- backend/ is a new, partial NestJS 11 API. It implements exactly 8 feature modules — auth, cron, customers, health, market-rates, organizations, storage, webhooks (directly confirmed: backend/src/modules contains exactly these 8 directories, and backend/src/app.module.ts imports all 8 as Nest modules alongside ConfigModule and DatabaseModule). Framing elsewhere describing backend/ as having "7 modules" is a confirmed miscount against this verified list of 8 — treat 8 as ground truth (backend.md scope note; frontend.md §1; api.md scope note; roadmap.md subsystem convention). backend/ does not replace web/'s business logic; it duplicates thin, partially-overlapping slices of it (customer typeahead search, market rates, organization policy/team endpoints) while web/'s own richer implementations of the same domains keep running independently (architecture.md §0, §3.1).
- Do not assume web/'s server-side logic is deprecated just because backend/ exists, and do not describe backend/ as a complete API in anything you write. Verify what is actually still in use before claiming a migration is finished (backend.md; frontend.md §8).
- Neither subsystem currently builds or boots successfully as committed to this working tree:
  - backend/ cannot boot at all. Its PrismaService (backend/src/database/prisma.service.ts) subclasses PrismaClient with no constructor override, backend/prisma/schema.prisma's datasource block declares no url, and backend/ has neither an @prisma/adapter-pg dependency nor a prisma.config.ts. This was reproduced directly, independently, across multiple of the companion documents: npm run build (nest build) succeeds, but node dist/main.js crashes immediately with PrismaClientInitializationError during Nest's dependency-injection phase, before any route becomes reachable — because DatabaseModule is globally and eagerly imported (backend.md "Status headline"; api.md "Critical operational caveat"; business-rules.md §11.1; deployment.md §6.2; testing.md §3.2; roadmap.md §1).
  - web/'s own build is separately broken. web/package.json pins Next.js at "^9.3.3" and the installed package resolves to that exact pre-App-Router version, while web/src/app is a complete App Router tree (route groups, Server Actions, a Route Handler, Promise-based dynamic params) that requires Next.js 13+/15+. Reproduced directly: npx next build fails immediately with "Configuring Next.js via 'next.config.ts' is not supported. Please replace the file with 'next.config.js'." Git history (git show HEAD:package.json, from before the restructure) shows the previously-committed pin was 16.2.10, matching web/package.json's still-present eslint-config-next devDependency at exactly 16.2.10 — strong evidence this is an uncommitted regression, not an intentional downgrade (frontend.md §2; architecture.md §15; deployment.md §6.1; roadmap.md §1). Separately, prisma generate also fails in web/ (Prisma error P1012, missing datasource url) even though web/prisma.config.ts attempts an override (deployment.md §6.1).
  - docker-compose.yml at the repository root does not build either service correctly (see §7).
- None of this — the backend/+web/ split, docker-compose.yml, .agents/, LICENSE, or CONTRIBUTING.md — has ever been committed to git on any branch as of this writing; HEAD still reflects the pre-restructure single-app flat layout (deployment.md §2; decisions.md provenance note; architecture.md §15). Whatever is actually deployed in production today, if anything, necessarily differs from what is described in this document set, since none of it is in version control yet.

## 3. Folder Structure

```
pawnify/                        repo root — no root package.json, no CI, no monorepo tool
├── .agents/                    AI-agent context docs — see §18 for the full map
├── AGENTS.md                   this file
├── ARCHITECTURE.md             root-level architecture doc, predates the .agents/ set; its §6.1-§6.4 financial-math
│                               subsections are still cited by code comments in web/src/lib/services (see §10, §15)
├── CLAUDE.md                   one line: "@AGENTS.md" — delegates to this file
├── CONTRIBUTING.md             contributor guide; states a "Non-Negotiable Core Engineering Principles" list,
│                               numbered #1-#4 (see §15 — code cites a "#5" that does not exist here)
├── LICENSE                     Business Source License 1.1, converts to MIT on 2029-07-01 (see §15)
├── docker-compose.yml          defines "db" + "app" services only; broken as committed (see §7)
│
├── backend/                    NEW, PARTIAL — NestJS 11 API, intended port 3001, prefix /api — CANNOT BOOT TODAY
│   ├── src/
│   │   ├── main.ts                bootstrap: global prefix, ValidationPipe, exception filter, logging interceptor,
│   │   │                          wide-open CORS, Swagger mounted at /docs with no guard
│   │   ├── app.module.ts          root module — ConfigModule + DatabaseModule (both @Global) plus 8 feature modules
│   │   ├── config/                 ConfigModule + configuration.ts (models only 5 keys; most feature env vars are
│   │   │                          read via bare process.env elsewhere, bypassing ConfigService)
│   │   ├── database/                PrismaService (broken, see §2) + SupabaseService (raw pg Pool + Supabase JS client)
│   │   ├── common/                   AllExceptionsFilter, LoggingInterceptor
│   │   └── modules/
│   │       ├── auth/                  validates web/'s better-auth sessions or a Supabase JWT — issues no credentials
│   │       ├── customers/             GET /customers/search only — no organizationId filter (cross-tenant leak)
│   │       ├── health/                GET /health (DB connectivity probe)
│   │       ├── market-rates/          GET /market-rates + refresh logic used by cron/ — independently duplicates
│   │       │                          web/'s own copy, already behaviorally diverged
│   │       ├── organizations/         LoanPolicy + team RBAC endpoints — guard chain broken (2 routes fully
│   │       │                          unauthenticated, 4 routes always return 401)
│   │       ├── storage/                POST /storage/upload → Supabase Storage — no size/mimetype validation
│   │       ├── cron/                   GET/POST /cron/update-rates — fails open if CRON_SECRET is unset
│   │       └── webhooks/               POST /webhooks/dodo-payments — real signature verification (migrated from Stripe)
│   ├── prisma/schema.prisma        byte-identical copy of web/prisma/schema.prisma — no datasource url
│   ├── prisma/seed.ts               byte-identical copy of web/prisma/seed.ts, but its relative import does not
│   │                                resolve inside backend/'s own, much thinner src/ layout
│   ├── sql/rls_policies.sql         Postgres Row-Level Security policies — not armed by any application code today
│   └── (no Dockerfile, no CI config, no db:* npm scripts, no prisma.config.ts)
│
└── web/                          MATURE — Next.js App Router, intended port 3000 — own build currently broken
    ├── src/app/                    route tree: 6 public marketing pages, (auth)/login, (app)/* (14 routes behind
    │                              one shared session gate), api/auth/[...all] (the only Route Handler)
    ├── src/lib/
    │   ├── auth.ts, auth-client.ts, auth/session.ts    better-auth — the ONLY sign-in system in the product
    │   ├── db.ts                   ambient PrismaClient (pg Pool + @prisma/adapter-pg) + runSerializable() helper
    │   ├── redux/                   store.ts (1 reducer key: RTK Query) + api/*.ts (10 slices, 40 endpoints,
    │   │                           hybrid url-vs-action dispatch — see §5)
    │   ├── services/                 loans, payments, interest, valuation, customers, billing, dashboard,
    │   │                           market-rates, settings — the actual business-logic core
    │   ├── validation/                Zod schemas (customer, loan, payment) — India-specific formats hardcoded
    │   ├── config/                    jurisdictions.ts, asset-categories.ts — onboarding/marketing scaffolding,
    │   │                            mostly unconsulted by loan-creation enforcement code
    │   ├── supabase/, supabase-storage.ts    ORPHANED — zero callers anywhere in web/src
    │   └── axiosClient.ts             axios client → backend/'s REST API (used by 9 of 40 RTK Query endpoints)
    ├── prisma/schema.prisma           byte-identical copy of backend/prisma/schema.prisma
    ├── Dockerfile                     the ONLY Dockerfile in the whole repository
    ├── vercel.json                     stale cron entry for a route that no longer exists in web/
    └── next.config.ts                  empty config object; also incompatible with the Next.js version
                                        currently pinned in package.json
```

Full annotated tree with line-by-line file citations: .agents/architecture.md §1; per-module backend/ detail: .agents/backend.md; per-route/component web/ detail: .agents/frontend.md.

## 4. Architecture Summary

Two independent npm projects, no monorepo tooling, joined by convention plus one hybrid dispatch layer in web/. web/'s Redux Toolkit Query base query (web/src/lib/redux/api/baseApi.ts, hybridAxiosBaseQuery) branches per-endpoint: if an endpoint declares a url, it makes a real HTTP call to backend/ through axiosClient; if it declares an action, it calls a pre-existing Next.js Server Action in-process, no network hop at all. Of 40 RTK Query endpoints across 10 slices, 9 target backend/ (customersApi's searchCustomers; marketRatesApi's 2 endpoints; organizationsApi's 6 endpoints) and 31 remain in-process calls into web/'s own Server Actions (architecture.md §3.2; frontend.md §8.1; coding-standards.md §4.2). This is literally the migration mechanism in effect today — a "strangler fig" pattern where individual endpoints are cut over to backend/ one at a time without changing calling components — but it is only partially exercised: of the 9 backend/-routed endpoints, only 3 have a confirmed live UI caller (searchCustomers, getMarketRates, refreshMarketRates); organizationsApi's 6 endpoints are fully wired end-to-end but have zero callers anywhere in web/'s UI (architecture.md §13.1; decisions.md DEC-006).

Authentication: better-auth (web/src/lib/auth.ts, backed by a Prisma adapter against web/'s own Postgres tables) is the sole identity/session issuer in the entire product. Supabase Auth is never used for sign-in anywhere in web/ — a repository-wide search finds zero calls to any Supabase Auth sign-in method. backend/ never issues credentials of its own; its JwtAuthGuard (backend/src/modules/auth/guards/jwt-auth.guard.ts) extracts a bearer token or the literal better-auth.session_token cookie, then AuthService.validateToken (backend/src/modules/auth/auth.service.ts) first checks that token against the shared session table via raw SQL (backend/src/modules/auth/auth.repository.ts) and only falls back to verifying a genuine Supabase-issued JWT if that lookup misses. JWT_SECRET is declared in backend/.env.example but has zero references anywhere in backend/src — it is dead configuration, not a live verification mechanism, despite the guard's name (architecture.md §8; backend.md "Authentication"; glossary.md §2).

Database: one conceptual Postgres database, two byte-for-byte-identical, independently hand-maintained Prisma schema files (web/prisma/schema.prisma, backend/prisma/schema.prisma — 17 models, 12 enums, confirmed identical via direct diff). Neither subsystem has a prisma/migrations directory; schema changes are applied via prisma db push (web/package.json has a db:push script; backend/package.json has none of its own). No tooling keeps the two schema copies in sync — a change applied to one and not the other will silently desynchronize the two Prisma Clients against the same physical tables (architecture.md §2, §14; decisions.md DEC-008).

Tenant isolation: backend/sql/rls_policies.sql enables Postgres Row-Level Security on 12 tenant tables, gated by a current_user_organization_id() SQL helper reading a app.current_organization_id session setting (falling back to a Supabase auth.uid() lookup). The one application-level function that arms that session setting, runWithTenantContext (web/src/lib/supabase/server.ts), has zero callers anywhere in the repository. Neither subsystem's ambient Prisma/pg connection ever sets this variable on any live query path. Whether RLS has any real effect therefore depends entirely on which Postgres role the deployed DATABASE_URL connects as (a table-owner/superuser role bypasses RLS regardless of policy content, and backend/.env.example's sample connection string authenticates as the postgres role) — this is Unknown from source alone. Tenant isolation today depends almost entirely on explicit organizationId filters written directly into application code, and several read paths are confirmed to be missing that filter entirely (see §15, §16) (architecture.md §9.4; security.md "Row-Level Security as the Tenant-Isolation Boundary"; glossary.md §1).

Migration status by domain: loans, payments, follow-ups, billing enforcement, settings, staff, reports, and dashboard exist only in web/ — backend/ has no equivalent module for any of them. Customer search, market-rate fetch, and organization-policy/team management exist in both subsystems as separate, non-communicating implementations, and two of the three have already measurably diverged in behavior (see §16) (architecture.md §13.1).

Full request/data flows, the complete module dependency graph, and the layered-architecture breakdown per subsystem: .agents/architecture.md. Every backend/ module and guard in full detail: .agents/backend.md. Every web/ route, component, and hook: .agents/frontend.md. Full HTTP/Server Action endpoint inventory: .agents/api.md. Full data model and enum reference: .agents/database.md (schema-level detail) and .agents/glossary.md (domain-term reference).

## 5. Tech Stack

### backend/ (NestJS 11, partial)

| Package | Version | Notes |
|---|---|---|
| @nestjs/common, @nestjs/core, @nestjs/platform-express | ^11.0.1 | (backend/package.json) |
| @nestjs/config | ^4.0.4 | Only 5 keys modeled in configuration.ts; most feature env vars bypass it via bare process.env reads (backend.md "Configuration and environment variables") |
| @nestjs/swagger | ^11.4.5 | Real, hand-written OpenAPI docs mounted at /docs, no guard, no CLI plugin registered (backend.md) |
| @prisma/client | ^7.8.0 | No datasource url, no adapter — cannot construct a connection as committed (see §2) |
| prisma (CLI, devDependency) | ^6.19.3 | Cross-major mismatch against @prisma/client ^7.8.0 (coding-standards.md §3; testing.md §3.2 notes web/ has the identical pairing without this specific boot failure, weighing against the version split itself being the operative cause) |
| @supabase/supabase-js | ^2.110.2 | Used narrowly: Supabase Auth JWT fallback verification and Storage uploads only |
| pg | ^8.22.0 | Raw connection pool inside SupabaseService, used for hand-written SQL (session lookups) — not wired to PrismaService |
| class-validator, class-transformer | — | Enforced globally via one ValidationPipe (whitelist, transform, forbidNonWhitelisted); coverage across DTOs is inconsistent (see §12, §16) |
| Jest | — | Config present (embedded unit config + separate e2e config); zero *.spec.ts files exist anywhere; the one e2e test is unmodified NestJS scaffold and currently fails (testing.md §3) |

No @nestjs/schedule, no Bull/BullMQ, no passport/passport-jwt, and no rate-limiting package exist anywhere in backend/package.json (backend.md; security.md "Rate Limiting"). The `stripe` SDK was never a dependency and still isn't — the billing webhook now uses the `dodopayments` SDK instead (see §12).

### web/ (Next.js, mature)

| Package | Version | Notes |
|---|---|---|
| next | declared "^9.3.3"; package-lock.json and installed node_modules resolve to exactly 9.3.3 | Predates the App Router entirely; contradicts the App-Router codebase and the still-present eslint-config-next devDependency (see §2) |
| eslint-config-next (devDependency) | 16.2.10 (no caret) | Internally inconsistent with the next pin above; matches the pre-restructure committed package.json exactly (frontend.md §2) |
| react, react-dom | 19.2.4 | (frontend.md §2) |
| @prisma/client | ^7.8.0 | Same major version as backend/'s client, but web/ actually wires a driver adapter (below), so it connects successfully |
| @prisma/adapter-pg | present | Used by web/src/lib/db.ts to construct new PrismaClient({adapter}) against a pg.Pool built from DATABASE_URL — the pattern backend/ lacks |
| better-auth | ^1.6.23 | Sole identity provider (api.md §1.1) |
| @better-auth/prisma-adapter | declared dependency | Zero import references anywhere in web/src — the code uses the subpath bundled inside the main better-auth package instead (business-rules.md §9.6) |
| Redux Toolkit + RTK Query | — | 1 reducer key total (the RTK Query slice); 10 API slice files, 40 endpoints (see §4) |
| Zod | ^4.4.3 | Server-side validation "source of truth" per its own header comment; not used with react-hook-form — every form is plain controlled React state (frontend.md §9) |
| Tailwind CSS | v4 | No tailwind.config.js/ts; theming via a light/dark class toggle on documentElement plus CSS custom properties, not Tailwind's dark: variant (frontend.md §4.1) |
| Vitest | — | environment: "node"; 7 test files, 28 tests, all passing when executed — see §16 for coverage caveats (testing.md §2) |
| @tanstack/react-table | — | Backs the shared DataTable component (frontend.md §4.2) |
| recharts, framer-motion | — | Dashboard charts (frontend.md §5.1) |
| class-variance-authority + @radix-ui/react-dialog | — | Design-system primitives; @radix-ui/react-slot, react-dropdown-menu, react-tabs, react-tooltip are installed but never imported anywhere (frontend.md §4.2) |
| axios | — | axiosClient.ts, the only path from web/'s browser code to backend/'s REST API |
| bcryptjs, @types/bcryptjs | declared dependency | Zero call sites anywhere in web/src — better-auth handles password hashing internally (security.md "Secrets Management") |
| date-fns | — | Calendar-day interest accrual math (differenceInCalendarDays) |
| lucide-react | ^1.23.0 | Icon set |

Full version-contradiction evidence and every dependency's exact call-site count: .agents/frontend.md §2; .agents/coding-standards.md §§2-3.

## 6. Local Development — How to Actually Run This Today

docker-compose.yml does not work as committed. It defines only db and app services — no service exists for backend/ at all. Its app service builds from a root-level context/Dockerfile that does not exist (the only Dockerfile in the repository is web/Dockerfile); its db service mounts ./sql/rls_policies.sql, a path that does not exist at the repo root (the real file is backend/sql/rls_policies.sql). Even if those paths were corrected, the environment variables it injects are only available at container start time, not at Docker build time, so prisma generate/next build inside the image would still fail to see them; it also sets a variable named APP_URL while web/'s code reads NEXT_PUBLIC_APP_URL exclusively (three call sites: web/src/lib/auth-client.ts, web/src/lib/auth.ts, web/src/app/layout.tsx) — a naming mismatch that silently falls back to a hardcoded default either way; and web/next.config.ts never sets output: "standalone", so web/Dockerfile's runner-stage copy of .next/standalone would fail regardless (deployment.md §3.3).

Before either app will build at all, these code-level defects need to be addressed:

1. web/'s Next.js pin. web/package.json currently declares "next": "^9.3.3"; this must be corrected (16.2.10, matching the still-present eslint-config-next devDependency and pre-restructure git history, is the strongest available signal for what it should be) before next build or next dev can succeed against the App Router codebase in web/src/app (deployment.md §16 item 3; frontend.md §2).
2. web/prisma/schema.prisma's datasource block has no url. web/prisma.config.ts attempts to supply one from DIRECT_URL or DATABASE_URL for the Prisma CLI, but neither variable is defined in web/.env, web/.env.example, or web/.env.prod — prisma generate fails with error P1012 even with a syntactically valid dummy connection string supplied via the environment, ruling out "just set the env var" as a fix; the schema itself needs a url (or the override mechanism needs to actually work) (deployment.md §6.1, §16 item 2).
3. backend/'s PrismaService cannot construct a client at all. It needs either a static datasource url in backend/prisma/schema.prisma or a driver-adapter pattern mirroring web/src/lib/db.ts (which would also require adding @prisma/adapter-pg as a dependency, currently absent from backend/package.json) before node dist/main.js (or npm run start:dev) can get past NestJS's dependency-injection phase (backend.md "Database access layer"; deployment.md §16 item 8).

Once those are addressed, the realistic local-dev recipe is two separate terminals, each subsystem run independently from its own directory, each with its own populated .env file:

- backend/.env needs: PORT (default 3001), API_PREFIX (default api), NODE_ENV, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, CRON_SECRET, DODO_PAYMENTS_API_KEY, DODO_PAYMENTS_WEBHOOK_KEY, DODO_PAYMENTS_ENVIRONMENT (these three replaced STRIPE_WEBHOOK_SECRET when the billing webhook migrated from Stripe to Dodo Payments — note backend/.env.prod has not been updated to the new names yet and still declares the old STRIPE_WEBHOOK_SECRET, a currently-live inconsistency). JWT_SECRET is declared in backend/.env.example but is dead configuration — do not expect setting it to do anything (backend.md "Configuration and environment variables"; security.md "Secrets Management").
- web/.env needs: NEXT_PUBLIC_API_URL and/or NEXT_PUBLIC_BACKEND_URL (pointing at backend/'s host, defaulting to http://localhost:3001/api), NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, BETTER_AUTH_SECRET, BETTER_AUTH_URL. Critically, none of web/.env, web/.env.example, or web/.env.prod define DATABASE_URL or DIRECT_URL at all, despite web/src/lib/db.ts and web/prisma.config.ts both reading those variables unconditionally at runtime and at CLI time respectively — this must be supplied out-of-band from whatever Postgres instance you actually intend web/ to use (architecture.md §2; deployment.md §4.2, §15). NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_DEMO_MODE are also read by web/ code (auth-client.ts, auth.ts, layout.tsx, and the login page's demo-credentials panel respectively) but are undocumented in web/.env.example — set them explicitly if you need better-auth's trusted-origins list or the demo UI to behave predictably (deployment.md §3.3, §4.2).
- Run npm install && npm run build && npm run start:dev (or the equivalent) separately in backend/ and in web/. There is no single root-level command that starts both; there is no npm workspace or monorepo tool to invoke instead (deployment.md §6; roadmap.md §1).
- If backend/ still cannot connect once DATABASE_URL is set, remember it is Unknown/unconfirmed from source whether SupabaseService (backend/src/database/supabase.service.ts) or PrismaService can actually reach Postgres at all — this repository's own documents only confirm the PrismaClient construction failure, not that a fix resolves it end-to-end, since no source-modifying verification was performed while drafting these docs (backend.md "Open questions"; testing.md §9).

Full remediation checklist (11 ordered items) and every individually-reproduced failure: .agents/deployment.md §§3, 6, 16.

## 7. Deployment

No path in this repository takes a fresh clone to a running production instance of either subsystem today — self-hosted or cloud-hosted (deployment.md §1).

- Vercel (web/ only): the only Vercel-specific artifact is web/vercel.json, containing a single Cron entry (daily, targeting /api/cron/update-rates). No route matching /api/cron/* exists anywhere under web/src/app/api today — the only route there is the better-auth catch-all (api/auth/[...all]/route.ts). Whatever Vercel deployment this cron entry was written for would build via the same broken build script as everywhere else (prisma generate && next build), so it would fail regardless of dashboard environment-variable configuration (deployment.md §6.1, §7.1, §11).
- docker-compose.yml (whole stack): broken as described in §6, and defines no service for backend/ at all (deployment.md §3, §16).
- backend/ standalone: compiles cleanly (nest build succeeds) but has no Dockerfile, no CI, and no PaaS config of any kind (no Procfile, render.yaml, railway.json, fly.toml) anywhere in the repository. The only way to run it today is manual: provision a host, populate backend/.env, and run the npm scripts by hand (deployment.md §1, §6.2).
- Supabase is the intended Postgres-hosting, Storage, and Auth-fallback provider for both subsystems in a real deployment, referenced throughout both .env.example files and backend/src/database/supabase.service.ts (deployment.md §7.2).
- No Redis, message queue, or job runner exists anywhere in either subsystem's dependencies (deployment.md §9). The only construct resembling a background job is the cron module's plain HTTP endpoint, which has no self-scheduling and depends entirely on an external caller (architecture.md §6; deployment.md §11).
- Monitoring/observability is essentially absent: NestJS's built-in Logger (console-based, no external shipping) is the only structured logging; GET /health exists but nothing currently polls it; web/ has no equivalent health route and no error-tracking SDK configured (deployment.md §12).
- There is no .github directory anywhere — no CI/CD pipeline builds, lints, or tests either subsystem on any change (deployment.md §5; roadmap.md §1).

Full deployment verdict table, every reproduced build failure with exact error text, and the complete remediation checklist: .agents/deployment.md.

## 8. Common Workflows

### Adding a new backend/ module

Follow the Controller → Service → Repository → DTO pattern used by 6 of the 8 existing modules (customers is the cleanest template; storage has no repository and cron has no service/repository of its own — both are documented exceptions, not additional patterns to copy) (backend.md "Module dependency graph"; coding-standards.md §4.1, §8). Concretely:

1. Add backend/src/modules/<name>/ with <name>.module.ts, <name>.controller.ts, <name>.service.ts, <name>.repository.ts, and a dto/ subfolder.
2. Register the new module in backend/src/app.module.ts's imports array.
3. If the route needs authentication, apply @UseGuards(JwtAuthGuard) at the controller class level — do not apply RolesGuard alone. backend/'s own organizations module is a direct cautionary example: it applies only RolesGuard, so its two routes with no @Roles(...) decorator are fully unauthenticated (RolesGuard returns true immediately whenever no roles are required, without ever checking request.user) and its four @Roles(...)-guarded routes always throw 401 (request.user is only ever populated by JwtAuthGuard, which this controller never runs) (backend.md "Critical defect"; security.md "Confirmed authorization gaps"; roadmap.md SEC-1).
4. Give every request DTO real class-validator decorators on every field. The global ValidationPipe uses whitelist plus forbidNonWhitelisted; a DTO field with zero decorators is treated as unrecognized. backend/'s webhooks DTO is the confirmed cautionary example — zero class-validator decorators on either field, contributing to that endpoint's severity (backend.md "webhooks"; security.md "Input Validation").
5. Document the controller with @ApiTags/@ApiOperation/@ApiResponse and DTOs with @ApiProperty — Swagger is hand-written throughout, no CLI plugin infers it (backend.md; coding-standards.md §8).
6. If the module needs the shared Postgres schema, remember backend/prisma/schema.prisma and web/prisma/schema.prisma must be kept byte-identical manually (see §5, §15) — nothing enforces this today.

### Adding a new web/ route

Follow the established three/four-layer split under web/src/app/(app)/<segment>/: a thin page.tsx (Server Component, usually just renders a Client Component), a <segment>-client.tsx (Client Component doing the RTK Query data-fetching), an actions.ts file ("use server" Server Actions calling into web/src/lib/services/*.ts), and for list views a <segment>-table.tsx plus <segment>-crud-buttons.tsx / <segment>-actions.tsx for CRUD modals (frontend.md §5.3; coding-standards.md §4.2).

- Authentication is gated centrally by web/src/app/(app)/layout.tsx's single requireSession() call for the entire (app) route group — do not add a redundant per-page check unless truly necessary. If you do need an ADMIN-only page, use the existing requireAdmin()/checkAdmin() helpers (web/src/lib/auth/session.ts) rather than hand-rolling the identical inline check that several existing files already duplicate inconsistently (frontend.md §3.4, §10.2; security.md "Authorization (RBAC / Roles)").
- New business logic belongs in web/src/lib/services/*.ts, not directly in the actions.ts file. Several existing files violate this (customers/[id]/actions.ts, loans/[id]/actions.ts, admin/staff/actions.ts, followups/actions.ts, reports/actions.ts, admin/settings/actions.ts all embed real business rules or unwrapped cascading deletes directly) — these are documented as known defects, not patterns to extend (architecture.md §13.3; roadmap.md AV-4 through AV-11).
- Register the new endpoint in the matching web/src/lib/redux/api/*.ts slice, choosing url (real HTTP call to backend/ via axiosClient, if the logic already lives in backend/) or action (in-process Server Action call, the default for anything not yet migrated) (architecture.md §3.2; frontend.md §7).
- Validate all Server Action inputs with a Zod schema from web/src/lib/validation/ before touching Prisma. Coverage here is currently inconsistent — several actions (onboarding's saveLoanPolicyAction with no auth check at all, admin/staff's createStaffUserAction/updateStaffUserAction with a real privilege-escalation risk) are confirmed missing this — do not copy them (business-rules.md §10.8; roadmap.md MV-2, MV-6; security.md "Input Validation").

### Adding a schema migration

There is no prisma/migrations directory in either subsystem. Schema changes are applied via prisma db push (web/package.json's db:push script; backend/package.json has no equivalent script at all) (architecture.md §14; coding-standards.md §9; deployment.md §16 item 11 notes backend/prisma/seed.ts is similarly unwired — it imports a path, ../src/lib/auth, that does not exist under backend/src, and nothing in backend/package.json invokes it).

1. Edit web/prisma/schema.prisma.
2. Apply the identical edit to backend/prisma/schema.prisma — the two files are expected to stay byte-identical and nothing currently enforces this; a schema change applied to only one copy will silently desynchronize the two Prisma Clients reading/writing the same physical tables (architecture.md §2; decisions.md DEC-008).
3. Run prisma db push from web/ (the only subsystem with the script). If a corresponding backend/sql/rls_policies.sql policy needs updating for a new tenant-scoped table, add it manually and apply it to Postgres yourself — nothing automates this either (security.md "Row-Level Security"; roadmap.md §7 item 6).
4. Update web/prisma/seed.ts if the new model needs seed data, and do not assume backend/prisma/seed.ts can be run as-is — its import currently does not resolve (backend.md "Repository layout").

## 9. Coding Philosophy

Decimal-only monetary and weight math is real and consistently applied, not aspirational: web/src/lib/services/valuation.ts, interest.ts, and payments.ts perform every calculation through Prisma.Decimal (backed by decimal.js), matching Decimal(12,2) monetary columns and Decimal(10,4) weight columns in the shared schema. No floating-point money or weight math was found in these services (architecture.md §13.4; glossary.md §5; coding-standards.md §14).

Server-side recomputation over client trust: createLoan (web/src/lib/services/loans.ts) never trusts a client-submitted assessedValue, netWeight, fineWeight, or eligible-amount — every item's valuation is always recomputed from raw inputs at the server. The code's own comment cites this as "Non-Negotiable #5," though CONTRIBUTING.md's own numbered "Non-Negotiable Core Engineering Principles" list only runs to #4 — this specific citation does not resolve to any current document; the underlying rule is still binding regardless of the broken citation (glossary.md §5; coding-standards.md §12; business-rules.md §2.1).

Atomic financial transactions: loan creation and payment recording both run inside runSerializable (web/src/lib/db.ts) — Postgres Serializable isolation with retry-on-conflict (error P2034) — because neither loan-number nor receipt-number generation is backed by a database sequence and both rely on Serializable isolation for collision-avoidance under concurrency (architecture.md §5.2; glossary.md §6; coding-standards.md §14).

Thin-actions-call-services is the stated convention but is inconsistently applied. Where followed (customers/actions.ts, dashboard/actions.ts, and web/src/lib/services/*.ts itself), it works well. Where violated — several actions.ts files embed real business rules and unwrapped, non-transactional cascading deletes directly — it is a documented defect, not a second accepted style (architecture.md §13.3; roadmap.md AV-4 through AV-11).

Section-numbered citations recur in code comments and test names but trace to two different, non-.agents/ sources: "§Phase N" markers correspond to .agents/tasks.md's phase headings; "§6.N" markers correspond to root-level ARCHITECTURE.md's own §6 subsections (§6.1 Item Valuation Algorithm, §6.2 RBI-Compliant Tiered LTV Framework, §6.3 On-Read Actual/365 Interest Formula, §6.4 Atomic Repayment Waterfall Allocation). web/src/lib/services/loans.ts additionally cites "(§6.5)" for loan closure, but ARCHITECTURE.md's own numbering stops at §6.4 — this citation is unresolved in any current document (coding-standards.md §9, §12; business-rules.md §11.4).

Full coding-convention detail, including every measured inconsistency (Prettier/ESLint divergence between subsystems, tsconfig strictness inversion, comment-density gap): .agents/coding-standards.md.

## 10. Naming Conventions

backend/ file naming is kebab-case with a role suffix matching the Nest artifact type (customers.controller.ts, customers.service.ts, customers.repository.ts, customer-search-query.dto.ts, jwt-auth.guard.ts) — fully consistent across all 8 modules. Classes are PascalCase with the same role suffix (CustomersController, CustomersService, CustomersRepository) (coding-standards.md §6.1-§6.2).

web/ is mostly kebab-case with real, measured inconsistencies: web/src/lib/redux/api/*.ts files are camelCase (customersApi.ts), web/src/lib/services/*.ts is mostly single lowercase words but one file is kebab-case (market-rates.ts) in the same folder, and web/src/lib root mixes camelCase (axiosClient.ts) with kebab-case (auth-client.ts) siblings. Components are PascalCase function names regardless of the file's own casing (coding-standards.md §6.1).

Prisma models are PascalCase except the four better-auth tables (user, session, account, verification), which are deliberately lowercase, matching better-auth's own convention — this predates the current backend/+web/ split (the pre-restructure blueprint at .agents/schema.md already shows this lowercase convention) and is not a bug, but every consumer must remember the exception (coding-standards.md §6.3; glossary.md §2). Enum members are SCREAMING_SNAKE_CASE (glossary.md Appendix).

Full naming-convention detail and every measured file/symbol-casing inconsistency: .agents/coding-standards.md §6.

## 11. Error Handling

backend/: the dominant pattern is throw new HttpException with a plain object payload under an error key, funneled through one global @Catch()-all filter (backend/src/common/filters/http-exception.filter.ts) into a uniform {statusCode, timestamp, path, error} response envelope, logged server-side with the full stack trace but never leaked to the client. This is not fully uniform — backend/src/modules/organizations/organizations.service.ts instead throws NestJS's built-in NotFoundException for its two not-found cases, producing a differently-shaped body than the rest of the codebase's hand-built envelope (coding-standards.md §10; backend.md "Error handling").

web/: two distinct conventions by layer. Server Actions never throw to the caller — they catch internally and return a discriminated union, either {success: false, error: string} or {success: true, ...data}; RTK Query's baseApi.ts has a dedicated isActionError() type guard specifically to detect this shape. Services (web/src/lib/services/*.ts) throw plain new Error("human-readable message") for business-rule violations, caught one layer up by the calling actions.ts file's try/catch. Session helpers (requireSession, requireAdmin in web/src/lib/auth/session.ts) use Next.js's redirect() rather than throwing — an auth failure produces a navigation, not an error boundary (coding-standards.md §10).

Full error-handling detail per module: .agents/coding-standards.md §10; .agents/backend.md "Error handling".

## 12. Security Practices

The two most severe, currently-live findings across the whole system, verified by direct source reading in more than one companion document:

1. **RESOLVED (2026-07-11).** backend/'s billing webhook used to be a Stripe integration (POST /webhooks/stripe) that performed no signature verification anywhere — it only checked that STRIPE_WEBHOOK_SECRET was a non-empty string, with no stripe-signature header extraction, no HMAC computation, and no stripe.webhooks.constructEvent call anywhere in the monorepo. As coded at the time, this left the endpoint non-functional for any request under the app's own DTO/ValidationPipe configuration (its StripeWebhookPayloadDto had zero class-validator decorators, so its fields got rejected by forbidNonWhitelisted) — a fragile, accidental mitigation, not a real fix. The integration has since been replaced end-to-end with Dodo Payments: the route is now POST /webhooks/dodo-payments, the endpoint binds `@Req() req: RawBodyRequest<Request>` instead of a DTO, and the handler verifies a real HMAC-SHA256 signature via the `dodopayments` SDK's `client.webhooks.unwrap()` before trusting any field, rejecting with 401 on an invalid/missing signature — verified working end-to-end via a live curl POST with no valid signature headers, which returned `401 Invalid webhook signature` (backend.md "webhooks"; security.md "Executive Summary"; roadmap.md MV-1, RESOLVED; decisions.md DEC-004).
2. backend/'s customer search (GET /customers/search) has no organizationId filter anywhere in its call chain, and it is actively invoked by web/'s live "new loan" page (via searchCustomers → axiosClient → this exact backend/ endpoint) — this is not theoretical surface, it is a confirmed cross-tenant PII leak in a route that is already reachable from production UI (backend.md "customers"; security.md "Confirmed authorization gaps"; roadmap.md AV-1).

Beyond those two: better-auth is the sole identity provider (web/), and backend/ never independently verifies a self-signed credential — it trusts a live better-auth session-table row or, as a fallback, a genuine Supabase JWT (see §4). No rate limiting exists anywhere in either subsystem — no @nestjs/throttler, express-rate-limit, or equivalent dependency in either package.json (security.md "Rate Limiting"). backend/'s CORS is wide open (app.enableCors() called with no arguments, defaulting to a wildcard origin with no credentials header) — likely incompatible in practice with web/'s own credentialed axios calls to it, independent of whether backend/ can even boot (security.md "Cookies"; backend.md "Bootstrap and request pipeline"). backend/'s organizations controller used to never apply JwtAuthGuard at all — two GET routes were fully unauthenticated (leaking team-roster PII) and its four @Roles-guarded write routes always threw 401 for every caller; this is now RESOLVED (2026-07-11) — the controller applies `@UseGuards(JwtAuthGuard, RolesGuard)`, verified via curl that an unauthenticated GET /api/organizations/:orgId/members now returns 401 (security.md "Confirmed authorization gaps"; roadmap.md SEC-1, RESOLVED). The storage upload endpoint has no file-size cap, no mimetype/extension allow-list, and accepts an unvalidated free-text bucket parameter (security.md "File Upload Security"; roadmap.md SEC-2). JWT_SECRET (backend/.env.example) is dead configuration; SUPABASE_SERVICE_ROLE_KEY silently falls back to the less-privileged anon key if missing, logged only at info level (security.md "Secrets Management").

Full prioritized security register (12 findings, ranked, with remediation) and every CORS/CSRF/XSS/SQL-injection/encryption finding: .agents/security.md.

## 13. Performance Considerations

Several core read paths run fully unfiltered, unbounded table scans with no organizationId filter and no pagination, then aggregate results in application memory rather than via Prisma aggregate/groupBy — cost grows with total platform-wide data, not per-tenant data, and this is confirmed to be a real risk in a genuinely multi-tenant Cloud SaaS product (web/'s own platform-admin page evidences real multi-org usage). The dashboard's getDashboardStats and getDashboardChartData (web/src/lib/services/dashboard.ts) and the reports action (web/src/app/(app)/reports/actions.ts) are the most severe examples; getLoans' ACTIVE/OVERDUE filter branch (web/src/lib/services/loans.ts) must fetch every matching row and paginate in memory because "overdue" is a derived, not stored, status (roadmap.md PERF-1, PERF-2, PERF-3, PERF-4).

Several frequently-queried columns lack supporting indexes: LedgerEntry has no standalone index on loanId despite every sibling ledger-adjacent model having one; Loan.loanDate, Payment.paymentDate, FollowUp's status+dueDate combination, and Loan.handledById are all queried without index support (roadmap.md PERF-8, PERF-9, PERF-10, PERF-13). Customer/loan search uses leading-wildcard contains filters with no pg_trgm/GIN trigram index anywhere in either schema file, forcing a sequential scan on every search keystroke (roadmap.md PERF-7). Web/'s list pages (customers, loans) call their query hooks with a hardcoded page: 1, pageSize: 100 with no real pagination state wired up, even though the backend service functions support true pagination (roadmap.md PERF-5).

The one deliberate, accepted performance trade-off in the codebase: Serializable-isolation transactions (with retry) for loan/payment writes, chosen explicitly for correctness under concurrency — do not "optimize" this back to Read Committed without understanding why it was chosen (see §9, §15). The one deliberate polling interval anywhere in the frontend is the market-rate ticker at 15 minutes; every other data need is a one-shot fetch refreshed only via RTK Query tag invalidation (coding-standards.md §17; roadmap.md).

Full performance register (13 findings) with file-and-line detail: .agents/roadmap.md §8.7.

## 14. Invariants — Things an AI Must Never Change

1. Decimal-only money and weight math. Every monetary and weight computation in web/src/lib/services/valuation.ts, interest.ts, payments.ts (and any future backend/ equivalent) must use Prisma.Decimal — never a native JS Number/float — matching the Decimal(12,2) and Decimal(10,4) columns in the shared schema (web/prisma/schema.prisma, backend/prisma/schema.prisma). This is a verified, real, load-bearing convention, not aspirational (architecture.md §13.4).
2. The repayment waterfall order. Charges, then accrued interest, then principal, in that fixed order, inside one atomic transaction (web/src/lib/services/payments.ts's recordPayment/previewPaymentAllocation) — never reorder these three steps. Overpayment beyond a 0.01 rounding tolerance must continue to be rejected outright (the entire transaction throws and nothing persists) — never partially applied, never silently truncated (glossary.md §6; business-rules.md §5).
3. The Serializable-isolation-plus-retry transaction pattern (runSerializable, web/src/lib/db.ts, retrying only on Postgres error P2034) for loan creation and payment recording. Do not downgrade these to a plain prisma.$transaction (Read Committed) — loan-number and receipt-number generation both depend on Serializable isolation for collision-avoidance, since neither is backed by a database sequence (glossary.md §6; architecture.md §5.2).
4. Server-side recomputation of collateral valuation and LTV-eligible amount. createLoan (web/src/lib/services/loans.ts) must never trust a client-submitted assessedValue, netWeight, fineWeight, or eligible amount — always recompute from raw inputs (grossWeightGrams, stoneWeightGrams, purityPercent, valuationRatePerGram) at the server (business-rules.md §2.1; glossary.md §5).
5. Row-Level Security policy definitions (backend/sql/rls_policies.sql). Do not delete, weaken, or disable these policies to work around a bug, even though they are not currently armed by any live application code path. The correct response to a discovered tenant-isolation gap is to add the missing organizationId filter at the application layer (matching the pattern already used correctly in, e.g., web/src/lib/services/customers.ts's createCustomer) and/or wire runWithTenantContext (web/src/lib/supabase/server.ts) or an equivalent mechanism into the live query path — never to remove the SQL-level policies as a shortcut (security.md "Row-Level Security"; architecture.md §9.4).
6. Explicit organizationId scoping on every query against a tenant-scoped table (Organization, Branch, LoanPolicy, DocumentType, Customer, KycDocument, Loan, LoanItem, LoanCharge, Payment, LedgerEntry, FollowUp). Always add or preserve this filter on new or edited queries. Several existing functions are already missing it and are documented as known, unresolved defects (backend/'s customer search; web/'s dashboard.ts, several of loans.ts's and customers.ts's read functions) — these are not sanctioned examples to copy (roadmap.md AV-1, PERF-1, PERF-4; business-rules.md §1.4-1.5).
7. The licensing model. LICENSE at the repository root is Business Source License 1.1 (Licensor "Pawnify Cloud Inc.", Change Date 2029-07-01, converting automatically to plain MIT on that date). Do not alter the license text, the Change Date, or add/remove license headers without explicit instruction. Both backend/package.json and web/package.json currently declare "license": "MIT" outright — a known, flagged inconsistency with the still-in-force BSL terms (roughly three years remain before conversion as of this writing). Do not "resolve" this unilaterally by picking one side; surface it for a human decision (decisions.md DEC-002; roadmap.md §1).
8. The two Prisma schema files (web/prisma/schema.prisma, backend/prisma/schema.prisma) must always be edited together and kept byte-identical. There is no tooling enforcing this today; it is a manual discipline every schema change must honor (architecture.md §2, §14; decisions.md DEC-008).
9. better-auth as the sole identity/session issuer. Do not introduce a second, independent login/session mechanism (e.g., wiring a direct Supabase Auth sign-in) without deliberately deciding to replace better-auth. backend/'s auth guard is designed to recognize a better-auth session token or, as a narrow, largely-unexercised fallback, a genuine Supabase JWT — it does not and should not mint its own credentials (architecture.md §8; glossary.md §2).
10. The append-only convention for LedgerEntry and Payment rows. Treat these as an audit trail. Do not add new code paths that mutate or delete them outside the two existing admin-gated cascading-delete actions — and those two actions are themselves flagged as a data-integrity risk for lacking a transaction wrapper (see §16), not a pattern to extend (glossary.md §6; architecture.md §13.3).

## 15. Known Technical Debt (Top Findings)

Condensed from a full 85-item register; see .agents/roadmap.md §8 for the complete, prioritized list with file-and-line citations for every item.

| Priority | Finding | Files |
|---|---|---|
| Critical | backend/ cannot boot — PrismaService has no way to construct a database connection (reproduced directly by executing the code) | backend/src/database/prisma.service.ts, backend/prisma/schema.prisma, backend/package.json |
| Critical | web/'s own build is broken — Next.js version regression, missing Prisma datasource url, next.config.ts incompatible with the pinned version (reproduced directly) | web/package.json, web/prisma/schema.prisma, web/next.config.ts |
| Critical (RESOLVED 2026-07-11) | backend/'s billing webhook used to have zero signature verification (forgeable billing-plan mutation) when it was a Stripe integration; it has since migrated to Dodo Payments with real HMAC-SHA256 signature verification, verified working via curl | backend/src/modules/webhooks/webhooks.controller.ts, webhooks.service.ts, webhooks.repository.ts |
| Critical | backend/'s customer search has no organizationId filter — live, actively-called cross-tenant PII leak | backend/src/modules/customers/customers.repository.ts, customers.service.ts; web/src/app/(app)/loans/new/page.tsx |
| P0 (RESOLVED 2026-07-11) | backend/'s OrganizationsController used to never apply JwtAuthGuard — 2 routes fully unauthenticated, 4 routes always 401; now fixed with `@UseGuards(JwtAuthGuard, RolesGuard)`, verified via curl | backend/src/modules/organizations/organizations.controller.ts, backend/src/modules/auth/guards/roles.guard.ts |
| P0/P1 | RLS is defined at the SQL level but never armed by any application code; multiple web/ read paths (dashboard, loans list, customer list/search, reports, followups, staff list) have no organizationId filter | backend/sql/rls_policies.sql, web/src/lib/supabase/server.ts, web/src/lib/services/dashboard.ts, loans.ts, customers.ts |
| P1 | docker-compose.yml is broken in 5 independent ways and defines no backend/ service at all | docker-compose.yml |
| P0/P1 | Zero backend/ test coverage (no *.spec.ts files exist anywhere); several of web/'s tests are misleading — waterfall.test.ts tests a local reimplementation, not the real payments.ts; rls-isolation.test.ts is a pure in-memory-array simulation, not a real RLS test | backend/src (absence); web/src/__tests__/waterfall.test.ts, rls-isolation.test.ts |
| P1 | Duplicated, already-diverged market-rates fetch logic in both subsystems (differing fallback defaults, a UTC-mislabeled-as-IST timestamp bug in backend/'s copy) | backend/src/modules/market-rates/market-rates.service.ts, web/src/lib/services/market-rates.ts |
| P1 | Several web/ Server Actions bypass the service layer with unwrapped, non-transactional cascading deletes (deleteLoanAction, deleteCustomerAction) | web/src/app/(app)/loans/[id]/actions.ts, web/src/app/(app)/customers/[id]/actions.ts |
| P1 | Staff-account provisioning has a real privilege-escalation gap — role is written with zero runtime validation against the 5-value Role enum | web/src/app/(app)/admin/staff/actions.ts |
| P1 | web/'s platform-admin page has essentially no working role gate; its plan-change action's role check is conditionally skipped entirely when an undocumented env var is unset | web/src/app/(app)/platform-admin/page.tsx, actions.ts |
| P2 | No CI/CD anywhere in the repository; no monorepo tooling ties the two subsystems together | repo root (absence of .github, absence of turbo.json/nx.json/pnpm-workspace.yaml) |
| P2 | Two independent, byte-identical Prisma schema copies with nothing enforcing they stay in sync | web/prisma/schema.prisma, backend/prisma/schema.prisma |
| P2 | organizationsApi.ts's 6 RTK Query hooks and the backend/ controller they target are fully wired but have zero UI callers anywhere | web/src/lib/redux/api/organizationsApi.ts, backend/src/modules/organizations |

## 16. Future Roadmap (Inferred — Not a Recorded Plan)

No document, commit, or code comment anywhere in this repository states an explicit forward plan. The items below are reconstructed purely from the codebase's current trajectory (a partial NestJS extraction under way, business logic still concentrated in web/, infrastructure files moved without their references being updated) and are explicitly labeled inferred, not confirmed (roadmap.md §7; decisions.md "Inferred Decisions").

1. Make backend/ boot at all (add a driver adapter or datasourceUrl option to PrismaService, and a static or programmatic datasource url to backend/prisma/schema.prisma) before any other backend/ work is meaningful.
2. Close the RLS enforcement gap — this is the single most consequential open item, since every unscoped query in both subsystems currently depends on it being a non-issue.
3. Complete backend/'s module set to actually match web/'s feature surface: loans, payments, followups, billing, settings, staff, and dashboard/reports modules do not exist in backend/ yet. Given the demonstrated pattern of drift when logic has already been ported (market-rates, team invitation), pair any future port with parity tests against web/'s existing implementation.
4. Fix docker-compose.yml: correct file paths, add a real backend/ service, remove or fix the root Dockerfile reference.
5. Add CI/CD and basic monorepo tooling — nothing currently catches a breaking change in one subsystem before it silently breaks the other (this has already happened once: a backend/ DTO field rename left web/'s customersApi.ts declaring a response type that doesn't match the real API).
6. Consolidate the two Prisma schemas onto a single source of truth.
7. Pick one canonical implementation for logic that exists in both subsystems today (market-rates fetch/fallback; organization-policy read/write) and delete the non-canonical copy.
8. Harden backend/'s security posture before any further exposure: the organizations guard chain and webhook signature verification (migrated from Stripe to Dodo Payments) are now fixed as of 2026-07-11; still needed: add rate limiting, restrict CORS, add file-upload validation.
9. Generate a typed API client from backend/'s existing Swagger/OpenAPI output rather than hand-typing RTK Query response shapes, to prevent recurrences of the type-mismatch defect above.
10. Build out test coverage in both subsystems, with particular attention to the two conceptually-named-but-not-actually-testing-the-real-thing files (waterfall.test.ts, rls-isolation.test.ts).
11. Fix web/'s own build (Next.js version, Prisma datasource url, missing output: "standalone") before any deployment work, independent of anything above.

Full roadmap reasoning and the complete 85-item technical-debt register it's derived from: .agents/roadmap.md.

## 17. Documentation Index

| Topic | File |
|---|---|
| Full architecture, request/data flows, module dependency graphs | .agents/architecture.md |
| backend/ — every module, guard, route, and defect in full detail | .agents/backend.md |
| web/ — every route, component, hook, and state-management detail | .agents/frontend.md |
| Full Prisma schema and data-model reference | .agents/database.md |
| Every HTTP route (backend/) and Server Action (web/) — request/response shapes, auth, validation | .agents/api.md |
| Loan/payment/interest/valuation/billing/RBAC business rules, with subsystem tags on every rule | .agents/business-rules.md |
| Coding conventions, measured inconsistencies, and file-naming/casing detail | .agents/coding-standards.md |
| Security posture, prioritized findings, and remediation | .agents/security.md |
| Deployment reality check — what works, what doesn't, and why | .agents/deployment.md |
| Test coverage map, what's actually tested vs. misleadingly named | .agents/testing.md |
| Full 85-item technical-debt register and inferred future roadmap | .agents/roadmap.md |
| Architectural decision history (historical DEC-001 through DEC-005, plus inferred DEC-006+ for backend/) | .agents/decisions.md |
| Domain glossary — every model, enum, and pawn/lending term defined with citations | .agents/glossary.md |
| Pre-restructure historical notes — predate backend/, may be stale, current code wins on conflict | .agents/context.md, .agents/lessons.md, .agents/schema.md, .agents/tasks.md |