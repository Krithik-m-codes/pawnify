# Pawnify Architecture

## 0. How to read this document

Pawnify is a multi-tenant pawn-loan broker management platform, currently split across two independently-versioned npm projects in one repository, with no monorepo tooling joining them (no turbo.json, nx.json, pnpm-workspace.yaml, or lerna.json at the repo root, and no root package.json — confirmed by directory listing of the repo root).

- backend/ is a **new, partial** NestJS 11 API. It has exactly 8 module directories under backend/src/modules: auth, cron, customers, health, market-rates, organizations, storage, webhooks (confirmed by directory listing and by backend/src/app.module.ts, which imports ConfigModule, DatabaseModule, HealthModule, AuthModule, CustomersModule, MarketRatesModule, StorageModule, CronModule, WebhooksModule, OrganizationsModule — 10 imports total: 2 global infrastructure modules plus the 8 feature modules).
- web/ is a **mature** Next.js App Router application (Prisma, Supabase, better-auth, Redux Toolkit Query) that still contains the large majority of Pawnify's business logic: loans, payments, followups, billing, settings, staff, reports, dashboard, onboarding. backend/ does **not** replace any of this — it duplicates thin slices of it (customer typeahead search, market rates, org policy/team endpoints) while web/'s own richer implementations of the same domains keep running independently.

Every section below is tagged with the subsystem(s) it describes. Where a fact could not be confirmed by reading the repository, it is marked **Unknown**. Where current source code contradicts the pre-restructure historical notes at .agents/context.md, .agents/decisions.md, .agents/lessons.md, .agents/schema.md, or .agents/tasks.md, the conflict is called out explicitly — those notes describe the single-app codebase that predates the backend/ extraction and never mention backend/ at all (directly confirmed: a case-insensitive search for "backend" across all five files returns zero matches); current code wins per project convention, but the drift is itself a fact worth recording since .agents/lessons.md already documents this as a recurring failure mode.

This document was produced by directly reading the source files it cites (backend/src/main.ts, backend/src/app.module.ts, backend/src/modules/auth/**, backend/src/database/**, backend/sql/rls_policies.sql, backend/src/modules/organizations/**, backend/src/modules/customers/**, backend/src/modules/storage/storage.service.ts, backend/src/modules/webhooks/webhooks.service.ts, backend/src/modules/cron/**, backend/package.json, web/src/lib/auth.ts, web/src/lib/auth-client.ts, web/src/lib/auth/session.ts, web/src/lib/redux/api/baseApi.ts, web/src/lib/redux/api/customersApi.ts, web/src/lib/redux/api/organizationsApi.ts, web/src/lib/axiosClient.ts, web/src/lib/db.ts, web/src/lib/supabase/server.ts, web/src/lib/services/payments.ts, web/src/lib/services/loans.ts, web/src/app/(app)/layout.tsx, web/src/app/api/auth/[...all]/route.ts, web/src/components/live-market-ticker.tsx, web/prisma/schema.prisma, web/prisma.config.ts, web/next.config.ts, web/vercel.json, web/Dockerfile, docker-compose.yml, backend/.env.example, web/.env.example, web/package.json), cross-checked against a prior structured recon pass and a set of independently re-verified audit findings, and against git history (`git log`, `git show`) where source alone was ambiguous.

---

## 1. System overview

```
pawnify/                              (git repo root — no root package.json, no CI/CD, no monorepo tool)
├── .agents/                          historical pre-restructure notes (context/decisions/lessons/schema/tasks.md)
│                                     + this document (architecture.md)
├── docker-compose.yml                defines "db" (postgres:16-alpine) + "app" services only
│                                     — no service for backend/ at all; "app" build context/Dockerfile
│                                     path do not resolve at the repo root (see §15)
│
├── backend/                          NEW, PARTIAL — NestJS 11 API, port 3001, prefix /api
│   ├── src/
│   │   ├── main.ts                   bootstrap: prefix, ValidationPipe, filter, interceptor, CORS(open), Swagger /docs
│   │   ├── app.module.ts             root module — 10 imports (2 global infra + 8 feature modules)
│   │   ├── config/                   ConfigModule (@Global), configuration.ts (5 keys only)
│   │   ├── database/                 DatabaseModule (@Global): PrismaService, SupabaseService
│   │   ├── common/                   AllExceptionsFilter, LoggingInterceptor (both manually `new`'d, not DI-provided)
│   │   └── modules/
│   │       ├── auth/                 @Global — JwtAuthGuard, RolesGuard, AuthService, AuthRepository
│   │       ├── customers/            GET /customers/search only (typeahead)
│   │       ├── health/                GET /health
│   │       ├── market-rates/         GET /market-rates (+ MarketRatesService used by cron/)
│   │       ├── organizations/        LoanPolicy + team-member RBAC endpoints
│   │       ├── storage/              POST /storage/upload → Supabase Storage
│   │       ├── cron/                 GET/POST /cron/update-rates (imports market-rates/)
│   │       └── webhooks/             POST /webhooks/dodo-payments (real signature verification via the dodopayments SDK)
│   ├── prisma/schema.prisma          BYTE-IDENTICAL COPY of web/prisma/schema.prisma
│   ├── prisma/seed.ts                BYTE-IDENTICAL COPY of web/prisma/seed.ts (imports web/'s auth.ts via
│   │                                  "../src/lib/auth" — cannot resolve: backend/src has no lib/ directory at all;
│   │                                  backend/package.json also lacks @prisma/adapter-pg, date-fns, and dotenv,
│   │                                  all of which this seed.ts imports)
│   ├── sql/rls_policies.sql          Postgres RLS policies (backend-only file, no web/ counterpart)
│   └── (no Dockerfile, no CI, no db:* scripts, no prisma.config.ts)
│
└── web/                               MATURE — Next.js App Router, port 3000
    ├── src/app/                      route tree: marketing pages, (auth)/login, (app)/* (14 routes), api/auth/[...all]
    ├── src/lib/
    │   ├── auth.ts, auth-client.ts, auth/session.ts     better-auth (session/user/account/verification tables)
    │   ├── db.ts                      single ambient PrismaClient (pg Pool + @prisma/adapter-pg) + runSerializable()
    │   ├── redux/                     store.ts (1 reducer key: RTK Query) + api/*.ts (10 slices, 40 endpoints)
    │   ├── services/                  loans, payments, interest, valuation, customers, billing, dashboard,
    │   │                              market-rates, settings — the actual business-logic core
    │   ├── validation/                Zod schemas (customer, loan, payment)
    │   ├── config/                    jurisdictions.ts, asset-categories.ts (marketing/onboarding scaffolding)
    │   ├── supabase/, supabase-storage.ts               ORPHANED — zero callers anywhere in web/src
    │   └── axiosClient.ts             axios client → backend/'s REST API (used by 9 of 40 RTK Query endpoints)
    ├── prisma/schema.prisma           BYTE-IDENTICAL COPY of backend/prisma/schema.prisma
    ├── Dockerfile                     the ONLY Dockerfile in the whole repo
    ├── vercel.json                    stale cron entry for a route that no longer exists in web/
    └── next.config.ts                 empty config object
```

---

## 2. Why two subsystems both talk to the same database

**Subsystem: both.**

backend/ was carved out of what .agents/context.md and .agents/tasks.md describe as a single flat application (their file paths — src/lib/services/billing.ts, src/components/marketing/... — match today's web/ tree exactly, confirming those notes predate the split). The extraction copied the Prisma schema and seed script into backend/prisma/ verbatim rather than sharing one physical file: backend/prisma/schema.prisma and web/prisma/schema.prisma are byte-for-byte identical (435 lines each; directly diffed for this document, zero output), and backend/prisma/seed.ts and web/prisma/seed.ts are likewise byte-identical (31,263 bytes each). There is no symlink, shared package, or codegen step tying the two copies together — a schema change applied to one and not the other will silently desynchronize the two Prisma Clients against the same physical tables.

Both subsystems' schema.prisma files are identical in having no inline datasource url: backend/prisma/schema.prisma:8-10 and web/prisma/schema.prisma:8-10 both read exactly `datasource db { provider = "postgresql" }` with no url field. How each subsystem actually supplies DATABASE_URL at runtime, however, is **not symmetric, and the draft assumption that both .env.example files define it is wrong** — directly checked:

- backend/.env.example, backend/.env, and backend/.env.prod all three define `DATABASE_URL` (backend/.env additionally defines `DIRECT_URL`). backend/.env.example templates it as `postgresql://postgres:password@db.your-project.supabase.co:5432/postgres` — connecting via the `postgres` role.
- web/.env.example, web/.env, and web/.env.prod — all three checked directly — define **none** of DATABASE_URL or DIRECT_URL. The only variables present across web/'s three env files are BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_BACKEND_URL, NEXT_PUBLIC_SUPABASE_URL, and NEXT_PUBLIC_SUPABASE_ANON_KEY.

This matters because web/'s own code unconditionally depends on DATABASE_URL: web/prisma.config.ts sets `datasource.url` from `process.env["DIRECT_URL"] || process.env["DATABASE_URL"]` for the Prisma CLI, and at runtime web/src/lib/db.ts builds a `pg.Pool` directly from `process.env.DATABASE_URL`, wrapped in the `@prisma/adapter-pg` driver adapter. The one place in this repository that actually supplies web/ with a DATABASE_URL is docker-compose.yml's own `app` service, which sets `DATABASE_URL` and `DIRECT_URL` as literal environment entries (pointing at the compose-local `db` service) directly in the compose file rather than via any `.env` file (docker-compose.yml:34-35). How web/ obtains DATABASE_URL in any other deployment topology (e.g. a Vercel-hosted production instance) is not established by any file in the repository — **Unknown**.

backend/ has no equivalent adapter path at all — no backend/prisma.config.ts exists (confirmed absent by glob) and backend/package.json has no `@prisma/adapter-pg` dependency, while backend/src/database/prisma.service.ts defines `PrismaService extends PrismaClient` with no constructor override at all (so `super()` runs implicitly with zero arguments) and only calls `this.$connect()` in `onModuleInit`, silently warn-logging rather than throwing if that fails. How backend/'s PrismaService resolves an actual connection at runtime given the schema has no url and no adapter is **Unknown** from static source alone — this is a plausible boot-time failure mode, not something this document confirms by executing the app.

Locally, docker-compose.yml (repo root) only stands up two services — `db` (a local Postgres 16 container) and `app` (built from a root-level Dockerfile that does not exist; the only Dockerfile in the repo is web/Dockerfile) — and defines no service for backend/ at all. So in production, "both subsystems talk to the database" would rely on backend/'s DATABASE_URL and whatever mechanism supplies web/'s DATABASE_URL both naming the same logical Supabase-hosted Postgres instance — an intended-architecture statement, not something the current docker-compose.yml topology actually wires together for local development (where backend/ isn't started at all, and web/'s "app" service points at the compose-local Postgres, not Supabase).

Beyond schema/data, backend/'s auth module reads directly from tables that web/'s better-auth instance owns (session, user — see §10), which is what lets backend/ recognize a session that web/ issued without the two services ever calling each other over HTTP.

---

## 3. Layered architecture

### 3.1 backend/ (NestJS)

**Subsystem: backend/.**

The intended layering is Controller → Service → Repository → PrismaService/SupabaseService → Postgres/Supabase, and 6 of 8 modules follow it:

| Module | Controller guard | Service | Repository | DB client used |
|---|---|---|---|---|
| auth | n/a (provides guards) | AuthService | AuthRepository | SupabaseService (raw pg.Pool SQL + Supabase Admin Auth) |
| customers | JwtAuthGuard | CustomersService | CustomersRepository | PrismaService |
| health | none | HealthService | HealthRepository | PrismaService (`$queryRaw SELECT 1`) |
| market-rates | none | MarketRatesService | MarketRatesRepository | PrismaService (AppSetting table) |
| organizations | RolesGuard only (see §9.3) | OrganizationsService | OrganizationsRepository | PrismaService |
| webhooks | none | WebhooksService | WebhooksRepository | PrismaService |
| storage | JwtAuthGuard | StorageService | **none — calls SupabaseService directly** | SupabaseService (Supabase Storage) |
| cron | CronAuthGuard | **none — calls MarketRatesService directly** | n/a | (delegates to market-rates) |

Two modules break the pattern. storage has no storage.repository.ts at all (confirmed: backend/src/modules/storage contains only storage.controller.ts, storage.module.ts, storage.service.ts, dto/upload-response.dto.ts) — StorageService (backend/src/modules/storage/storage.service.ts) injects SupabaseService directly and calls `supabase.storage.from(bucketName).upload(...)` and `.getPublicUrl(...)` inline. It is the only *.service.ts file anywhere in backend/src/modules that imports SupabaseService or PrismaService directly rather than through a repository. cron has neither a service nor a repository of its own — CronController (backend/src/modules/cron/cron.controller.ts) calls `MarketRatesService.fetchAndSaveLiveMetalRates()` directly, which is also the only feature-to-feature module import in the whole graph (CronModule imports MarketRatesModule, since MarketRatesModule is not global).

Cross-cutting infrastructure (backend/src/main.ts): one global `ValidationPipe({whitelist:true, transform:true, forbidNonWhitelisted:true})`, one global `AllExceptionsFilter` and one global `LoggingInterceptor` — both of the latter instantiated with plain `new` rather than Nest's APP_FILTER/APP_INTERCEPTOR provider-token pattern, so neither can currently receive an injected dependency (e.g. ConfigService) without refactoring. `app.enableCors()` is called with **no arguments** — this is Nest/the underlying `cors` package's permissive default, not scoped to web/'s origin; there is no CORS_ORIGIN or equivalent env var read anywhere in backend/src. Swagger (`SwaggerModule.setup('docs', app, document)`) is mounted at GET /docs, outside the /api prefix (NestJS's global prefix applies to routes registered through the Nest router, not to the routes @nestjs/swagger registers directly on the underlying HTTP adapter, and no prefix-related Swagger option is passed here), with no guard protecting it.

Configuration is split across two uncoordinated mechanisms. backend/src/config/config.module.ts wraps `@nestjs/config`'s `ConfigModule.forRoot({isGlobal:true, load:[configuration], envFilePath:['.env', '../web/.env']})` — a deliberate cross-subsystem coupling: backend/ loads its own .env and then falls back to the sibling web/.env for anything not set locally (though as established in §2, web/.env does not itself define DATABASE_URL). backend/src/config/configuration.ts registers exactly five keys with ConfigService: env, port (default 3001), apiPrefix (default 'api'), database.url, and supabase.{url,anonKey,serviceRoleKey}. No validation schema exists anywhere (no Joi/class-validator env check) — missing vars silently resolve to empty strings or numeric defaults and the app boots regardless. Everything else the app actually reads — JWT_SECRET (declared in backend/.env.example but referenced nowhere in backend/src — dead configuration), CRON_SECRET (backend/src/modules/cron/guards/cron-auth.guard.ts), DODO_PAYMENTS_API_KEY, DODO_PAYMENTS_WEBHOOK_KEY, DODO_PAYMENTS_ENVIRONMENT (backend/src/modules/webhooks/webhooks.service.ts), and every market-rates default/LTV/threshold constant (backend/src/modules/market-rates/market-rates.service.ts) — is read directly via `process.env.X` inside feature code, bypassing ConfigService entirely.

### 3.2 web/ (Next.js)

**Subsystem: web/.**

web/'s layering is less uniform than backend/'s and mixes two different transport mechanisms:

- **Server Components** (route page.tsx files under web/src/app) are mostly thin wrappers that render a colocated Client Component (`*-client.tsx`) which does its own data fetching (directly confirmed for dashboard/page.tsx → DashboardClient, followups/page.tsx → FollowUpsClient, and reports/page.tsx → ReportsClient — each is a few lines that only render the client component). A few (customers/[id]/page.tsx, loans/[id]/page.tsx, profile/page.tsx) do an async `requireSession()` plus light data prep before rendering.
- **Client Components** call RTK Query hooks defined in web/src/lib/redux/api/*.ts (10 files: customersApi, dashboardApi, followupsApi, loansApi, marketRatesApi, organizationsApi, profileApi, reportsApi, settingsApi, staffApi — 40 endpoints total, directly counted).
- Every one of those hooks routes through **one** custom base query, `hybridAxiosBaseQuery` (web/src/lib/redux/api/baseApi.ts), which branches per-endpoint on the shape of the arguments the endpoint's `query()` returns:
  - if `args.url` is set → a real HTTP request via web/src/lib/axiosClient.ts (axios, `withCredentials:true`, baseURL from NEXT_PUBLIC_API_URL/NEXT_PUBLIC_BACKEND_URL, defaulting to backend/'s host at http://localhost:3001/api) — this is the only path that leaves the web/ Node process.
  - if `args.action` (an imported function reference) and `args.args` are set → the function is called **in-process**, with no network hop at all. This is how Next.js Server Actions ("use server" files under web/src/app/(app)/**/actions.ts) are wired into RTK Query.

  Of the 40 endpoints, 9 use the url path and therefore hit backend/'s NestJS API (directly counted): customersApi's `searchCustomers` (1; web/src/lib/redux/api/customersApi.ts), marketRatesApi's `getMarketRates`/`refreshMarketRates` (2), and organizationsApi's all 6 endpoints (web/src/lib/redux/api/organizationsApi.ts). The other 31 call a Server Action directly. This means the RTK Query layer is not "the web app's API client" in the conventional sense — it is a thin dispatch shim that sometimes calls a real remote service and sometimes calls a local function, and a caller reading only the hook name cannot tell which without opening baseApi.ts and the endpoint definition.

- **Server Actions** are supposed to be thin (auth-check → delegate to a service function in web/src/lib/services/*.ts → `serializeForClient` → return), and several files follow that pattern (web/src/app/(app)/customers/actions.ts, web/src/app/(app)/dashboard/actions.ts). Several others do not: web/src/app/(app)/customers/[id]/actions.ts, web/src/app/(app)/loans/[id]/actions.ts, web/src/app/(app)/admin/staff/actions.ts, web/src/app/(app)/followups/actions.ts, web/src/app/(app)/reports/actions.ts, and web/src/app/(app)/admin/settings/actions.ts all import `prisma` directly and embed real domain logic (cascading deletes, staff-account provisioning rules, follow-up CRUD, portfolio aggregation, settings validation) in the action file itself, bypassing web/src/lib/services entirely for that operation. This is detailed in §13.3.
- **Services** (web/src/lib/services/*.ts — billing, customers, dashboard, interest, loans, market-rates, payments, settings, valuation — 9 files, directly listed) hold the actual enforced business rules: server-side item revaluation, tiered LTV caps, mandatory-ID thresholds, simple-interest accrual, the atomic payment waterfall, two-step loan closure, billing-plan quotas.
- **Data access**: one ambient `PrismaClient` (web/src/lib/db.ts), built from a pooled `pg.Pool` (max 10 connections) wrapped in `@prisma/adapter-pg`, cached on `globalThis` outside production to survive dev-mode hot reloads. A `runSerializable()` helper wraps `prisma.$transaction` at `Serializable` isolation with up to 3 retries on Postgres error P2034 (serialization failure) — used only by `createLoan` (web/src/lib/services/loans.ts) and `recordPayment` (web/src/lib/services/payments.ts); `closeLoan` and `releaseItems` use a plain (Read Committed) `prisma.$transaction` instead.

---

## 4. Module boundaries and dependency graphs

### 4.1 backend/ — NestJS module graph

```
AppModule (backend/src/app.module.ts)
 ├── ConfigModule        (@Global — backend/src/config/config.module.ts)
 ├── DatabaseModule       (@Global — provides PrismaService + SupabaseService)
 ├── AuthModule           (@Global — AuthService, AuthRepository, JwtAuthGuard, RolesGuard, @Roles decorator)
 ├── HealthModule         → HealthController → HealthService → HealthRepository → PrismaService
 ├── CustomersModule      → CustomersController [JwtAuthGuard] → CustomersService → CustomersRepository → PrismaService
 ├── MarketRatesModule    → MarketRatesController [public] → MarketRatesService → MarketRatesRepository → PrismaService
 │                          (exports MarketRatesService)
 ├── StorageModule        → StorageController [JwtAuthGuard] → StorageService → SupabaseService  (no repository)
 ├── CronModule           → CronController [CronAuthGuard] ─┐
 │      imports MarketRatesModule ───────────────────────────┴→ MarketRatesService.fetchAndSaveLiveMetalRates()
 ├── WebhooksModule       → WebhooksController [no guard] → WebhooksService → WebhooksRepository → PrismaService
 └── OrganizationsModule  → OrganizationsController [RolesGuard only] → OrganizationsService → OrganizationsRepository
                             → PrismaService  (also redundantly re-imports DatabaseModule — harmless, already @Global)
```

No other cross-feature module import exists (confirmed by grep across backend/src/modules for relative imports crossing module folders — only auth's guards/decorators are imported by name into customers/storage/organizations controllers, available at runtime because AuthModule is global).

### 4.2 web/ — App Router route tree

```
web/src/app/
 ├── layout.tsx                 root layout (Poppins font, ReduxProvider, ThemeProvider)
 ├── page.tsx, docs/, open-source/, pricing/, privacy/, terms/     6 public marketing pages, no auth gate
 ├── (auth)/
 │    └── login/page.tsx        Client Component; authClient.signIn.email (better-auth); no already-authed redirect
 ├── (app)/                     layout.tsx calls requireSession() — SINGLE central gate for all 14 routes below
 │    ├── dashboard/            thin server wrapper → DashboardClient (RTK Query)
 │    ├── customers/            list; + new/ (client form); + [id]/ (detail, KYC, CRUD)
 │    ├── loans/                list; + new/ (client form, customer search + valuation); + [id]/ (detail, payments, closure)
 │    ├── followups/            thin server wrapper → FollowUpsClient
 │    ├── reports/               thin server wrapper → ReportsClient
 │    ├── admin/settings/       manual ADMIN check (duplicates, doesn't call, requireAdmin())
 │    ├── admin/staff/          manual ADMIN check (same duplication)
 │    ├── onboarding/           org jurisdiction/currency/LTV policy wizard
 │    ├── platform-admin/       calls checkAuth() but NEVER BRANCHES ON IT — any authenticated staff/admin can reach it
 │    └── profile/
 └── api/auth/[...all]/route.ts  better-auth catch-all Route Handler (toNextJsHandler(auth)) — fully self-contained;
                                 the only route anywhere under web/src/app/api
```

Directly counted: 14 leaf `page.tsx` files exist under (app) (admin/settings, admin/staff, customers, customers/new, customers/[id], dashboard, followups, loans, loans/new, loans/[id], onboarding, platform-admin, profile, reports), and 6 marketing `page.tsx`/route files exist at the app root (page.tsx, docs, open-source, pricing, privacy, terms).

web/src/proxy.ts is shaped exactly like Next.js Middleware (NextRequest/NextResponse signature, exported `config.matcher`) but is named proxy.ts/`proxy()`, not middleware.ts/`middleware()`, so Next.js's filename-based auto-detection would not register it; combined with the Next.js version anomaly in §15, whether it executes at all is **Unknown**.

### 4.3 Cross-subsystem dependency diagram

```
                        ┌───────────────────────────────────────────────┐
                        │                  Browser                       │
                        └───────────────┬─────────────────┬─────────────┘
                                        │                 │
                        Client Components           better-auth cookie
                        (RTK Query hooks)             (better-auth.session_token)
                                        │                 │
                    ┌───────────────────▼─────────────────▼───────────────────┐
                    │                    web/ (Next.js, :3000)                 │
                    │  Server Components · Server Actions · Route Handlers      │
                    │  RTK Query hybridAxiosBaseQuery ──┬── 31/40 endpoints ──► web/src/lib/services/*.ts
                    │                                    │                       ──► web/src/lib/db.ts (Prisma)
                    │                                    │
                    │                                    └── 9/40 endpoints (axios, withCredentials) ──┐
                    │  better-auth (web/src/lib/auth.ts) ── owns session/user/account/verification ──┐  │
                    └────────────────────────────────────────────────────────────────────────────────┼──┼──┐
                                                                                                       │  │  │
                    ┌──────────────────────────────────────────────────────────────────────────────┐ │  │  │
                    │                     backend/ (NestJS, :3001, prefix /api)                      │◄┘  │  │
                    │  JwtAuthGuard reads better-auth.session_token cookie or Bearer header           │    │  │
                    │    → AuthService.validateToken → AuthRepository.findSessionByToken             │    │  │
                    │      (raw SQL against the SAME "session" table, via SupabaseService's pg.Pool) │    │  │
                    │    → falls back to Supabase Admin Auth JWT verify only if no session row hits  │    │  │
                    │  8 feature modules (customers/health/market-rates/organizations/storage/       │    │  │
                    │  cron/webhooks) — Prisma for 5 of them, Supabase client for storage             │    │  │
                    └─────────────────┬──────────────────────────────────────────────┬───────────────┘    │  │
                                      │                                              │                    │  │
                          ┌───────────▼───────────┐                     ┌────────────▼───────────┐         │  │
                          │   PostgreSQL (shared)   │◄────────────────── │  Supabase project        │◄──────┘  │
                          │  backend/prisma/schema  │  both Prisma       │  (Auth Admin API,        │          │
                          │  = web/prisma/schema    │  clients + one     │   Storage buckets)       │          │
                          │  (byte-identical copies)│  raw pg.Pool each  └──────────────────────────┘          │
                          └─────────────────────────┘                                                         │
                                                                                                               │
                    External: goldprice.org / open.er-api.com / api.gold-api.com  (rate sources, called      │
                    independently by BOTH backend/market-rates.service.ts AND web/services/market-rates.ts) ◄─┘
                    Dodo Payments (webhook consumer only, backend/webhooks — migrated from Stripe; real HMAC-SHA256
                            signature verification via the dodopayments SDK, added to backend/package.json)
                    Vercel Cron (web/vercel.json — targets a route that no longer exists in web/)
```

---

## 5. Data flow: two representative requests, end to end

### 5.1 Customer search during loan origination (crosses both subsystems)

**Subsystem: both — this is the clearest example of the hybrid architecture in practice.**

1. A staff member on web/src/app/(app)/loans/new/page.tsx (Client Component) types into a customer search box, triggering `useLazySearchCustomersQuery` from web/src/lib/redux/api/customersApi.ts.
2. That endpoint's `query()` returns `{ url: "/customers/search", method: "GET", params: { q } }` — a url-shaped args object.
3. `hybridAxiosBaseQuery` (web/src/lib/redux/api/baseApi.ts) sees `args.url` and calls `axiosClient` (web/src/lib/axiosClient.ts) — a genuine outbound HTTP request, `withCredentials: true`.
4. `axiosClient`'s baseURL resolves from NEXT_PUBLIC_API_URL / NEXT_PUBLIC_BACKEND_URL, defaulting to `http://localhost:3001/api`. An interceptor also tries to attach a bearer token read from `localStorage.getItem("access_token")` / `localStorage.getItem("better-auth.session_token")` — a repo-wide search finds no other reference to either string anywhere in web/src, and no `localStorage.setItem` call anywhere writes either key (the only `localStorage.setItem` calls found are for an unrelated document-upload cache key, a "pawnify-theme" key, and a per-user avatar cache key) — so this branch is dead; the request's actual auth signal is the better-auth session cookie forwarded by `withCredentials: true`.
5. The request lands on backend/, prefixed /api (backend/src/main.ts), routed to `CustomersController.searchCustomers` (backend/src/modules/customers/customers.controller.ts), guarded by `JwtAuthGuard`.
6. `JwtAuthGuard` (backend/src/modules/auth/guards/jwt-auth.guard.ts) extracts a Bearer token or, failing that, the `better-auth.session_token` cookie, and calls `AuthService.validateToken` (backend/src/modules/auth/auth.service.ts) — see §8 for the full auth mechanics.
7. On success, `CustomersService` → `CustomersRepository.searchCustomers` (backend/src/modules/customers/customers.repository.ts) runs `prisma.customer.findMany({ where: { OR: [{fullName: contains}, {phone: contains}] }, select: {id, fullName, phone, city}, take: 10 })` — **with no organizationId filter anywhere in the call chain**. This returns matches across every tenant in the database, not just the caller's organization — a confirmed cross-tenant gap (see §9.4).
8. The response returns through axios → `hybridAxiosBaseQuery` → RTK Query's cache. The Client Component renders it, but web/src/app/(app)/loans/new/page.tsx defines its own local `CustomerSearchResult` interface (`{id, fullName, phone, city}`) rather than trusting the type customersApi.ts declares for this same endpoint (`Array<{id, fullName, phonePrimary, email?, kycStatus, activeLoanCount}>`) — the declared RTK Query type and the real backend DTO (`CustomerSummaryDto`, backend/src/modules/customers/dto/customer-summary.dto.ts: `{id, fullName, phone, city}`) have never matched; the page's hand-written local type is the one that is actually correct — it matches both the repository's Prisma `select` and the real DTO exactly.
9. Selecting a customer and submitting the loan form instead calls `useCreateLoanMutation`, an **action**-based endpoint (`query: (formData) => ({ action: createLoanAction, args: [formData] })`) — no HTTP hop, no backend/ involvement. This calls web/src/app/(app)/loans/new/actions.ts's Server Action, which calls `checkAuth()` (web/src/lib/auth/session.ts) then `createLoan()` (web/src/lib/services/loans.ts), which: checks the org's billing-plan quota (`checkCanCreateLoan`, web/src/lib/services/billing.ts), checks the mandatory-ID/PAN threshold (`checkPanRequired`, web/src/lib/services/customers.ts), recomputes every item's valuation and LTV tier server-side (`computeItemValuation`/`getLtvSlabs`/`getLtvPercent`, web/src/lib/services/valuation.ts) rather than trusting client-submitted numbers, and writes Loan/LoanItem/LoanCharge/LedgerEntry rows inside one `runSerializable` transaction (web/src/lib/db.ts).

This single flow demonstrates: the hybrid RTK Query transport, dual-path auth validation, a real tenant-isolation gap, and the fact that web/'s own service layer — not backend/ — still performs the actual loan-creation business logic.

### 5.2 Recording a loan payment (pure web/, no backend/ involvement)

**Subsystem: web/ only.**

`recordPaymentAction` → `checkAuth()` → `recordPayment()` (web/src/lib/services/payments.ts), executed entirely inside `runSerializable` (Serializable isolation, 3 retries on P2034):

1. Load the loan plus its unsettled charges, oldest first.
2. Reject if the loan is not ACTIVE, or the payment amount is not positive.
3. Allocate the payment in fixed order — outstanding charges → accrued interest (`computeAccruedInterest`, web/src/lib/services/interest.ts) → principal — capping each step at the lesser of the remaining amount and that bucket's outstanding balance.
4. If more than a 0.01 rounding tolerance remains unallocated after all three buckets, the entire transaction throws and nothing persists — overpayment is rejected outright, never partially applied.
5. `lastSettledDate` (the interest clock) advances fully only if interest was paid in full; on a partial interest payment it advances by a proportional fraction of the elapsed days, so unpaid interest is never silently forgiven.
6. A `Payment` row (receipt number `REC-YYYYMMDD-XXXXX`, a per-org daily count) and a `PAYMENT` `LedgerEntry` are created in the same transaction.

This is the one place in the codebase where the pre-restructure .agents/context.md's description of an "atomic repayment waterfall applying payments to charges then accrued interest then principal reduction inside database transactions" is fully and precisely borne out by current code (web/src/lib/services/payments.ts, header comment: "Every payment write is one atomic prisma.$transaction — a partially-applied payment is a data-integrity incident, not a bug").

---

## 6. Event flow

**Subsystem: both, for cron; backend/ only for webhooks.**

There is no message queue, pub/sub system, or event bus anywhere in the monorepo — neither backend/package.json nor web/package.json declares a dependency on any queue/broker client (bullmq, kafka, amqplib, an SQS/Redis client, etc.; directly checked). All "eventing" in this system is either a synchronous HTTP request or a database write read back later.

**Cron (market-rate refresh):** backend/src/modules/cron/cron.controller.ts exposes `GET` and `POST /api/cron/update-rates`, both guarded by `CronAuthGuard` (backend/src/modules/cron/guards/cron-auth.guard.ts), and both simply call `MarketRatesService.fetchAndSaveLiveMetalRates()`. `CronAuthGuard` **fails open**: if `process.env.CRON_SECRET` is unset, it returns `true` for every request with no check at all; only when the secret is configured does it require an exact `Authorization: Bearer <CRON_SECRET>` match. Neither `@nestjs/schedule` nor any other self-triggering scheduler is a backend/ dependency — this endpoint only runs when something external calls it. web/vercel.json still configures a Vercel Cron Job hitting `/api/cron/update-rates` daily at midnight (`0 0 * * *` — this schedule value was set by the most recent commit reachable from HEAD, b2523fb "fix: update cron schedule for rate updates to run daily at midnight", which touched a root-level vercel.json before the restructure moved that file to web/vercel.json), but no route matching `/api/cron/update-rates` exists anywhere under web/src/app/api any more (the only route there is `api/auth/[...all]/route.ts`) — the implementation moved to backend/, but the Vercel Cron entry that would trigger it was never updated, and a Vercel Cron entry can only ever invoke a path on its own deploying project, so it cannot reach backend/ even if backend/ were otherwise reachable. Whether any external scheduler has been separately pointed at backend/'s endpoint is **Unknown** — nothing in the repository confirms or denies it.

**Webhooks (Dodo Payments, migrated from Stripe):** backend/src/modules/webhooks/webhooks.controller.ts exposes `POST /api/webhooks/dodo-payments` (formerly `/api/webhooks/stripe`) with no `JwtAuthGuard`/`RolesGuard` — expected for a public third-party webhook, which now authenticates cryptographically instead. The handler in webhooks.service.ts reads `process.env.DODO_PAYMENTS_API_KEY`/`DODO_PAYMENTS_WEBHOOK_KEY` as a presence check first (`if (!apiKey || !webhookKey) throw 501`), then constructs the official `dodopayments` SDK client (`new DodoPayments({ bearerToken, environment, webhookKey })`) and calls `client.webhooks.unwrap(rawBody.toString(), { headers })` — this performs genuine HMAC-SHA256 signature verification per the Standard Webhooks spec and throws on an invalid or missing signature, which the handler turns into a real `401 { error: 'Invalid webhook signature' }` response, verified working end-to-end via a live curl POST with no valid signature headers. Only after that check passes does it trust the payload: for `subscription.active`/`subscription.renewed` event types, it reads `data.metadata.organizationId`/`planId` directly and calls `WebhooksRepository.updateOrganizationPlan`, which does `prisma.organization.updateMany({where:{id}, data:{billingPlan}})`; for `subscription.cancelled`/`subscription.expired`/`subscription.failed`, the same with `planId` forced to `null`. A caller can no longer rewrite any organization's billing plan by simply POSTing a hand-crafted JSON body — a valid Dodo Payments signature is required first.

---

## 7. State management

### 7.1 Client-side (web/ only)

The Redux store (web/src/lib/redux/store.ts) has exactly **one** reducer key: `[api.reducerPath]: api.reducer`, the single RTK Query slice from web/src/lib/redux/api/baseApi.ts. No `createSlice`-based UI-state reducer exists anywhere in the codebase (directly confirmed by repo-wide search) — Redux in this app exists solely to host RTK Query's server-state cache (tag-based invalidation across `tagTypes`: Loan, LoanList, Customer, CustomerList, Dashboard, Staff, Settings, FollowUp, Report, MarketRate, Profile). web/src/lib/redux/provider.tsx builds one store instance per mounted component tree (`useState(() => makeStore())`), the standard App-Router-safe pattern avoiding a server-side singleton. Local component state (`useState`) handles forms, wizards, and modals outside Redux; the extent of that state was not exhaustively inventoried for this document (**Unknown** in detail).

One module-boundary note: web/src/components/live-market-ticker.tsx (a Client Component) imports the `MarketRates` **type** from web/src/lib/services/market-rates.ts — a server-only module that also imports `@/lib/db` (Prisma) and performs live external HTTP calls. Every current usage of that type in client-bundled code is a type-only position (erased at build time), so there is no live risk today, but nothing — no `server-only` import guard (no `server-only` package dependency exists in web/package.json at all), no `@typescript-eslint/consistent-type-imports` lint rule in web/eslint.config.mjs — structurally prevents a future value-level export of that module from being pulled into the client bundle.

### 7.2 Server-side state

Postgres is the actual system of record for both subsystems: Organization, Branch, LoanPolicy, DocumentType, Customer, KycDocument, Loan, LoanItem, LoanCharge, Payment, LedgerEntry, FollowUp, plus the global (non-tenant) AppSetting key-value table, plus better-auth's user/session/account/verification tables — all defined once per subsystem in the two byte-identical schema.prisma files (17 models, 12 enums total — see §14; see §2, §9).

AppSetting (`key String @id`, `value String`, no organizationId, no timestamps) is a second, global settings store that overlaps with the per-organization LoanPolicy model — both encode LTV tiers, mandatory-ID thresholds, and default interest/grace-period values, with no stated reconciliation between them (web/prisma/schema.prisma; backend/src/modules/market-rates/market-rates.repository.ts and web/src/lib/services/market-rates.ts both read/write it independently — see §13).

better-auth's own `session` row is itself server-side session state, shared by both subsystems by virtue of pointing at the same table (see §8). No server-side in-memory or distributed cache (Redis, Memcached) exists in either package.json.

---

## 8. Authentication flow across both subsystems

**Subsystem: both.** This section directly confirms (rather than merely hypothesizes) how the two subsystems relate on authentication.

### 8.1 web/ — better-auth is the sign-in system; Supabase Auth is never used for it

web/src/lib/auth.ts constructs a `betterAuth()` instance: `database: prismaAdapter(prisma, {provider: "postgresql"})` — i.e. better-auth manages its own user/session/account/verification tables through web/'s own Prisma client (web/src/lib/db.ts), not through Supabase Auth. `emailAndPassword.enabled = true`; `session.expiresIn = 60 * 60 * 24` = 86400 seconds (24h), `session.updateAge = 60 * 60` = 3600 seconds (1h). Custom `user.additionalFields`: `role` (default `"STAFF"`, `input: false` — cannot be set from a client sign-up payload), `phone` (`input: true`), `isActive` (default `true`, `input: false`).

web/src/app/api/auth/[...all]/route.ts is the standard better-auth Next.js integration: `export const { GET, POST } = toNextJsHandler(auth)`, serving every better-auth sub-route (sign-in, sign-up, sign-out, session, etc.) under /api/auth/*.

web/src/lib/auth-client.ts builds a client SDK (`createAuthClient({baseURL: window.location.origin (browser) | NEXT_PUBLIC_APP_URL (server)})`) that always targets web/'s own /api/auth/* routes — never backend/. web/src/app/(auth)/login/page.tsx (a Client Component) calls `authClient.signIn.email(...)`; directly confirmed it performs no pre-existing-session check before rendering the form.

Server-side session resolution: web/src/lib/auth/session.ts's `getSession()` calls `auth.api.getSession({headers: await headers()})` — an in-process lookup (no network hop) reading the incoming request's cookies and querying the session table directly via Prisma. `requireSession()` / `requireAdmin()` `redirect()` on failure; `checkAuth()` / `checkAdmin()` return a discriminated `{authenticated, ...}` result for use inside Server Actions (both call the identical underlying `getSession()`). web/src/app/(app)/layout.tsx is the **single** central gate for the entire authenticated app — it calls `requireSession()` once, and all 14 routes under (app) inherit that check; there is no per-route re-check except three files that redundantly call `requireSession()` again (customers/[id]/page.tsx, loans/[id]/page.tsx, and profile/page.tsx — all three directly confirmed).

Supabase Auth (GoTrue) is never used for sign-in anywhere in web/: no call to `supabase.auth.signInWithPassword/signUp/signIn/getUser/getSession` exists anywhere in web/src (confirmed by repo-wide search in prior recon; corroborated directly here by reading web/src/lib/supabase/client.ts and server.ts, both of which are otherwise-orphaned — see §11).

### 8.2 backend/ — validates web/'s better-auth session directly against the shared database, with a Supabase-JWT fallback; JWT_SECRET is unused

`JwtAuthGuard` (backend/src/modules/auth/guards/jwt-auth.guard.ts) does **not** verify a locally-signed JWT despite its name. `extractTokenFromRequest` reads, in priority order: an `Authorization: Bearer` header; then a cookie **literally named** `better-auth.session_token` (both via a parsed cookies object and a regex fallback against the raw `Cookie` header) — i.e. the guard is explicitly written to recognize better-auth's own cookie format.

That token is passed to `AuthService.validateToken` (backend/src/modules/auth/auth.service.ts), which:

1. Calls `AuthRepository.findSessionByToken` (backend/src/modules/auth/auth.repository.ts) — a raw, parameterized SQL query, `SELECT id, "userId", token, "expiresAt" FROM "session" WHERE token = $1 AND "expiresAt" > NOW() LIMIT 1`, executed through `SupabaseService.query()` (backend/src/database/supabase.service.ts), which runs on a plain `node-postgres` `Pool` built directly from `DATABASE_URL` — **not** through Prisma, and **not** through the Supabase JS SDK. This is the exact same physical `session` table that web/'s better-auth Prisma adapter writes rows into (both subsystems' `session`/`user` models are defined identically at the same line numbers in their respective, byte-identical schema.prisma files). If a live row is found, it looks up the `user` row by id (again raw SQL) and returns it if `isActive`.
2. **Only if that lookup misses** does it fall back to `AuthRepository.verifySupabaseJwtUser` — calling `supabase.auth.getUser(token)` against a Supabase client built with the service-role (or anon) key (backend/src/database/supabase.service.ts) — i.e. verifying the token as a genuine Supabase-issued JWT.

**Conclusion, directly verified against source, not inferred**: backend/ authenticates a request by looking up a live better-auth session token directly in the same Postgres table web/'s better-auth instance owns — this is what lets backend/ recognize a web/-issued session without the two services ever calling each other over HTTP — falling back to Supabase Auth JWT verification only when no session row matches (a path that, per the above, nothing in web/ currently exercises, since web/ never performs a Supabase Auth sign-in). `JwtAuthGuard.canActivate` additionally rejects any resolved user whose `isActive` is false (`403`). backend/.env.example declares a `JWT_SECRET` variable; grepping backend/src for `JWT_SECRET` returns zero matches (confirmed directly for this document) — it is dead configuration, never read anywhere.

### 8.3 What this means architecturally

There is no independent "backend/ login" — a user only ever authenticates through web/'s better-auth flow (or, in principle, a direct Supabase Auth sign-in that nothing in this codebase currently performs). backend/ is a second reader of that same session state, not a second identity provider. Cross-origin auth from the browser to backend/ (§5.1 step 4) depends on the better-auth session cookie surviving a cross-origin request via `withCredentials: true`; web/src/lib/auth.ts sets no `crossSubDomainCookies`/cookie-domain configuration and backend/src/main.ts's `app.enableCors()` takes no options — whether this cookie is actually honored in any real deployed topology depends on the deployment's domain layout, which is **Unknown** from source alone.

---

## 9. Authorization / RBAC

**Subsystem: both.**

### 9.1 Roles

The shared Prisma `Role` enum (web/prisma/schema.prisma = backend/prisma/schema.prisma) has 5 values: `PLATFORM_OPERATOR, OWNER, ADMIN, BRANCH_MANAGER, STAFF`. backend/'s `TeamRole` DTO enum (backend/src/modules/organizations/dto/team-member.dto.ts) has only 4 (no `PLATFORM_OPERATOR`) — presumably intentional, since platform operators are not meant to be invited as an org's own team member.

### 9.2 web/ authorization

Enforced centrally at web/src/app/(app)/layout.tsx via `requireSession()` (any authenticated, active, role-bearing user may enter the (app) tree). Beyond that single gate, role checks are inconsistent across routes:

- web/src/app/(app)/admin/settings/page.tsx and web/src/app/(app)/admin/staff/page.tsx each manually call `checkAuth()` and hand-check `auth.user?.role !== "ADMIN"` before `redirect("/dashboard")` — this **duplicates**, rather than calls, the already-existing `requireAdmin()` helper in web/src/lib/auth/session.ts (which would redirect to `/login?error=unauthorized_admin` instead).
- web/src/app/(app)/platform-admin/page.tsx calls `checkAuth()` and assigns the result, but **never branches on it** — no role check, no redirect. It server-renders every organization's billing/loan/branch/user data and an inline plan-change control (`PlanSelectorClient`). As written, any authenticated, active, role-bearing user (STAFF or ADMIN alike) who clears the (app) layout's `requireSession()` gate can view this route. The plan-change Server Action it wires to (`changeOrganizationPlanAction`, web/src/app/(app)/platform-admin/actions.ts) does add one further gate, directly confirmed: it calls `checkAuth()` again, and then — only if `process.env.PLATFORM_ADMIN_EMAIL` is set and does not match the caller's email — requires the caller's own `role` (freshly looked up via Prisma) to be `"ADMIN"`. Two consequences follow directly from this: (1) `PLATFORM_ADMIN_EMAIL` is not present in web/.env.example, web/.env, or web/.env.prod, so by default this entire secondary check is skipped and any authenticated, active user can change any organization's billing plan; and (2) even when `PLATFORM_ADMIN_EMAIL` is configured, the check accepts a plain org-scoped `ADMIN` role — not `PLATFORM_OPERATOR` specifically — so any organization's own regular admin, not just a platform operator, can pass it.

### 9.3 backend/ authorization — RolesGuard requires JwtAuthGuard to have already run, but OrganizationsController never applies JwtAuthGuard

`RolesGuard` (backend/src/modules/auth/guards/roles.guard.ts) reads `request.user` and: if the route carries no `@Roles(...)` metadata, it returns `true` immediately with **no check of `request.user` at all**; if it does carry `@Roles(...)`, it throws 401 when `request.user` is `undefined`, 403 when `isActive` is false, and 403 when the user's role is not in the required list. The **only** place `request.user` is ever assigned anywhere in backend/ is inside `JwtAuthGuard.canActivate` (`request.user = user`).

`OrganizationsController` (backend/src/modules/organizations/organizations.controller.ts, confirmed directly) applies `@UseGuards(RolesGuard)` at the class level and **never applies `JwtAuthGuard`** — unlike `CustomersController` and `StorageController`, which both apply `JwtAuthGuard`. There is no global `APP_GUARD` anywhere in backend/ that would populate `request.user` ahead of `RolesGuard` for this controller. The consequence, confirmed by reading both guards and the controller directly:

- `GET :orgId/policy` and `GET :orgId/members` carry no `@Roles()` decorator → `RolesGuard` returns `true` immediately, with no authentication check of any kind. `getMembers` returns every team member's id/name/email/role/phone/isActive for the given `orgId` (backend/src/modules/organizations/organizations.repository.ts's `getTeamMembers`) to anyone who can reach the route, despite the controller carrying `@ApiBearerAuth()` (a Swagger-only annotation with no runtime effect).
- `PUT :orgId/policy`, `POST :orgId/members/invite`, `PATCH :orgId/members/:userId/role`, `DELETE :orgId/members/:userId` all carry `@Roles('OWNER','ADMIN')` → `RolesGuard` checks `request.user`, which is always `undefined` here → these four routes **always** throw 401, for any caller, with any credentials, as currently wired.
- Even setting the guard-chain bug aside, nothing anywhere in the request chain compares the authenticated caller's own organization against the `:orgId` path parameter — `OrganizationsService`/`OrganizationsRepository` act on whatever `orgId` string is supplied. `AuthUserDto` (the type of `request.user`, backend/src/modules/auth/dto/auth-user.dto.ts: `{id, name, email, role, phone, isActive}`) has no `organizationId` field at all, so even a correctly-guarded version of this controller could not check org membership today without first extending that DTO.

Practically, none of this is exercised today: web/'s UI never calls any of organizationsApi.ts's 6 endpoints (a repo-wide search finds no importer of `organizationsApi`, its hook names, `OrganizationPolicy`, or `TeamMember` anywhere in web/src outside the file itself) — this is dead-on-the-frontend, live-but-broken-on-the-backend code (see §13.1).

`OrganizationsRepository.addTeamMember` (backend/src/modules/organizations/organizations.repository.ts) also has a distinct correctness issue relevant to RBAC: it `prisma.user.upsert({where:{email}, ...})`s a team-member invite — since `user.email` is globally unique (not scoped per-organization), inviting an email that already belongs to a user in a **different** organization silently reassigns that user's `organizationId`/`role`/`branchId` to the inviting org, with no ownership check. Separately, the operation sets no password or credential of any kind on the row it upserts: the `user` model does carry a `passwordHash String?` column (web/prisma/schema.prisma:177), but `addTeamMember`'s create/update payloads never populate it, and no `account` row (better-auth's own credential table) is ever created — unlike web/'s own equivalent flow (`createStaffUserAction`, web/src/app/(app)/admin/staff/actions.ts), which calls `auth.api.signUpEmail` to provision a real better-auth credential before promoting the role. If this endpoint is ever wired to a UI, it would create unusable (no-login) staff accounts.

### 9.4 Tenant isolation (organizationId) — the RLS layer exists but nothing in either subsystem currently activates it

**Subsystem: both.** backend/sql/rls_policies.sql (backend-only file, no web/ counterpart) enables Postgres Row-Level Security on 12 tables — Organization (SELECT-only policy, keyed on `id`), plus a uniform `FOR ALL ... USING ("organizationId" = current_user_organization_id()) WITH CHECK (...)` policy on Branch, LoanPolicy, DocumentType, Customer, KycDocument, Loan, LoanItem, LoanCharge, Payment, LedgerEntry, FollowUp (confirmed by reading the full file for this document). `current_user_organization_id()` resolves via `COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), (SELECT "organizationId" FROM "user" WHERE id = auth.uid() LIMIT 1))`.

Two structural facts undercut this as currently wired:

1. **The `user` table itself — despite carrying its own `organizationId`/`branchId` columns identical in shape to every protected table — is absent from the `ENABLE ROW LEVEL SECURITY` list entirely.** It has no RLS and no policy at all.
2. **Nothing in either subsystem's application code ever sets `app.current_organization_id`.** The only place that session variable is ever set anywhere in the repository is `runWithTenantContext()` (web/src/lib/supabase/server.ts), which wraps `SELECT set_config('app.current_organization_id', $1, true)` inside a Prisma transaction — but a repo-wide search finds **zero callers** of `runWithTenantContext` anywhere in web/ or backend/. Both subsystems' Prisma clients (web/src/lib/db.ts, backend/src/database/prisma.service.ts) and backend/'s raw `pg.Pool` (backend/src/database/supabase.service.ts) run every query as one ambient, non-per-tenant connection with no session variable ever set. The `auth.uid()` fallback branch also would not resolve for a better-auth-only session, since better-auth sessions carry no Supabase JWT.

In practice, tenant isolation today is enforced (where it is enforced at all) by explicit `where: {organizationId}` filters written directly into application code (e.g. web/src/lib/services/customers.ts) — not by the database layer the RLS file's own header comment calls "Load-Bearing" (backend/sql/rls_policies.sql:1: "-- Pawnify - Load-Bearing Row-Level Security (RLS) Policies"). backend/'s customer search (§5.1, step 7) is a confirmed example of a query that has **no filter at either layer**: no `organizationId` in the Prisma `where` clause, and no RLS enforcement activating to compensate. Whether the Postgres role behind the real `DATABASE_URL` is a table-owner/superuser role that would bypass RLS regardless (Postgres does not apply `ENABLE ROW LEVEL SECURITY`, without `FORCE`, to the owning role) is **Unknown** from source alone — `backend/.env.example` templates `DATABASE_URL` as connecting via the `postgres` role, which is consistent with, but does not prove, that risk.

This directly conflicts with .agents/context.md's and .agents/decisions.md's framing of RLS as "load-bearing" and independently "verified" (.agents/context.md: "Load-Bearing RLS: Row-Level Security enforced at Postgres level. Tenant CRUD uses Supabase client SDK carrying authenticated JWTs; Prisma reserved for schema migrations and service-role cross-tenant admin operations"; .agents/decisions.md, DEC-001: "PostgreSQL Row-Level Security is load-bearing... Verification: Tested via src/__tests__/rls-isolation.test.ts") — the one test file named for this purpose, web/src/__tests__/rls-isolation.test.ts, filters a hardcoded in-memory JavaScript array (`records.filter(r => r.organizationId === "org-a")`) and never touches Prisma, Postgres, or any application code; it would pass regardless of whether real tenant isolation exists. Current code — not the historical notes — is authoritative per project convention, and the gap between the two is recorded here explicitly as required. It is also a second, independent divergence from those notes: current code's tenant CRUD (customers, loans, followups, settings, staff — see §13.3) is written almost entirely against `prisma.*` directly, not the "Supabase client SDK carrying authenticated JWTs" that .agents/context.md describes as the intended tenant-CRUD path.

---

## 10. Caching

**Subsystem: both.** Directly checked; stated precisely rather than assumed.

- **Client-side (web/):** RTK Query provides an in-memory cache with tag-based invalidation (web/src/lib/redux/api/baseApi.ts's `tagTypes`) — this is real and is the only caching layer with genuine invalidation logic in the system.
- **External-API response cache (both subsystems, independently):** the `AppSetting` Postgres table is used as a persisted cache of live gold/silver spot-rate lookups, refreshed on a fallback chain (primary external API → secondary external API → last-cached DB value → hardcoded default). This exists **twice**, independently: backend/src/modules/market-rates/market-rates.service.ts and web/src/lib/services/market-rates.ts. See §13 for the confirmed behavioral divergence between the two copies.
- **No Redis, Memcached, or other distributed/in-memory server cache** exists in either subsystem — neither backend/package.json nor web/package.json declares such a dependency (directly checked for this document).
- **Next.js framework-level caching** (router cache, fetch cache): web/next.config.ts is an empty configuration object with no custom `images`, `headers()`, or caching-related settings — any caching behavior here would be unmodified Next.js defaults, and since this app's data flows through Server Actions and direct Prisma calls rather than `fetch()` against its own routes, the framework's fetch-cache machinery is largely not in play. Whether any route sets explicit `Cache-Control` response headers was not exhaustively checked across every file — **Unknown** beyond what is stated here.
- **Beyond the above: None found.** There is no CDN-layer caching configuration, no HTTP cache middleware, and no query-result cache (e.g. a Prisma extension) in either subsystem.

---

## 11. Storage (files/documents)

**Subsystem: both, with a clear split between what is live and what is orphaned.**

The live, currently-used upload path is backend/-hosted: `POST /api/storage/upload` (backend/src/modules/storage/storage.controller.ts, guarded by `JwtAuthGuard`, using `FileInterceptor('file')` with **no options object** — no file-size limit, no mimetype/extension allowlist, so Multer's bare defaults apply). `StorageService.uploadFile` (backend/src/modules/storage/storage.service.ts) sanitizes the filename (`replace(/[^a-zA-Z0-9.-]/g, '_')`), prefixes it with `Date.now()_`, and uploads to a Supabase Storage bucket (default `pawnify-docs`) via `SupabaseService.getClient().storage.from(bucketName).upload(...)`. If the Supabase client was never initialized (missing env vars), it silently returns a fabricated fallback URL (`/uploads/fallback/<originalname>`) with no backing file and no error surfaced to the caller. web/'s own upload widget (web/src/components/document-uploader.tsx) calls this backend/ endpoint directly via `axiosClient.post("/storage/upload", formData, ...)` — bypassing the RTK Query layer entirely for this one operation.

web/ also has its **own**, separate, currently-**orphaned** Supabase Storage helper: `uploadToSupabaseBucket` (web/src/lib/supabase-storage.ts), targeting the same `pawnify-docs` bucket. A repo-wide search finds no caller of it anywhere in web/src — it has been functionally superseded by the backend/ route above but was never deleted. Two more Supabase client helpers in web/src/lib/supabase/ (client.ts, server.ts — including the RLS-activating `runWithTenantContext` and the `createTenantSupabaseClient`/`createAdminSupabaseClient` pair) are likewise never called from anywhere else in web/src (directly confirmed by reading both files for this document and repo-wide searching for each exported name — every match is the definition itself).

---

## 12. Third-party integrations

**Subsystem: both, itemized.**

| Integration | Used by | Purpose | Notes |
|---|---|---|---|
| Supabase (Postgres hosting) | both | DATABASE_URL target in production | Both subsystems' Prisma clients point at it independently (§2) |
| Supabase Auth (Admin API) | backend/ only | `supabase.auth.getUser(token)` fallback in AuthRepository.verifySupabaseJwtUser | Only reachable if a caller presents a genuine Supabase JWT — web/ never issues one (§8) |
| Supabase Storage | backend/ (live), web/ (orphaned helper) | File/document uploads | See §11 |
| better-auth | web/ only (backend/ reads its tables) | Session/credential management | web/src/lib/auth.ts, prismaAdapter — see §8 |
| Dodo Payments (migrated from Stripe) | backend/ only | Billing-plan webhook consumer | `dodopayments` SDK (v2.42.2) added to backend/package.json; real HMAC-SHA256 signature verification via `client.webhooks.unwrap()`, verified working via curl (§6) |
| goldprice.org, open.er-api.com, api.gold-api.com | both, independently | Live gold/silver spot-rate sourcing | Two independent implementations with diverging fallback behavior — see §13 |
| Vercel | web/ (deployment target, per web/vercel.json) | Hosting + Cron | Cron entry targets a route that no longer exists in web/ (§6) |

---

## 13. Duplicated, transitional, and settled components

**This section directly answers "what is duplicated/transitional versus settled," per the framing constraint for this document.**

### 13.1 Migration status by functional area

| Area | web/ | backend/ | Status |
|---|---|---|---|
| Authentication (sign-in, session) | Owns it (better-auth) | Reads web/'s session table directly; no independent login | **Settled** — this is the intended integration shape, not a transitional artifact |
| Loans, payments, interest, valuation, closure | Full implementation (web/src/lib/services/{loans,payments,interest,valuation}.ts) | **None** — no Loan/Payment model is touched anywhere in backend/src (a grep finds hits only in the unrelated LoanPolicy config model) | **Not yet migrated** — entirely web/-resident |
| Followups, dashboard, reports, billing quotas, staff/admin settings | Full implementation | **None** | **Not yet migrated** — entirely web/-resident |
| Customer search (typeahead) | Own implementation exists too (web/src/lib/services/customers.ts's `searchCustomers`, unused) | `GET /customers/search` (backend/src/modules/customers) | **Duplicated**, and backend/'s copy has a confirmed tenant-isolation gap (§5.1, §9.4) that web/'s equivalent function does not have |
| Market rates (gold/silver spot price) | Full implementation (web/src/lib/services/market-rates.ts), still invoked from the admin settings "refresh" action | Full, independent implementation (backend/src/modules/market-rates), invoked from the live ticker + loan-creation valuation widget | **Duplicated and already diverged** — see §13.2 |
| Organization LoanPolicy read/write | `saveLoanPolicyAction` (web/src/app/(app)/onboarding/actions.ts) | `OrganizationsController`/`OrganizationsRepository` | **Duplicated**; the two write paths are not even field-equivalent (web/'s onboarding action also writes `weightUnit`/`purityExpression`/`dayCountConvention`, which backend/'s upsert never touches) |
| Team/staff invite | `createStaffUserAction` (web/src/app/(app)/admin/staff/actions.ts) — provisions a real login credential via better-auth | `OrganizationsRepository.addTeamMember` — provisions no credential at all | **Duplicated and behaviorally inconsistent**; backend/'s copy is unreachable from any UI today (§9.3), so this is latent, not yet a live incident |
| File/document storage | Orphaned helper (web/src/lib/supabase-storage.ts) plus 2 orphaned Supabase client helpers | Live `POST /storage/upload` | **Settled onto backend/** — web/'s own path is dead code that should be removed, not a parallel live implementation |
| Prisma schema/seed | web/prisma/schema.prisma, web/prisma/seed.ts | Byte-identical copies at backend/prisma/schema.prisma, backend/prisma/seed.ts | **Duplicated by file copy**, actively drift-prone — no tooling keeps them in sync (§2) |
| Cron scheduling (market-rate refresh trigger) | Stale `vercel.json` entry pointing at a route that no longer exists | Real `GET`/`POST /cron/update-rates` endpoint, but nothing self-schedules it | **Transitional / broken** — the trigger mechanism was migrated without updating what points at it |

### 13.2 Confirmed drift: market-rates duplication (P1)

**Subsystem: both.** backend/src/modules/market-rates/market-rates.service.ts and web/src/lib/services/market-rates.ts each independently implement the identical four-stage fallback (primary GoldPrice.org API → secondary open.er-api.com + gold-api.com API → cached AppSetting row → hardcoded/env default) against the same AppSetting keys, and the two copies have already diverged in at least four verified ways:

1. backend/'s `getConfiguredDefaults()` derives its last-resort gold/silver defaults purely from env vars, defaulting to **0** if unset (`parseFloat(process.env.DEFAULT_GOLD_RATE_PER_GRAM || '0')`); web/'s `DEFAULT_RATES` hardcodes `goldRatePerGram: 7850.0` / `silverRatePerGram: 98.5` regardless of env — the same two numeric values are directly confirmed hardcoded a second time in web/src/components/live-market-ticker.tsx's own local `DEFAULT_RATES` fallback constant.
2. In the secondary-API fallback, backend/ uses `fxData?.rates?.INR` with **no substitute value** (a missing rate silently aborts that fallback branch, since the subsequent `if (inrPerUsd && ...)` check fails); web/ uses `fxData?.rates?.INR || 86.5`.
3. The cached-DB-rate reuse guard differs: backend/ only checks `existing.goldRatePerGram > 0`; web/ additionally requires `!existing.lastUpdated.includes("Default")`.
4. backend/ timestamps a successful update as `` `${new Date().toISOString()} IST` `` — `toISOString()` produces UTC, so this **mislabels a UTC timestamp as IST**; web/ correctly formats via `toLocaleString("en-IN", {timeZone: "Asia/Kolkata", ...})`.

Both copies are live simultaneously: web/src/app/(app)/loans/new/page.tsx and web/src/components/live-market-ticker.tsx call the RTK Query hooks that hit **backend/'s** `GET /market-rates` and `POST /cron/update-rates` (confirmed directly in this document — see live-market-ticker.tsx's imports of `useGetMarketRatesQuery`/`useRefreshMarketRatesMutation` and its 15-minute polling call). web/src/app/(app)/admin/settings/actions.ts's `fetchLiveSpotRatesAction` instead dynamically imports and calls **web/'s own** `fetchAndSaveLiveMetalRates` directly, bypassing backend/ entirely. In a pawn-lending application, gold/silver rate and the derived LTV math directly determine loan disbursement amounts — this is a financial-correctness-relevant duplication, not cosmetic.

### 13.3 web/'s own internal layering drift (architecture inconsistency, not cross-subsystem duplication)

**Subsystem: web/ only.** Several Server Action files bypass web/'s own established service-layer convention (thin action → `web/src/lib/services/*.ts` → Prisma) and instead embed Prisma calls and business rules directly:

- web/src/app/(app)/loans/[id]/actions.ts's `deleteLoanAction` runs 6 sequential Prisma calls (loanItem.deleteMany, payment.deleteMany, loanCharge.deleteMany, ledgerEntry.deleteMany, followUp.deleteMany, loan.delete) and web/src/app/(app)/customers/[id]/actions.ts's `deleteCustomerAction` runs 8 (kycDocument.deleteMany, loanItem.deleteMany, payment.deleteMany, loanCharge.deleteMany, ledgerEntry.deleteMany, followUp.deleteMany, loan.deleteMany, customer.delete) — **neither is wrapped in a `prisma.$transaction`** — a mid-sequence failure would leave orphaned payment/ledger/loan-item rows, exactly the failure mode web/src/lib/services/payments.ts's own header comment calls a "data-integrity incident, not a bug" elsewhere in the same codebase.
- web/src/app/(app)/admin/staff/actions.ts embeds all staff-account business rules (role-escalation-after-signup via `auth.api.signUpEmail` followed by a direct `role` promotion write, self-demotion/self-deactivation/self-deletion guards, email-uniqueness checks, delete-blocked-by-historical-loans) directly in the action file; no `web/src/lib/services/staff.ts` exists.
- web/src/app/(app)/followups/actions.ts embeds all follow-up CRUD and an overdue-task-flag calculation directly; no `followups.ts` service exists.
- web/src/app/(app)/reports/actions.ts loads entire `loan`/`payment`/`loanCharge` tables with no filtering and hand-rolls a reimplementation of the overdue/active split that `deriveLoanDisplayStatus` (already exported from web/src/lib/services/loans.ts) already provides, inline — the two implementations currently agree only because `LoanStatus` has just `ACTIVE`/`CLOSED` values today.
- web/src/app/(app)/admin/settings/actions.ts's `saveSettingsAction` bypasses the already-existing atomic `updateSettings()` helper (web/src/lib/services/settings.ts, wrapped in one `prisma.$transaction` over an array of upserts) in favor of looping a single-field `updateSetting()` call per setting — a save failing partway through leaves some settings updated and others not.

None of this is a backend/-vs-web/ conflict; it is evidence that web/'s own service-layer boundary, while real and followed in most of the codebase (customers/actions.ts, dashboard/actions.ts, and all of web/src/lib/services/*.ts itself), is not uniformly enforced.

### 13.4 What is genuinely settled

- better-auth as the sole identity provider, with backend/ reading its tables directly rather than re-implementing auth (§8).
- The Decimal-only monetary/weight math discipline (`Prisma.Decimal` throughout web/src/lib/services/{valuation,interest,payments}.ts, matching `Decimal(12,2)`/`Decimal(10,4)` columns in the shared schema) — verified real, not aspirational.
- The atomic payment waterfall and Serializable-isolation loan/payment transactions (§5.2) — verified real and load-bearing.
- backend/'s Swagger/OpenAPI documentation surface (backend/src/main.ts, mounted at `/docs`) — a genuine, decorator-driven API contract, even though the API it documents is only partially usable end-to-end (see §9.3).

---

## 14. Database: one schema, two clients

**Subsystem: both.** See §2 for the byte-identity confirmation and drift risk. In summary: 17 models, 12 enums (directly counted from web/prisma/schema.prisma, which is byte-identical to backend/prisma/schema.prisma), no soft-delete field anywhere in the schema (no `deletedAt`/`isDeleted`-shaped field exists; directly confirmed by search — all deletion is hard-delete, cascading from Organization down through nearly the whole tenant tree except `user`, which uses `SetNull` for both its `organization` and `branch` relations). No `prisma/migrations` directory exists in either subsystem (confirmed absent, despite web/prisma.config.ts declaring a `migrations.path` of `"prisma/migrations"`) — schema changes are applied via `prisma db push` (web/package.json's `db:push` script); backend/package.json has no equivalent `db:*` scripts at all, meaning backend/'s copy of the schema can currently only be regenerated by manually re-copying web/'s file.

---

## 15. Deployment reality check

**Subsystem: both.** Directly relevant to "how they relate today," since none of the paths below currently work end-to-end as committed.

- docker-compose.yml (repo root) defines only `db` and `app` services. `app.build.context: "."`, `dockerfile: "Dockerfile"` resolves to a root-level Dockerfile that does not exist — the only Dockerfile in the repository is web/Dockerfile. `db`'s init-mount, `./sql/rls_policies.sql`, also does not resolve — the real file is at backend/sql/rls_policies.sql. There is **no service defined for backend/ at all**. The `app` service does hardcode its own `DATABASE_URL`/`DIRECT_URL` pointing at the compose-local `db` service directly in the compose file (see §2) — a mechanism independent of any `.env` file.
- web/Dockerfile follows Next.js's standard 3-stage "standalone output" pattern (`deps` → `builder` → `runner`, `COPY .../.next/standalone`), but web/next.config.ts never sets `output: "standalone"` (confirmed directly — the file is a literal empty config object, `const nextConfig: NextConfig = {/* config options here */};`), so that directory would never exist for the final `COPY` to succeed. The Dockerfile's `CMD ["npm", "start"]` also does not match the standalone-output convention's usual `CMD ["node", "server.js"]` (and matches package.json's own `"start": "next start"` script instead).
- web/package.json currently pins `"next": "^9.3.3"` (confirmed directly) — a version that predates the App Router, Route Handlers, and Middleware entirely, despite web/src/app being a complete App Router tree and web/package.json's own `eslint-config-next` devDependency being pinned at `16.2.10`. This is **confirmed, not merely suspected, to be an uncommitted regression**: `git log --all -- package.json` shows every commit reachable from HEAD — including the very first ("Initial commit from Create Next App") — pinning `"next": "16.2.10"`, matching `eslint-config-next`'s version exactly. The `"^9.3.3"` value exists only in the current, uncommitted working-tree copy at web/package.json; it was never committed. This is consistent with an accidental edit made while copying/restructuring the file into web/, not an intentional downgrade.
- backend/ has no Dockerfile, no CI/CD configuration, and no PaaS config (Procfile, render.yaml, railway.json, fly.toml — confirmed absent by repo-wide search) anywhere in the repository — it compiles (`nest build`) but has no defined way to run anywhere outside a manually-provisioned host.
- There is no .github directory anywhere in the repository (outside node_modules) — no CI/CD pipeline of any kind for either subsystem.
- The entire backend/+web/ split, docker-compose.yml, and .agents/ directory are **untracked in git** as of this document (`git status` shows backend/, web/, docker-compose.yml, and .agents/ as `??`, alongside dozens of `D` entries for the pre-restructure flat-layout files — package.json, prisma/schema.prisma, next.config.ts, etc. — that were moved into web/ without `git mv`); the current HEAD commit (`git ls-tree`) still reflects the pre-restructure flat single-app layout, including a root-level vercel.json. Whatever is actually deployed in production today, if anything, predates everything described in this document.

---

## 16. Open questions (explicitly Unknown)

- How backend/'s `PrismaService` resolves an actual database connection at runtime, given its schema has no datasource url and it has neither a `prisma.config.ts` nor a `@prisma/adapter-pg`-based adapter (web/ uses both). Not verified by executing the app.
- How web/ obtains a `DATABASE_URL` in any deployment topology other than the local docker-compose one, given none of web/.env, web/.env.example, or web/.env.prod define `DATABASE_URL` or `DIRECT_URL` at all, yet web/src/lib/db.ts and web/prisma.config.ts both read those variables unconditionally (§2). Presumably supplied via the hosting platform's own environment configuration (e.g. a Vercel project's dashboard), but this is not established by any file in the repository.
- Whether the Postgres role behind the real, deployed `DATABASE_URL` is a table-owner/superuser role that bypasses RLS regardless of policy content — this determines whether backend/sql/rls_policies.sql has any live effect at all. Not determinable from source.
- Whether any external scheduler outside this repository has been pointed at backend/'s `/api/cron/update-rates`, given web/vercel.json's own cron entry can no longer reach it.
- Whether cross-origin, cookie-based auth (web/ browser → backend/ via `axiosClient`) actually succeeds in any real deployed topology, given no explicit cross-subdomain cookie configuration exists in web/src/lib/auth.ts and backend/'s CORS is fully open rather than explicitly configured for credentialed cross-origin requests.
- Whether backend/ is deployed anywhere today at all, given the gaps in §15.

---

*This document describes source as read on 2026-07-11. Where backend/ and web/ diverge from the pre-restructure .agents/*.md notes, current source has been treated as authoritative per project convention; the divergences recorded above (RLS non-activation vs. "load-bearing" framing in .agents/context.md and .agents/decisions.md; Prisma-for-tenant-CRUD vs. the notes' Supabase-client-for-tenant-CRUD framing) are the most consequential and are not hypothetical — each is backed by a direct file citation above.*