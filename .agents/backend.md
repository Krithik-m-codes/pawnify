# Pawnify Backend (NestJS API)

## Scope of this document

This document describes exclusively backend/, the new, partial NestJS 11 API service in the Pawnify monorepo. web/ (the mature Next.js 15 App Router application with Prisma, Supabase, better-auth, and Redux Toolkit Query) is referenced only for comparison, where backend/ code explicitly couples to it (shared Prisma schema, shared Postgres database, shared better-auth session/user tables, a shared env-file fallback), where web/'s own browser-side code explicitly couples to backend/ (a real, verified, bidirectional relationship — see "Relationship between backend/ and web/"), or where a business domain web/ still owns has no backend/ equivalent yet. Nothing here implies web/'s server-side logic is deprecated — verified call sites are cited wherever a claim depends on web/ still being live.

Every module directory, controller, service, repository, guard, DTO, and the main.ts/app.module.ts bootstrap were read directly from source while preparing this document (backend/src/**). The one runtime claim that cannot be established by reading source alone — whether the compiled server actually boots — was independently reproduced twice by running the compiled build (see "Database access layer" below). Facts that could not be verified from the repository are marked Unknown rather than guessed, per the reporting rules for this document.

One correction to this document's own brief: the task instructions describe backend/ as having "only 7 modules... auth, cron, customers, health, market-rates, organizations, storage, webhooks." That name list has 8 entries, and a direct directory listing of backend/src/modules confirms 8 module folders, each with its own *.module.ts: auth, cron, customers, health, market-rates, organizations, storage, webhooks. This document treats "8" as the correct count and uses the identical 8-name list from the brief.

## Status headline

backend/ does not start in its current state. This was verified directly, twice: running `node dist/main.js` from within backend/ against the pre-existing compiled build (backend/dist, produced by `nest build`) with a backend/.env file present in the working tree produced an immediate crash during Nest's dependency-injection phase, before any route could be reached:

```
[Nest] LOG [InstanceLoader] AppModule dependencies initialized
[Nest] LOG [InstanceLoader] ConfigModule dependencies initialized
[Nest] ERROR [ExceptionHandler] PrismaClientInitializationError: `PrismaClient` needs to be constructed with a non-empty, valid `PrismaClientOptions`
    at new PrismaService (backend\dist\database\prisma.service.js:13:39)
    at Injector.instantiateClass (backend\node_modules\@nestjs\core\injector\injector.js:430:19)
    ...
  clientVersion: '7.8.0'
```

One precision note on that `backend/.env` file: `git ls-files backend/.env backend/.env.example backend/.env.prod` returns nothing, and `git check-ignore -v` confirms backend/.env and backend/.env.prod are matched by backend/.gitignore's own `.env` / `.env.prod` rules, while backend/.env.example is simply untracked (never `git add`-ed). All three exist on disk in this working tree but none are part of the committed repository — a fresh clone would not have them. This does not change the crash's cause (below), which is independent of any env-var value, but it means "the repository's own backend/.env" should be read as "a backend/.env file present in this working tree," not as committed, canonical repository content.

The root cause and its relationship to web/'s working equivalent are covered in "Database access layer." Every other finding in this document (routes, guards, validation, business logic) describes what the source code does, independent of whether the process currently boots.

## At a glance

| Aspect | Value | Source |
|---|---|---|
| Framework | NestJS 11 (@nestjs/common, @nestjs/core, @nestjs/platform-express all ^11.0.1; @nestjs/config ^4.0.4; @nestjs/swagger ^11.4.5) | backend/package.json |
| Entry point | backend/src/main.ts | backend/src/main.ts |
| Default port / prefix | 3001 / api, overridable via PORT / API_PREFIX | backend/src/config/configuration.ts, backend/src/main.ts |
| API docs | Swagger UI at /docs, mounted outside the /api prefix | backend/src/main.ts |
| Primary ORM | Prisma (@prisma/client ^7.8.0 runtime, prisma CLI ^6.19.3 — major-version mismatch between the two) | backend/package.json |
| Secondary DB client | @supabase/supabase-js ^2.110.2 (service-role client) plus a raw pg ^8.22.0 Pool, both inside one SupabaseService | backend/src/database/supabase.service.ts |
| Module count | 8 directories under backend/src/modules: auth, cron, customers, health, market-rates, organizations, storage, webhooks | backend/src/app.module.ts |
| Total HTTP routes | 15 (2 auth + 1 customers + 1 health + 1 market-rates + 6 organizations + 1 storage + 1 webhooks + 2 cron) | see "Full HTTP route inventory" |
| Background job system | None. No @nestjs/schedule dependency, no @Cron() decorator, no Bull/BullMQ anywhere in backend/src | grep across backend/src and backend/package.json, zero matches |
| Test coverage | Zero working tests. No *.spec.ts exists anywhere under backend/src; the only test file is unmodified NestJS CLI boilerplate asserting a route this app does not define | backend/test/app.e2e-spec.ts, backend/src/app.module.ts |
| Boot status | Crashes during DI, before listen() — reproduced directly (see above) | backend/src/database/prisma.service.ts |
| Called from web/'s browser code | Yes, for 3 of 8 modules (market-rates, cron, customers, storage — see below); a 4th (organizations) is wired in web/'s Redux layer but has zero UI consumers today | web/src/lib/axiosClient.ts and web/src/lib/redux/api/*.ts — see "Relationship between backend/ and web/" |

## Repository layout under backend/

```
backend/
  src/
    main.ts                       — bootstrap
    app.module.ts                 — root module, imports Config/Database + all 8 feature modules (10 imports total)
    common/
      filters/http-exception.filter.ts
      interceptors/logging.interceptor.ts
    config/
      config.module.ts
      configuration.ts
    database/
      database.module.ts
      prisma.service.ts
      supabase.service.ts
    modules/
      auth/  cron/  customers/  health/  market-rates/  organizations/  storage/  webhooks/
  prisma/
    schema.prisma                 — byte-identical to web/prisma/schema.prisma
    seed.ts                       — byte-identical to web/prisma/seed.ts, but imports a path that does not exist in backend/ (see below)
  sql/
    rls_policies.sql              — Postgres Row-Level Security policies; no backend/ or web/ code applies this file automatically
  test/
    app.e2e-spec.ts, jest-e2e.json — unmodified NestJS CLI scaffold
  nest-cli.json, tsconfig.json, tsconfig.build.json, package.json, package-lock.json
  .gitignore, .prettierrc, eslint.config.mjs
  .env, .env.example, .env.prod    — all three untracked in git (see "Status headline")
  README.md                       — unmodified NestJS "Nest framework TypeScript starter" boilerplate; no project-specific setup instructions
```

Two structural notes worth flagging explicitly:

- backend/prisma/seed.ts imports `{ auth } from "../src/lib/auth"`, which resolves (relative to backend/prisma/) to backend/src/lib/auth.ts — a path that does not exist; backend/src has no lib/ directory at all (confirmed by directory listing). The identical seed.ts file exists at web/prisma/seed.ts, where that same relative import correctly resolves to web/src/lib/auth.ts (the better-auth instance, confirmed present). This indicates backend/prisma/seed.ts was copied from web/ without being adapted to backend/'s own, much thinner src/ layout, and cannot currently execute from within backend/ as-is (backend/prisma/seed.ts, web/src/lib/auth.ts).
- backend/package.json declares `"license": "MIT"` (as does web/package.json), but the actual root LICENSE file at the repo root is Business Source License 1.1, converting to MIT on 2029-07-01 (Licensor: Pawnify Cloud Inc.) — a minor metadata inconsistency between the package manifests and the real license text (backend/package.json, web/package.json, LICENSE).

## Bootstrap and request pipeline (main.ts)

backend/src/main.ts's `bootstrap()` runs, in this exact order:

1. `NestFactory.create(AppModule)` — instantiates the whole app, which is where the Prisma crash described above actually occurs (during eager instantiation of the globally-imported DatabaseModule).
2. Reads `apiPrefix` and `port` from ConfigService, with in-code fallbacks `'api'` and `3001` that duplicate configuration.ts's own defaults (redundant but consistent).
3. `app.setGlobalPrefix(apiPrefix)`.
4. `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))` — one global pipe for the whole app.
5. `app.useGlobalFilters(new AllExceptionsFilter())` and `app.useGlobalInterceptors(new LoggingInterceptor())` — both instantiated with plain `new`, not Nest's `APP_FILTER`/`APP_INTERCEPTOR` DI-token pattern. Neither class currently declares constructor dependencies, so this has no functional effect today, but neither could receive an injected dependency (e.g. ConfigService) without being refactored into a provider.
6. `app.enableCors()` — called with zero arguments. No CORS_ORIGIN or equivalent env var is read anywhere in backend/src (grep-confirmed). The underlying `cors` package's own default export (backend/node_modules/cors) is `{ origin: '*', methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', preflightContinue: false, optionsSuccessStatus: 204 }` — no `credentials` key at all, meaning `Access-Control-Allow-Credentials` is never sent. This is more than a cosmetic gap: web/'s own axios client sets `withCredentials: true` on every request it sends to this API (see "Relationship between backend/ and web/"), and per standard Fetch/CORS semantics a browser refuses to expose a credentialed response when the server echoes a wildcard `Access-Control-Allow-Origin: *` without also allowing credentials — so, independent of whether backend/ can boot, its current CORS configuration would likely block web/'s own credentialed cross-origin calls to it whenever the two are served from different origins.
7. Builds and mounts Swagger: `DocumentBuilder` (title "Pawnify SaaS API", version "1.0.0", `addBearerAuth()`), `SwaggerModule.setup('docs', app, document)` — mounted at `/docs`, independent of the `/api` global prefix.
8. `app.listen(port)`, followed by two `Logger.log` lines reporting the port/prefix and the docs path.

(backend/src/main.ts)

Swagger is a real, working setup, not scaffolding: controllers across every module decorate routes with `@ApiTags`/`@ApiOperation`/`@ApiResponse`, and DTOs use explicit `@ApiProperty`/`@ApiPropertyOptional`. backend/nest-cli.json has no `compilerOptions.plugins` entry (no `@nestjs/swagger` CLI plugin registered), so none of this schema metadata is auto-inferred from TypeScript types — every documented field is a hand-written decorator (backend/nest-cli.json, and every *.controller.ts / *.dto.ts under backend/src/modules).

## Module dependency graph

backend/src/app.module.ts imports exactly 10 modules into AppModule (ConfigModule, DatabaseModule, HealthModule, AuthModule, CustomersModule, MarketRatesModule, StorageModule, CronModule, WebhooksModule, OrganizationsModule — counted directly from the `imports` array); AppModule itself declares no controllers or providers of its own (there is no app.controller.ts or app.service.ts in backend/src — only app.module.ts).

| Module | Global? | Notes |
|---|---|---|
| ConfigModule | Yes (@Global()) | backend/src/config/config.module.ts |
| DatabaseModule | Yes (@Global()) | Provides/exports both PrismaService and SupabaseService app-wide; backend/src/database/database.module.ts |
| HealthModule | No | backend/src/modules/health/health.module.ts |
| AuthModule | Yes (@Global()) | Exports AuthService, JwtAuthGuard, RolesGuard app-wide; backend/src/modules/auth/auth.module.ts |
| CustomersModule | No | backend/src/modules/customers/customers.module.ts |
| MarketRatesModule | No | backend/src/modules/market-rates/market-rates.module.ts |
| StorageModule | No | backend/src/modules/storage/storage.module.ts |
| CronModule | No | Explicitly imports MarketRatesModule — the only feature-to-feature module import anywhere in the graph; backend/src/modules/cron/cron.module.ts |
| WebhooksModule | No | backend/src/modules/webhooks/webhooks.module.ts |
| OrganizationsModule | No | Explicitly re-imports the already-global DatabaseModule — redundant but harmless; backend/src/modules/organizations/organizations.module.ts |

No other cross-feature imports exist. Guards/decorators from AuthModule (JwtAuthGuard, RolesGuard, @Roles, @CurrentUser) are consumed by name in customers/storage/organizations controllers purely because AuthModule is global — this is a DI-availability fact, not a module import (backend/src/app.module.ts and each listed module file).

## Configuration and environment variables

ConfigModule (backend/src/config/config.module.ts) wraps `@nestjs/config`'s `ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env', '../web/.env'] })` inside its own `@Global()` module. The `envFilePath` array is a deliberate cross-subsystem coupling: backend/ loads its own .env first, then falls back to the sibling web/.env — so backend/ can pick up variables defined only there (e.g. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY, confirmed present in web/.env, which configuration.ts falls back to below). dotenv-style `envFilePath` entries resolve relative to the process's working directory, so this fallback only reaches web/.env when the compiled app is actually launched with backend/ as the current directory (the normal way to run it, and how this document's own crash reproduction was run).

configuration.ts (backend/src/config/configuration.ts) is a factory registering only five top-level ConfigService keys:

| Key | Env var(s) | Default |
|---|---|---|
| env | NODE_ENV | 'development' |
| port | PORT | 3001 |
| apiPrefix | API_PREFIX | 'api' |
| database.url | DATABASE_URL | '' |
| supabase.url | SUPABASE_URL, then NEXT_PUBLIC_SUPABASE_URL | '' |
| supabase.anonKey | SUPABASE_ANON_KEY, then NEXT_PUBLIC_SUPABASE_ANON_KEY | '' |
| supabase.serviceRoleKey | SUPABASE_SERVICE_ROLE_KEY | '' |

No validation schema of any kind is passed to `ConfigModule.forRoot()` — no Joi, no `validate` function. A missing DATABASE_URL or Supabase key silently resolves to an empty string and the app still attempts to boot; there is no fail-fast startup check anywhere in backend/src/config (backend/src/config/config.module.ts, backend/src/config/configuration.ts).

Several environment variables the app actually consumes bypass ConfigService entirely and are read directly via `process.env` inside feature code:

| Env var | Read directly in | Purpose |
|---|---|---|
| JWT_SECRET | Nowhere — declared in backend/.env.example and backend/.env.prod but has zero references anywhere in backend/src (grep-confirmed) | Vestigial/dead; see "Authentication" |
| CRON_SECRET | backend/src/modules/cron/guards/cron-auth.guard.ts | Shared-secret bearer check for /cron endpoints |
| DODO_PAYMENTS_API_KEY | backend/src/modules/webhooks/webhooks.service.ts | Bearer token for the `dodopayments` SDK client; endpoint returns 501 if unset |
| DODO_PAYMENTS_WEBHOOK_KEY | backend/src/modules/webhooks/webhooks.service.ts | Used by the SDK's `client.webhooks.unwrap()` to verify a real HMAC-SHA256 signature (see "Known defects" — this is now a resolved finding, not merely a presence check like the old `STRIPE_WEBHOOK_SECRET` it replaces) |
| DODO_PAYMENTS_ENVIRONMENT | backend/src/modules/webhooks/webhooks.service.ts | Selects the SDK environment (`test_mode` or `live_mode`) |
| DEFAULT_GOLD_RATE_PER_GRAM, DEFAULT_SILVER_RATE_PER_GRAM, VALUATION_SAFETY_MARGIN_PERCENT, LTV_TIER1_PERCENT, LTV_TIER2_PERCENT, LTV_TIER3_PERCENT, LTV_TIER1_MAX, LTV_TIER2_MAX, DEFAULT_INTEREST_MONTHLY, DEFAULT_GRACE_DAYS, PAN_THRESHOLD | backend/src/modules/market-rates/market-rates.service.ts | Env-derived fallback defaults when the AppSetting table has no cached value |

backend/.env.example and backend/.env.prod used to declare the identical key set (PORT, API_PREFIX, NODE_ENV, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, JWT_SECRET, CRON_SECRET, STRIPE_WEBHOOK_SECRET), but the two have since diverged: when the billing webhook migrated from Stripe to Dodo Payments, backend/.env.example (and the untracked working-tree backend/.env) were updated to replace STRIPE_WEBHOOK_SECRET with three new variables — DODO_PAYMENTS_API_KEY, DODO_PAYMENTS_WEBHOOK_KEY, DODO_PAYMENTS_ENVIRONMENT — but backend/.env.prod was not: directly confirmed, it still declares the old `STRIPE_WEBHOOK_SECRET=whsec_prod_stripe_webhook_secret` and has none of the three new Dodo Payments variables at all, a real, currently-live inconsistency this document did not previously have cause to flag. Neither backend/.env.example nor backend/.env.prod defines DIRECT_URL (relevant to the Prisma boot crash below). The untracked, working-tree backend/.env file (used for this document's crash reproduction) was directly inspected and contains the same placeholder shape as .env.example for the new keys — `DODO_PAYMENTS_API_KEY=your-dodo-payments-api-key`, `DODO_PAYMENTS_WEBHOOK_KEY=your-dodo-payments-webhook-key` — confirming this particular local file has not been filled in with real Dodo Payments credentials either (backend/.env.example, backend/.env.prod, backend/.env).

## Database access layer

Two independently-constructed, globally-provided database clients live in backend/src/database, both exported by the `@Global()` DatabaseModule with no imports of its own (backend/src/database/database.module.ts).

### PrismaService — the dominant runtime ORM, and why it cannot connect

backend/src/database/prisma.service.ts is:

```
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy
```

with no constructor override — an implicit, argument-free `super()`. `onModuleInit()` calls `this.$connect()` inside a try/catch that only `this.logger.warn(...)`s on failure rather than rethrowing, so a connection failure alone would not stop the app from starting; `onModuleDestroy()` calls `this.$disconnect()`.

backend/prisma/schema.prisma's `datasource db { provider = "postgresql" }` block has no `url` (or `directUrl`) field at all — confirmed by inspecting the full 435-line file. With `@prisma/client` at 7.8.0 (backend/package.json) and no static datasource URL, `PrismaClient` must be constructed with either a `datasourceUrl` option or a driver `adapter`; PrismaService supplies neither. backend/package.json has no `@prisma/adapter-pg` dependency (confirmed absent from backend/node_modules/@prisma, present in web/node_modules/@prisma), and there is no backend/prisma.config.ts anywhere in backend/ (confirmed by directory listing).

This is exactly the error reproduced directly against the compiled build (see "Status headline"): `PrismaClientInitializationError: PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions`, thrown from `new PrismaService` during `Injector.instantiateClass`, before the app finishes initializing providers. Because DatabaseModule is `@Global()` and eagerly imported by AppModule, and `NestFactory.create(AppModule)` does not resolve until this instantiation succeeds, this crash aborts the entire application boot — no route in any of the 8 modules is reachable, including auth and storage, which never touch PrismaService at all (they depend only on SupabaseService). Separately from that total-boot-failure fact, it is worth naming which modules would still need Prisma to actually function even if this specific crash were patched in isolation (e.g. by monkey-patching PrismaService to no-op): the 5 modules whose repositories inject PrismaService directly (customers, health, market-rates, organizations, webhooks) plus cron (which depends on market-rates transitively via CronModule's import).

Contrast with web/'s working pattern for the identical (byte-for-byte identical) schema: web/src/lib/db.ts builds a `pg.Pool` from `process.env.DATABASE_URL`, wraps it via `new PrismaPg(pool)` (`@prisma/adapter-pg`, a real dependency in web/package.json), and constructs `new PrismaClient({ adapter })`; web/prisma.config.ts separately supplies `datasource.url` from `DIRECT_URL || DATABASE_URL` for the Prisma CLI. backend/'s PrismaService replicates neither half of that pattern (backend/src/database/prisma.service.ts, backend/prisma/schema.prisma, backend/package.json, web/src/lib/db.ts, web/prisma.config.ts).

Despite this, Prisma is the dominant live-query engine for 5 of the 8 modules once/if it can connect — not merely "reserved for migrations" as the pre-restructure notes describe (see "Conflicts with historical notes" below):

| Module | Prisma calls | File |
|---|---|---|
| health | `this.prisma.$queryRaw\`SELECT 1\`` | backend/src/modules/health/health.repository.ts |
| customers | `this.prisma.customer.findMany(...)` | backend/src/modules/customers/customers.repository.ts |
| market-rates | `this.prisma.appSetting.findMany` / `.upsert` | backend/src/modules/market-rates/market-rates.repository.ts |
| organizations | `this.prisma.loanPolicy.findUnique` / `.upsert`; `this.prisma.user.findMany` / `.upsert` / `.updateMany` (×2) | backend/src/modules/organizations/organizations.repository.ts |
| webhooks | `this.prisma.organization.updateMany` | backend/src/modules/webhooks/webhooks.repository.ts |

### SupabaseService — two independent connections, narrow usage

backend/src/database/supabase.service.ts's `onModuleInit()` builds up to two separate things: (1) a Supabase-JS client via `createClient(supabaseUrl, serviceRoleKey-or-anonKey-fallback, { auth: { persistSession: false } })`, defaulting to the service-role key (which Supabase documents as bypassing RLS by design) — only if both a URL and a key resolve, else it logs a warning and leaves the client `undefined`; and (2) a completely separate raw `pg.Pool` built directly from `DATABASE_URL`, independent of whatever connection PrismaClient itself opens. `getClient()` / `getPool()` expose these; `query<T>(sql, params)` runs parameterized SQL directly against the pool, bypassing the Supabase JS SDK and any per-request auth/RLS context entirely. If DATABASE_URL is absent, `this.pool` is never assigned, and a later `query()` call would throw a `TypeError` rather than a handled error (backend/src/database/supabase.service.ts).

Usage is narrow — only two modules touch SupabaseService at all (grep-confirmed):

- auth (backend/src/modules/auth/auth.repository.ts) — raw SQL via `supabaseService.query()` against the better-auth `"session"`/`"user"` tables, plus `supabaseService.getClient().auth.getUser(token)` as a Supabase-JWT verification fallback.
- storage (backend/src/modules/storage/storage.service.ts) — Supabase Storage `.upload()` / `.getPublicUrl()`.

### Row-Level Security: policies exist, but nothing in backend/ activates them

backend/sql/rls_policies.sql enables `ROW LEVEL SECURITY` (never `FORCE ROW LEVEL SECURITY`) on 12 tables — Organization, Branch, LoanPolicy, DocumentType, Customer, KycDocument, Loan, LoanItem, LoanCharge, Payment, LedgerEntry, FollowUp — gated by a `current_user_organization_id()` SQL function that reads `current_setting('app.current_organization_id', true)`, falling back to an `auth.uid()`-keyed lookup against the `"user"` table. Organization itself gets only a `FOR SELECT` policy (no INSERT/UPDATE/DELETE policy at all); the other 11 tables get a `FOR ALL` tenant-isolation policy (backend/sql/rls_policies.sql).

Two gaps, read directly from the SQL file and from backend/src:

1. The `"user"` table — which carries the exact same `organizationId`/`branchId` tenant-scoping columns as every protected domain table (backend/prisma/schema.prisma) — is absent from the `ENABLE ROW LEVEL SECURITY` list entirely. Under standard Postgres semantics, a table with RLS not enabled is fully readable/writable by any role holding ordinary table privileges.
2. Nothing in backend/src ever sets `app.current_organization_id` (grep-confirmed, zero matches across backend/src). Neither PrismaService (a single shared, non-per-tenant client) nor SupabaseService's pool (a single admin-style connection) authenticates per-request as a specific tenant principal.

Because `ENABLE ROW LEVEL SECURITY` (without `FORCE`) exempts the table owner from all policies on that table, whether any of this matters in practice depends entirely on which Postgres role DATABASE_URL connects as — a table-owning or superuser role (backend/.env.example templates the `postgres` role) would bypass RLS regardless of policy content. This is Unknown from source alone; it was not verified against a live database role. Consistent with this gap, backend/src/modules/customers/customers.repository.ts's only method, `searchCustomers()`, queries `prisma.customer.findMany()` with no `organizationId` filter in its `where` clause at all — confirmed directly by reading the file — meaning its tenant isolation, if any, depends entirely on RLS actually being enforced against whatever role backend/ connects as.

## Authentication

backend/src/modules/auth implements a small, custom, non-Passport session-validation layer — it validates sessions/tokens that something else already issued; it never issues one itself. AuthController (backend/src/modules/auth/auth.controller.ts) exposes exactly two routes, both read-only, both behind JwtAuthGuard:

- `GET /api/auth/me` — returns the caller's AuthUserDto via the `@CurrentUser()` decorator (a trivial `request.user` pass-through).
- `GET /api/auth/session` — returns `{ authenticated: true, user }`.

There is no login, logout, register, or password-reset endpoint anywhere in backend/src/modules/auth — credential-based sign-in remains entirely on the web/ side.

### What JwtAuthGuard actually verifies

Despite its name, JwtAuthGuard (backend/src/modules/auth/guards/jwt-auth.guard.ts) does not verify a token signed with JWT_SECRET — that env var is declared in backend/.env.example/.env.prod but has zero references anywhere in backend/src, confirmed by grep; it is dead configuration. There is also no `passport` / `passport-jwt` / `@nestjs/passport` dependency in backend/package.json — this is a fully custom guard, not NestJS's standard Passport-JWT strategy.

`extractTokenFromRequest` pulls a token from, in order: the `Authorization: Bearer` header; a cookie literally named `better-auth.session_token`; or a regex match for that same cookie name inside a raw `Cookie` header — that exact cookie name is better-auth's own default session cookie (backend/src/modules/auth/guards/jwt-auth.guard.ts). `AuthService.validateToken` (backend/src/modules/auth/auth.service.ts, 67 lines) then, inside one try/catch: looks up `AuthRepository.findSessionByToken` (raw SQL: `SELECT id, "userId", token, "expiresAt" FROM "session" WHERE token = $1 AND "expiresAt" > NOW() LIMIT 1` against a plain `pg.Pool` (backend/src/database/supabase.service.ts) — a plain expiry/equality lookup, no cryptographic signature check of any kind); if a session row is found, it then loads the user by ID and returns it only if that user exists and `isActive`. Whether or not that first path succeeds, the method then also tries `AuthRepository.verifySupabaseJwtUser`, which calls `supabase.auth.getUser(token)` (genuine Supabase Auth token verification, run against a client authenticated with the service-role key — not the SDK's separate `auth.admin.*` namespace, just the ordinary `getUser()` call given an explicit token) and returns that result if it yields an active user. So the Supabase-JWT path is attempted whenever the session-table path did not already produce an active user (no session row, no matching user row, or an inactive user), not strictly "only if no session row was found."

(backend/src/modules/auth/auth.repository.ts)

`AuthService.checkAuthStatus(token?)` wraps `validateToken` with an authenticated/error envelope (`{authenticated, user}` or `{authenticated: false, error}`) — but it is never called from anywhere else in backend/src (grep-confirmed): AuthController's two routes go through JwtAuthGuard directly and never invoke this method. `checkAuthStatus` is currently dead code.

This was verified directly against web/: web/src/lib/auth.ts constructs `betterAuth({ database: prismaAdapter(prisma, { provider: "postgresql" }) })` with no visible Supabase-JWT bridging/plugin, and web/src/app/api/auth/[...all]/route.ts wraps it via `toNextJsHandler(auth)` — confirming web/'s actual authentication engine is a self-hosted, Prisma-backed better-auth instance, not Supabase Auth directly, and confirming web/src/app/api contains no other route besides this one (directory listing). backend/prisma/schema.prisma's `"user"`/`"session"`/`"account"`/`"verification"` models (explicitly labeled "BETTER AUTH TABLES" in the schema) are byte-identical to web/prisma/schema.prisma's copy. So the relationship between backend/'s auth layer and web/'s better-auth is a shared-Postgres-data relationship — backend/ directly reads session rows that web/'s better-auth already wrote — not a shared signing secret and not shared code; the two are separate npm projects with independently duplicated authorization logic. One concrete confirmation of that duplication, directly verified: backend/'s `checkAuthStatus` and web/src/lib/auth/session.ts's `checkAuth` use the identical literal error strings `"Not authenticated. Please sign in."` and `"Access denied: User account inactive or missing role."` despite being independently written, unshared TypeScript.

A minor, directly observed gap: AuthSessionDto (backend/src/modules/auth/dto/auth-session.dto.ts) declares an optional `sessionId` field, but AuthController.getSession (backend/src/modules/auth/auth.controller.ts) never populates it — it returns only `{ authenticated: true, user }` — whereas web/'s equivalent `checkAuth()` does return a real `sessionId` (`session.session.id`, confirmed directly in web/src/lib/auth/session.ts).

## Authorization (roles)

`@Roles(...roles: string[])` (backend/src/modules/auth/decorators/roles.decorator.ts) is a thin `SetMetadata('roles', roles)` wrapper accepting arbitrary strings, not bound to any TypeScript enum. RolesGuard (backend/src/modules/auth/guards/roles.guard.ts) reads that metadata via `Reflector.getAllAndOverride`:

- If no `@Roles(...)` metadata is present on the route, it returns `true` immediately — without even checking whether `request.user` exists.
- If roles are declared, it requires `request.user` to already be populated (401 otherwise), requires `user.isActive` (403 otherwise), and requires `requiredRoles.includes(user.role)` (403 otherwise).

The canonical `Role` enum lives in the shared Prisma schema: `PLATFORM_OPERATOR`, `OWNER`, `ADMIN`, `BRANCH_MANAGER`, `STAFF` (backend/prisma/schema.prisma). AuthUserDto.role is typed as a plain `string`, so backend/'s auth layer does not statically constrain it to that enum. The only place `@Roles(...)` is used anywhere in backend/src is OrganizationsController, always as `@Roles('OWNER', 'ADMIN')`, on 4 of its 6 routes.

### Critical defect: OrganizationsController never applies JwtAuthGuard

OrganizationsController (backend/src/modules/organizations/organizations.controller.ts) is decorated only with `@UseGuards(RolesGuard)` at the class level — verified directly by reading the file. It never imports or applies JwtAuthGuard and never uses `@CurrentUser()`. The only place `request.user` is ever assigned anywhere in backend/src is inside `JwtAuthGuard.canActivate` (backend/src/modules/auth/guards/jwt-auth.guard.ts). There is no global guard anywhere (no `APP_GUARD` provider in backend/src/app.module.ts, no auth middleware in backend/src/main.ts) that would populate `request.user` ahead of RolesGuard for this controller. Consequences, read directly off RolesGuard's own logic:

- `GET :orgId/policy` and `GET :orgId/members` carry no `@Roles(...)` decorator, so RolesGuard's "no required roles → return true" branch fires immediately — these two routes are completely unauthenticated. `GET :orgId/members` returns id/name/email/role/phone/isActive/createdAt for every user in that organization (backend/src/modules/organizations/organizations.repository.ts's `getTeamMembers`) — real staff PII, retrievable by anyone who can supply an `orgId`, despite the controller carrying `@ApiBearerAuth()` (a Swagger-only cosmetic annotation with no runtime effect).
- The four `@Roles('OWNER', 'ADMIN')` routes (`PUT :orgId/policy`, `POST :orgId/members/invite`, `PATCH :orgId/members/:userId/role`, `DELETE :orgId/members/:userId`) always hit RolesGuard's "no user on request → throw 401" branch, because `request.user` is always `undefined` for this controller. These four routes can never succeed for any caller, with any credentials, in the current code.

By contrast, CustomersController and StorageController both correctly apply `@UseGuards(JwtAuthGuard)` at the controller level (backend/src/modules/customers/customers.controller.ts, backend/src/modules/storage/storage.controller.ts).

Even setting the guard bug aside, nothing in the request chain ties the caller to the `:orgId` in the URL — OrganizationsController passes `@Param('orgId')` straight through OrganizationsService to OrganizationsRepository with no comparison against the caller's own organization anywhere. AuthUserDto (the type of `request.user`) has no `organizationId` field at all, so a correctly-guarded version of this controller could not check org membership today without first extending AuthUserDto/AuthService. Practical effect once the missing-guard bug is fixed in isolation: any authenticated OWNER/ADMIN of any organization could mutate any other organization's policy or team by supplying a different `orgId` path segment (backend/src/modules/organizations/organizations.controller.ts, backend/src/modules/organizations/organizations.service.ts, backend/src/modules/organizations/organizations.repository.ts, backend/src/modules/auth/dto/auth-user.dto.ts).

Note on web/ consumption of this specific module: see "Relationship between backend/ and web/" — web/'s own Redux layer fully mirrors all 6 of these routes, but currently calls none of them.

## Module reference

### auth — session/role recognition

Purpose: recognize sessions/tokens issued elsewhere (better-auth on web/, or Supabase Auth) and expose the resulting identity to guards. Does not issue credentials.

| File | Role |
|---|---|
| auth.module.ts | `@Global()`; controllers: [AuthController]; providers: [AuthService, AuthRepository, JwtAuthGuard, RolesGuard]; exports all three besides AuthRepository |
| auth.controller.ts | GET /auth/me, GET /auth/session, both behind JwtAuthGuard |
| auth.service.ts (67 lines) | `validateToken(token)` — session-row lookup, falling through to a Supabase-JWT check whenever the session path doesn't yield an active user; `checkAuthStatus(token?)` — wraps validateToken with an authenticated/error envelope, but is never called anywhere in backend/src (dead code, grep-confirmed) |
| auth.repository.ts | `findSessionByToken`, `findUserById` (raw SQL via SupabaseService's pg Pool), `verifySupabaseJwtUser` (Supabase Auth's `getUser(token)`, called against a service-role-authenticated client) |
| guards/jwt-auth.guard.ts | Extracts bearer token / better-auth cookie; calls AuthService.validateToken; sets `request.user` |
| guards/roles.guard.ts | Generic Reflector-metadata role check (see "Authorization" above) |
| decorators/current-user.decorator.ts, roles.decorator.ts | Trivial `request.user` pass-through; `SetMetadata('roles', roles)` |
| dto/auth-user.dto.ts, dto/auth-session.dto.ts | Output-only Swagger DTOs, no class-validator (these are responses, not request bodies) |

### customers — typeahead search only

Purpose: a single typeahead search endpoint. This is a thin, new, parallel surface — it is not a replacement for web/'s customer CRUD (see "What backend/ does not yet implement") — but it is a real, live dependency of one specific web/ screen (see below).

- Route: `GET /api/customers/search?q=` — behind JwtAuthGuard (backend/src/modules/customers/customers.controller.ts).
- Request DTO: CustomerSearchQueryDto — `q?: string`, `@IsOptional() @IsString()` (backend/src/modules/customers/dto/customer-search-query.dto.ts).
- Response DTO: CustomerSummaryDto — id, fullName, phone, city (output-only) (backend/src/modules/customers/dto/customer-summary.dto.ts).
- Service (27 lines): defaults a missing query to `''` and returns `[]` if the resulting string is shorter than 2 characters — there is no whitespace trimming, so a query consisting of exactly two space characters would pass this length check and reach the repository; otherwise delegates to the repository with `limit=10`, catching any error into a generic 500 (backend/src/modules/customers/customers.service.ts).
- Repository: `prisma.customer.findMany` with a case-insensitive `OR` `contains` match on `fullName`/`phone`, `select` limited to id/fullName/phone/city, ordered by `fullName`. No `organizationId` filter anywhere in the query — see "Known defects" (backend/src/modules/customers/customers.repository.ts).
- Consumed by web/: web/'s "new loan" page (web/src/app/(app)/loans/new/page.tsx) calls this exact endpoint through `useLazySearchCustomersQuery` (web/src/lib/redux/api/customersApi.ts's `searchCustomers` endpoint, `url: "/customers/search"`), via axios (web/src/lib/axiosClient.ts), to drive its customer-typeahead field and to resolve a `?customerId=` URL param on load. This is a real, live HTTP dependency, not unused surface. The consuming code itself only reads `.fullName`/`.phone`/`.city` off each result (matching CustomerSummaryDto exactly, via its own locally-declared `CustomerSearchResult` interface) — though customersApi.ts's own TypeScript generic for this endpoint declares a different, non-matching shape (`phonePrimary`, `email`, `kycStatus`, `activeLoanCount`, none of which exist on CustomerSummaryDto or on the real Customer Prisma model). That mismatch is a cosmetic type-declaration inconsistency inside web/'s Redux layer, not a runtime defect, since the actual page ignores that generic and uses its own correctly-shaped local interface.

### health — public liveness/DB check

- Route: `GET /api/health` — no guard, intentionally public (backend/src/modules/health/health.controller.ts).
- Response DTO: status, database, timestamp, optional error (backend/src/modules/health/dto/health-response.dto.ts).
- Service (33 lines): on success returns `{status:'healthy', database:'connected', timestamp}`; on failure throws a 503 with `{status:'unhealthy', database:'disconnected', error, timestamp}` (backend/src/modules/health/health.service.ts).
- Repository: `this.prisma.$queryRaw\`SELECT 1\`` (backend/src/modules/health/health.repository.ts). Given the PrismaService boot crash, this route cannot currently be reached at all — the process exits before Nest finishes wiring providers.

### market-rates — cached spot-rate and LTV-parameter store

Purpose: serve cached gold/silver spot rates and LTV/interest/grace-period parameters that drive loan valuation; persistence is entirely through the generic AppSetting key-value table (backend/prisma/schema.prisma) — there is no dedicated "MarketRate" Prisma model despite the module's name.

- Route: `GET /api/market-rates` — no guard, public (backend/src/modules/market-rates/market-rates.controller.ts).
- Response DTOs: MarketRatesDto (12 fields: goldRatePerGram, silverRatePerGram, lastUpdated, safetyMarginPercent, source, ltvTier1/2/3Percent, ltvTier1/2Max, defaultInterestMonthly, defaultGraceDays, panThreshold) and MarketRatesResponseDto (`{success, rates}`) (backend/src/modules/market-rates/dto/market-rates-response.dto.ts).
- Service (205 lines — the largest .service.ts under backend/src/modules; the next-largest is auth.service.ts at 67 lines, so "roughly 3x" is accurate) has three responsibilities in one class, confirmed by direct read:
  1. `getConfiguredDefaults()` — builds a MarketRatesDto purely from the 11 env vars listed in "Configuration" above.
  2. `getMarketRates()` — reads 12 named AppSetting keys (`rate.gold.per_gram`, `rate.silver.per_gram`, `rate.last_updated`, `valuation.safety.margin`, `ltv.tier1/2/3.percent`, `ltv.tier1/2.max`, `interest.default.monthly`, `grace.period.days`, `pan.threshold`), falling back per-field to the env-var defaults; on any DB error, logs and returns the pure env-var defaults rather than throwing. This is the only method the public controller route calls.
  3. `fetchAndSaveLiveMetalRates()` — not exposed by MarketRatesController at all; only invoked from CronController. Tries a primary external API (`https://data-asg.goldprice.org/dbXRates/INR`), falls back to a secondary combination (`https://open.er-api.com/v6/latest/USD` + `https://api.gold-api.com/price/XAU` + `/XAG`), converts troy-ounce USD spot prices to per-gram INR via the constant `31.1034768`, falls back further to whatever is already cached in the DB, then upserts `rate.gold.per_gram` / `rate.silver.per_gram` / `rate.last_updated`.
- Repository: `prisma.appSetting.findMany({where:{key:{in:keys}}})` and `prisma.appSetting.upsert(...)` — no Supabase usage (backend/src/modules/market-rates/market-rates.repository.ts).
- Consumed by web/, in parallel with a separate local implementation: web/'s own market-rates.ts (web/src/lib/services/market-rates.ts, 215 lines) independently re-implements the identical rate-fetching logic (same field set, same AppSetting key scheme, same 31.1034768 conversion constant) and remains directly exercised by web/'s settings page via a local Next.js Server Action (web/src/lib/redux/api/settingsApi.ts's `fetchLiveSpotRatesAction`, an `action:`-based endpoint — not an HTTP call to backend/). Separately, web/'s global app layout (web/src/app/(app)/layout.tsx, wrapping every authenticated route) renders `LiveMarketTicker` (web/src/components/live-market-ticker.tsx), which does call backend/'s real HTTP API — `GET /api/market-rates` on a 15-minute poll, plus `POST /api/cron/update-rates` via a manual "Refresh Spot" button — through web/src/lib/redux/api/marketRatesApi.ts and axios. So rate-fetching logic currently exists in three independent, unconsolidated places: backend/'s module, web/'s own local service, and web/'s separate wiring to backend/ for the global ticker. See "Relationship between backend/ and web/" for the full picture, including why the ticker's "Refresh Spot" button likely fails in a correctly-configured deployment.

### organizations — LoanPolicy and team RBAC

Purpose: per-organization loan-policy (LTV tiers, currency, grace period, mandatory-ID threshold) and team-member management. This is a new, narrower surface than web/'s equivalent admin screens and onboarding flow, which write the identical LoanPolicy table (web/src/app/(app)/onboarding/actions.ts, web/src/lib/services/valuation.ts).

6 routes, all under `@Controller('organizations')`, class-level `@UseGuards(RolesGuard)` + `@ApiBearerAuth()` (see the critical guard-chain defect above):

| Route | @Roles | Effective auth (current code) |
|---|---|---|
| GET :orgId/policy | none | Fully unauthenticated |
| PUT :orgId/policy | OWNER, ADMIN | Always 401 |
| GET :orgId/members | none | Fully unauthenticated |
| POST :orgId/members/invite | OWNER, ADMIN | Always 401 |
| PATCH :orgId/members/:userId/role | OWNER, ADMIN | Always 401 |
| DELETE :orgId/members/:userId | OWNER, ADMIN | Always 401 |

DTOs (backend/src/modules/organizations/dto/organization-policy.dto.ts, 104 lines; dto/team-member.dto.ts): UpdateOrganizationPolicyDto gives every scalar field (currencyCode, currencySymbol, gracePeriodDays, panThreshold, safetyMarginPercent, defaultInterestMonthly, ltvTier1/2/3Percent, ltvTier1/2Max) real `@IsNumber()`/`@IsString()`/`@Min()`/`@Max()` guards, but `ltvTiers` (an array of `{maxValue, ltvPercent}`) has only `@IsOptional() @IsArray()` — no `@ValidateNested({each:true})` + `@Type()` pairing, so per-element shape/range is entirely unvalidated. InviteTeamMemberDto/UpdateMemberRoleDto use `@IsEmail`, `@IsEnum(TeamRole)` (`OWNER`/`ADMIN`/`BRANCH_MANAGER`/`STAFF` — one member short of the Prisma `Role` enum, which also has `PLATFORM_OPERATOR`).

Service (59 lines) is a thin pass-through, adding only `NotFoundException` when role-update/removal affect zero rows (backend/src/modules/organizations/organizations.service.ts). Repository (159 lines, backend/src/modules/organizations/organizations.repository.ts) is Prisma-only:

- `getOrganizationPolicy` returns the raw LoanPolicy row if one exists (which, per the Prisma schema, has no `ltvTier1Percent`/`ltvTier2Max`/etc. columns — only `currencyCode`, `currencySymbol`, `weightUnit`, `purityExpression`, `dayCountConvention`, `gracePeriodDays`, `mandatoryIdThreshold`, `mandatoryIdDocTypeId`, `ltvTiers` (Json), timestamps), or a hand-built plain object with a structurally different shape (extra flat fields like `ltvTier1Percent` that never exist on a real DB row) if none exists yet — two different response shapes for the same endpoint, with no `type:` declared on the controller's `@ApiResponse`.
- `upsertOrganizationPolicy` merges `dto.ltvTiers ?? existing.ltvTiers ?? [fallback from flat dto fields]` — since `ltvTiers` is a required (non-nullable) Json column once a row exists, and the no-row fallback object also always populates a non-empty `ltvTiers` array, `existing.ltvTiers` is always truthy in practice, so sending only the flat `ltvTier1/2/3Percent`/`ltvTier1/2Max` fields (without a full `ltvTiers` array) silently leaves the stored JSON unchanged after the first write. `defaultInterestMonthly` and `safetyMarginPercent` pass DTO validation but are never persisted — the LoanPolicy Prisma model has no columns for either (confirmed directly against schema.prisma).
- `addTeamMember` does `prisma.user.upsert({ where: { email: dto.email }, ... })`. Because `email` is globally unique with no compound uniqueness against `organizationId` (confirmed: the `user` model's only relevant constraint is `email String @unique`), inviting an email that already belongs to a user in a different organization silently reassigns that user's `organizationId`/role/branchId/isActive to the inviting org — an account hijack with no consent check.
- `updateMemberRole` / `removeTeamMember` use `prisma.user.updateMany({ where: { id, organizationId } })` — these two are correctly org-scoped at the query level (unlike the guard layer above).

Note on web/ consumption: web/src/lib/redux/api/organizationsApi.ts defines RTK Query hooks mirroring all 6 of these routes field-for-field (its own `OrganizationPolicy` and `TeamMember` TypeScript interfaces match backend/'s shapes closely) — but none of its exported hooks (`useGetOrganizationPolicyQuery`, `useUpdateOrganizationPolicyMutation`, `useGetTeamMembersQuery`, `useInviteTeamMemberMutation`, `useUpdateTeamMemberRoleMutation`, `useRemoveTeamMemberMutation`) are imported anywhere else in web/src (grep-confirmed). web/'s actual settings/staff pages still call their own local server actions (settingsApi.ts, staffApi.ts, both exclusively `action:`-based, confirmed by reading every file under web/src/lib/redux/api/). So unlike customers/search, market-rates, and storage/upload, this module's web/-side wiring exists in code but is currently dead — plausibly the next domain queued for the local-action-to-backend/ migration this codebase appears to be mid-way through (see "Relationship between backend/ and web/").

### storage — file upload to Supabase Storage

- Route: `POST /api/storage/upload` — `@UseGuards(JwtAuthGuard)` at the class level (correctly authenticated), `FileInterceptor('file')` with no options object — no `limits.fileSize`, no `fileFilter` for mimetype/extension; Multer's own defaults apply (backend/src/modules/storage/storage.controller.ts, 59 lines).
- Handler signature: `uploadFile(@UploadedFile() file, @Body('bucket') bucket?: string)`, defaulting to `'pawnify-docs'` if omitted. `bucket` is a raw, unvalidated string extracted via property-scoped `@Body()`, bypassing the global ValidationPipe entirely since no DTO class is involved — any string the client sends is passed straight through as the target Supabase Storage bucket name with no allow-list.
- Service (66 lines): validates only `!file || !file.buffer` (400 otherwise); sanitizes the filename (`replace(/[^a-zA-Z0-9.-]/g, '_')`), prefixes with `Date.now()_`; if SupabaseService's client wasn't initialized (missing env vars), returns a fabricated fallback `{url: '/uploads/fallback/<name>', ...}` with no file actually written anywhere and no error surfaced; otherwise calls the real Supabase client's `.storage.from(bucketName).upload(...)` then `.getPublicUrl(...)` (backend/src/modules/storage/storage.service.ts).
- No repository file exists in this module — it talks to SupabaseService directly, no Prisma usage at all.
- Consumed by web/: three separate "use client" components call this endpoint directly via axios (web/src/lib/axiosClient.ts), bypassing web/'s Redux layer entirely — web/src/app/(app)/profile/profile-client.tsx (`axiosClient.post("/storage/upload", ...)` for avatar upload, `bucket: "pawnify-avatars"`), and web/src/components/document-uploader.tsx (`bucket` prop defaulting to `"pawnify-docs"`, overridden per caller), which is itself rendered from web/src/app/(app)/customers/new/page.tsx, web/src/app/(app)/loans/new/page.tsx, and the profile page. This is a real, live dependency — not additive/unused surface — and it confirms in practice that the bucket name really is caller-controlled in production usage (just never, in these three legitimate call sites, to an attacker-chosen value; see "Known defects").

### webhooks — Dodo Payments billing-plan sync (migrated from Stripe; real signature verification now implemented)

- Route: `POST /api/webhooks/dodo-payments` (formerly `POST /api/webhooks/stripe`) — no `JwtAuthGuard`/`RolesGuard` (backend/src/modules/webhooks/webhooks.controller.ts), which is expected for a public third-party webhook receiver: it authenticates the caller cryptographically instead (see Service below), not via a NestJS guard.
- Request binding: no DTO at all. The controller method takes `@Req() req: RawBodyRequest<Request>` and forwards `req.rawBody` (a raw `Buffer`) plus the request headers to the service. Raw-body capture is enabled globally via `NestFactory.create(AppModule, { rawBody: true })` in backend/src/main.ts — required because signature verification needs the exact original bytes, not Nest's re-serialized JSON. This supersedes the historical finding below about `StripeWebhookPayloadDto`: that DTO (and the entire `@Body()`-binding approach it represented) was deleted as part of the Stripe-to-Dodo-Payments migration, so the empirically-verified ValidationPipe/whitelist interaction that used to make this route unreachable through any JSON body no longer applies — there is no DTO left for `whitelist`/`forbidNonWhitelisted` to reject fields against.
- Historical finding, now resolved (retained for the record): this document previously verified empirically that `StripeWebhookPayloadDto`'s missing class-validator decorators, combined with the app's `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, caused every `{type, data}` JSON body to be rejected with 400 before `processStripeWebhook()` ever ran — meaning the route was non-functional for legitimate and forged requests alike — and that the moment someone fixed the DTO in isolation (e.g. adding `@IsOptional()`), the route would become exploitable, since no signature verification existed anywhere in the monorepo. Both halves of that finding are resolved by the same change: there is no more DTO to fix, and real signature verification exists.
- Service (backend/src/modules/webhooks/webhooks.service.ts): checks that `DODO_PAYMENTS_API_KEY` and `DODO_PAYMENTS_WEBHOOK_KEY` are both configured (501 if not, same fail-closed shape as the old Stripe check). It then constructs the official `dodopayments` npm SDK client — `new DodoPayments({ bearerToken: DODO_PAYMENTS_API_KEY, environment: DODO_PAYMENTS_ENVIRONMENT, webhookKey: DODO_PAYMENTS_WEBHOOK_KEY })` — and calls `client.webhooks.unwrap(rawBody.toString(), { headers })`. `unwrap()` performs genuine HMAC-SHA256 signature verification per the Standard Webhooks spec (the `dodopayments` package depends on the `standardwebhooks` package for this) and throws on an invalid or missing signature, which the service catches and turns into a real `401 { error: 'Invalid webhook signature' }` response — verified working end-to-end: a live curl POST with no valid signature headers against the running dev server returned exactly that 401. Only after `unwrap()` succeeds does the handler trust the payload: for `type` in `{"subscription.active", "subscription.renewed"}`, it reads `data.metadata.organizationId`/`planId` (default `'starter'`) and calls the repository; for `type` in `{"subscription.cancelled", "subscription.expired", "subscription.failed"}`, the same with `null`; any other event type is silently ignored, still returning `{received: true}`. The `stripe` npm package was never a dependency and still isn't — the SDK in use now is `dodopayments` (v2.42.2, added to backend/package.json), which has no official NestJS adapter (Dodo ships Express/Fastify/Next.js/etc. adapters but not Nest), explaining why this hand-wired raw-body-plus-`unwrap()` pattern is used instead of framework middleware.
- Repository (17 lines, unchanged by the migration): `prisma.organization.updateMany({ where: { id: organizationId }, data: { billingPlan: newPlan } })` — uses `updateMany` (not `update`), so an unknown `organizationId` matches zero rows and fails silently with no error surfaced (backend/src/modules/webhooks/webhooks.repository.ts). Because signature verification now gates every call into this repository, the historical risk this line used to describe — a forged event body granting a free plan upgrade with zero authenticity check — is closed: only a caller holding a valid Dodo Payments signature can reach this mutation.
- web/ still has no billing-webhook route of any kind today — web/src/app/api contains only `api/auth/[...all]/route.ts` (confirmed by directory listing). The pre-restructure note at .agents/decisions.md (DEC-004) describes a webhook handler at the old `/api/webhooks/stripe` location; that logic, as it exists today, lives entirely in this backend/ module, now against Dodo Payments rather than Stripe, and now with real signature verification.

### cron — HTTP-triggered rate refresh (no self-scheduling)

Purpose: expose an HTTP endpoint an external scheduler can call to refresh spot metal rates. It does not self-schedule.

- Routes: `GET /api/cron/update-rates` and `POST /api/cron/update-rates` — identical handlers, both calling `marketRatesService.fetchAndSaveLiveMetalRates()` and rethrowing a 500 if `result.success` is false. Both behind `@UseGuards(CronAuthGuard)` at the class level (backend/src/modules/cron/cron.controller.ts).
- CronModule imports MarketRatesModule explicitly (the only feature-to-feature import in the whole graph) and declares no providers of its own (backend/src/modules/cron/cron.module.ts).
- CronAuthGuard (backend/src/modules/cron/guards/cron-auth.guard.ts) reads `process.env.CRON_SECRET` directly (bypassing ConfigService, unlike the rest of the app's modeled config). If CRON_SECRET is unset or empty, `canActivate` returns `true` immediately — fail-open, not fail-closed. If set, it requires the literal `Authorization` header to equal `"Bearer " + CRON_SECRET` via plain string equality (not constant-time comparison). This is a completely independent auth mechanism from JwtAuthGuard/RolesGuard — a single shared-secret check meant for a scheduler, unrelated to user sessions or roles.
- A real, verified integration mismatch worth flagging here: web/'s `LiveMarketTicker`'s manual "Refresh Spot" button (web/src/components/live-market-ticker.tsx) calls this exact `POST` route via `useRefreshMarketRatesMutation` (web/src/lib/redux/api/marketRatesApi.ts), through axiosClient — which attaches whatever user session token it finds in `localStorage` (`access_token` or `better-auth.session_token`) as the `Authorization: Bearer` header, not `CRON_SECRET`. CronAuthGuard requires the header to equal the literal string `"Bearer " + CRON_SECRET`; an ordinary user's session token will not match that. So in any deployment where `CRON_SECRET` is actually set to a real, non-empty value — the intended production configuration — clicking this button in web/'s UI would always fail with CronAuthGuard's 401, not silently succeed. It would only appear to work in the (also insecure) fail-open case where `CRON_SECRET` is unset. See "Known defects."
- No self-scheduling exists anywhere: no `@nestjs/schedule` dependency, no `@Cron()` decorator anywhere in backend/src (grep-confirmed). The only scheduler configuration found in the repository is web/vercel.json, which defines a single Vercel Cron Job targeting `path: "/api/cron/update-rates", schedule: "0 0 * * *"` — a path on the web/ Next.js deployment, not on backend/. web/src/app/api currently contains no `cron` route at all (only `auth/[...all]`), so that Vercel cron config now targets a path that does not exist in web/. Whether any external scheduler has been reconfigured to target backend/'s deployment instead is Unknown from source alone.

## Background jobs and queues

There is no job-queue system anywhere in backend/: no Bull, BullMQ, `@nestjs/bull`, `@nestjs/bullmq`, or equivalent dependency in backend/package.json, and no in-process scheduler (`@nestjs/schedule`/`@Cron()`) either. The only construct resembling a "background job" is the cron module above, which is a plain, synchronously-handled HTTP endpoint — work happens entirely within the request/response cycle of whatever external caller hits it, with no retry, no dead-letter handling, and no persisted job state beyond the AppSetting rows it writes on success.

## Full HTTP route inventory

All routes sit under the global prefix `/api` (backend/src/main.ts, `apiPrefix` default `'api'`). 15 routes total across 8 modules:

| # | Route | Guard | Module |
|---|---|---|---|
| 1 | GET /api/auth/me | JwtAuthGuard | auth |
| 2 | GET /api/auth/session | JwtAuthGuard | auth |
| 3 | GET /api/customers/search | JwtAuthGuard | customers |
| 4 | GET /api/health | none (public) | health |
| 5 | GET /api/market-rates | none (public) | market-rates |
| 6 | GET /api/organizations/:orgId/policy | RolesGuard, no @Roles → effectively none | organizations |
| 7 | PUT /api/organizations/:orgId/policy | RolesGuard + @Roles(OWNER,ADMIN) → always 401 | organizations |
| 8 | GET /api/organizations/:orgId/members | RolesGuard, no @Roles → effectively none | organizations |
| 9 | POST /api/organizations/:orgId/members/invite | RolesGuard + @Roles → always 401 | organizations |
| 10 | PATCH /api/organizations/:orgId/members/:userId/role | RolesGuard + @Roles → always 401 | organizations |
| 11 | DELETE /api/organizations/:orgId/members/:userId | RolesGuard + @Roles → always 401 | organizations |
| 12 | POST /api/storage/upload | JwtAuthGuard | storage |
| 13 | POST /api/webhooks/dodo-payments | none (real HMAC-SHA256 signature check via the `dodopayments` SDK's `unwrap()`, not a NestJS guard) | webhooks |
| 14 | GET /api/cron/update-rates | CronAuthGuard | cron |
| 15 | POST /api/cron/update-rates | CronAuthGuard | cron |

Of these 15, web/'s own browser-side code is confirmed (via grep across all of web/src) to actually call routes 3, 5, 12, 14, and 15 today (routes 6–11 are mirrored in web/'s Redux layer but never invoked — see "Relationship between backend/ and web/"). Additionally, Swagger UI is mounted at `/docs` with no guard protecting it — the full API schema, including which routes carry `@ApiBearerAuth`, is publicly browsable if the app is reachable (backend/src/main.ts).

## Validation strategy

One global `ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })` applies to every route (backend/src/main.ts). This is functionally exercised, not vacuous — most request DTOs carry real class-validator decorators:

| DTO | Decorators present? |
|---|---|
| CustomerSearchQueryDto.q | Yes — @IsOptional, @IsString |
| UpdateOrganizationPolicyDto (all scalar fields) | Yes — @IsNumber/@IsString/@Min/@Max |
| UpdateOrganizationPolicyDto.ltvTiers | Partial — @IsOptional/@IsArray only, no per-element validation |
| InviteTeamMemberDto, UpdateMemberRoleDto | Yes — @IsEmail, @IsEnum, @IsNotEmpty |
| (no DTO — webhooks binds `@Req() req: RawBodyRequest<Request>` directly) | N/A — the old `StripeWebhookPayloadDto` (zero class-validator decorators) was deleted when the webhook migrated from Stripe to Dodo Payments; the endpoint is no longer `@Body()`-bound at all, so ValidationPipe's whitelist/forbidNonWhitelisted behavior no longer applies to it. Validation is now cryptographic instead: the `dodopayments` SDK's `client.webhooks.unwrap()` rejects any request with an invalid or missing signature before the payload is ever read — see "webhooks" above. |
| storage upload's `bucket` param | N/A — not a DTO at all; extracted via `@Body('bucket')`, bypassing the pipe entirely |

Output-only response DTOs (AuthUserDto, AuthSessionDto, CustomerSummaryDto, HealthResponseDto, MarketRatesDto/ResponseDto, UploadResponseDto) correctly carry only `@ApiProperty` Swagger decorators, no class-validator — they are never deserialized from client input.

## Error handling

AllExceptionsFilter (backend/src/common/filters/http-exception.filter.ts) is decorated `@Catch()` with no argument, catching every thrown value. `status` is `exception.getStatus()` for `HttpException` instances, else 500; `message` is `exception.getResponse()` for `HttpException`, else the literal string `'Internal server error'`. Most handlers throw `new HttpException({error: '...'}, status)` (confirmed across the auth/roles/jwt guards, customers, cron, health, and webhooks), so `getResponse()` is typically already an object in those cases — but this is not universal: storage.service.ts throws `new HttpException(stringMessage, status)` with a plain string in three places (`'No file provided'`, `error.message`, `message`), and the base `HttpException` class stores that string response as-is rather than auto-wrapping it (unlike Nest's own subclasses such as `NotFoundException`, which organizations.service.ts uses, and which does wrap a bare string into a `{statusCode, message, error}` object internally). It logs via Nest's `Logger` at error level (including the stack trace when the exception is an `Error`), then writes a fixed JSON envelope to the client: `{statusCode, timestamp, path, error}`, where `error` is `typeof message === 'object' ? message : { message }` — so regardless of which of the above shapes `message` took, the client always receives an object in the `error` field. No stack trace ever leaks into the client response. Every error response from the API has this identical top-level shape regardless of where it originated.

## Logging

LoggingInterceptor (backend/src/common/interceptors/logging.interceptor.ts) pipes `next.handle()` through RxJS `tap()` with a single (success-only) callback, logging `${method} ${url} ${statusCode} - ${duration}ms`. Because `tap()` here is given only a "next" handler, it never runs on the observable's error channel — a request that throws produces no log line from this interceptor at all. Failed requests are logged solely, and in a different format (no duration measurement), by AllExceptionsFilter's own `logger.error` call. There is no single unified access-log line covering both success and failure paths.

## Test coverage

No `*.spec.ts` file exists anywhere under backend/src (confirmed via directory search) — zero unit tests for any of the 8 modules. The only test file in the package is backend/test/app.e2e-spec.ts, unmodified NestJS CLI boilerplate: it imports AppModule, calls `app.init()`, and asserts `GET /` returns 200 `'Hello World!'`. AppModule registers no root controller and no module in the current graph handles bare `GET /`, so this test would fail on its own assertion even if the app could boot — and per "Database access layer," `app.init()` itself currently throws before that assertion is ever reached, since AppModule eagerly imports the `@Global()` DatabaseModule.

## Known defects and security-relevant findings

Ordered by severity; all were confirmed by direct source reading (and, where noted, direct execution) during this and prior review passes.

| Priority | Area | Finding | Files |
|---|---|---|---|
| RESOLVED 2026-07-11 (was P0, latent) | webhooks | Historically: no Stripe signature verification anywhere in the monorepo, no `stripe` SDK dependency, and the endpoint had no guard — though it was not reachable through a normal JSON body at the time, since the old `StripeWebhookPayloadDto` had zero class-validator decorators and the global ValidationPipe's `forbidNonWhitelisted: true` rejected any `{type, data}` body with a 400 before the handler ran (a one-line DTO fix would have made it live and exploitable). **Fix**: the integration was migrated from Stripe to Dodo Payments end-to-end. The DTO is gone — the endpoint now binds `@Req() req: RawBodyRequest<Request>` — and the handler verifies a real HMAC-SHA256 signature via the `dodopayments` SDK's `client.webhooks.unwrap()` before trusting any field, rejecting with 401 on an invalid/missing signature. Verified working end-to-end via a live curl POST with no valid signature headers, which returned `401 Invalid webhook signature`. | backend/src/modules/webhooks/webhooks.controller.ts, webhooks.service.ts, webhooks.repository.ts |
| P0 (Critical) | organizations | OrganizationsController never applies JwtAuthGuard; its two role-less routes are fully unauthenticated (staff PII leak via GET :orgId/members); its four @Roles-guarded routes are permanently 401 | backend/src/modules/organizations/organizations.controller.ts, backend/src/modules/auth/guards/roles.guard.ts, backend/src/modules/auth/guards/jwt-auth.guard.ts |
| Critical (boot) | database | PrismaService cannot construct a connection — schema.prisma has no datasource url, no adapter is passed, no @prisma/adapter-pg dependency exists; reproduced directly by running the compiled build | backend/src/database/prisma.service.ts, backend/prisma/schema.prisma, backend/package.json |
| High | organizations | Even once the guard bug is fixed, no code checks that the caller belongs to the `:orgId` in the URL — cross-org IDOR on all 6 routes; AuthUserDto has no organizationId field to check against | backend/src/modules/organizations/organizations.controller.ts, organizations.service.ts, backend/src/modules/auth/dto/auth-user.dto.ts |
| High | organizations | `addTeamMember`'s `prisma.user.upsert({where:{email}})` can silently reassign an existing user from a different organization into the inviting org (email is globally unique, no compound uniqueness with organizationId) | backend/src/modules/organizations/organizations.repository.ts, backend/prisma/schema.prisma |
| High | customers | `searchCustomers` has no `organizationId` filter at any layer — any authenticated user of any organization can search every organization's customers by name/phone/city. This endpoint is actively called from web/'s live "new loan" page, not just theoretical surface | backend/src/modules/customers/customers.repository.ts, customers.service.ts, customers.controller.ts, web/src/app/(app)/loans/new/page.tsx |
| Medium | web/backend integration | web/'s LiveMarketTicker "Refresh Spot" button calls backend/'s cron-refresh endpoint with a user session Bearer token, but CronAuthGuard expects the literal CRON_SECRET string — the button would fail with 401 in any deployment where CRON_SECRET is a real, non-empty value | web/src/components/live-market-ticker.tsx, web/src/lib/redux/api/marketRatesApi.ts, web/src/lib/axiosClient.ts, backend/src/modules/cron/guards/cron-auth.guard.ts |
| Medium | organizations | `ltvTiers` array elements are entirely unvalidated (`@IsArray()` only, no `@ValidateNested`+`@Type`) — malformed tiers persist directly into the live loan-eligibility policy | backend/src/modules/organizations/dto/organization-policy.dto.ts, organizations.repository.ts |
| Medium | organizations | `defaultInterestMonthly`/`safetyMarginPercent` pass DTO validation but are silently discarded (no matching Prisma column); `getOrganizationPolicy` returns two structurally different response shapes depending on whether a row exists yet | backend/src/modules/organizations/dto/organization-policy.dto.ts, organizations.repository.ts, backend/prisma/schema.prisma |
| Low-Medium | storage | `@Body('bucket') bucket?: string` bypasses DTO-based validation entirely — an authenticated caller can direct an upload to any bucket-name string, not limited to the two bucket names web/'s own legitimate call sites happen to use (`pawnify-docs`, `pawnify-avatars`) | backend/src/modules/storage/storage.controller.ts, storage.service.ts |
| Low | cron | CronAuthGuard fails open (allows all requests) if CRON_SECRET is unset, rather than failing closed | backend/src/modules/cron/guards/cron-auth.guard.ts |
| Low | main.ts / CORS | `app.enableCors()` with no options defaults to a wildcard origin with no credentials header, which is incompatible with web/'s axios client (`withCredentials: true`) whenever the two apps are served from different origins — a configuration gap discovered by cross-referencing main.ts against web/'s actual client, not empirically tested against a live browser | backend/src/main.ts, web/src/lib/axiosClient.ts |
| Low | market-rates | market-rates.service.ts (205 lines) mixes env-default configuration, DB-cached-read, and multi-provider live-fetch-with-fallback in one class — roughly 3x the size of any other backend service file | backend/src/modules/market-rates/market-rates.service.ts |
| Low | RLS | The `"user"` table has no RLS policy despite carrying the same organizationId/branchId tenant-scoping shape as every protected domain table; `app.current_organization_id` is never set anywhere in backend/src | backend/sql/rls_policies.sql, backend/src/database/supabase.service.ts, backend/src/database/prisma.service.ts |

## Business logic implemented so far (recap)

Concretely, the business rules backend/ currently encodes are: a typeahead customer search restricted to name/phone/city (customers); a health/liveness DB check (health); cached spot gold/silver rates plus LTV-tier/interest/grace-period parameters with a three-tier external-API fallback chain and troy-ounce-to-per-gram unit conversion (market-rates); per-organization LoanPolicy read/upsert and team-member invite/role-update/removal (organizations); a generic file upload to Supabase Storage (storage); a Dodo-Payments-event-shaped billing-plan updater that verifies a real HMAC-SHA256 signature before trusting any field, migrated from an earlier, cryptographically-unverified Stripe integration (webhooks); and session/role recognition against better-auth-issued sessions or Supabase JWTs (auth). There is no loan, payment, waterfall, ledger, KYC, or follow-up logic implemented anywhere in backend/ — those Prisma models (Loan, LoanItem, LoanCharge, Payment, LedgerEntry, KycDocument, FollowUp) are defined in the shared schema but are never queried by any repository under backend/src/modules (grep-confirmed).

## What backend/ does not yet implement (vs. web/)

web/ (the mature Next.js app) still owns the following domains in full; backend/ has no equivalent module, or only a narrow, partially-overlapping slice of it:

| Domain | web/ location(s) | backend/ status |
|---|---|---|
| Loans | web/src/lib/services/loans.ts (525 lines — createLoan, getLoans, closeLoan); web/src/app/(app)/loans/new/page.tsx (869 lines); web/src/app/(app)/loans/[id]/loan-actions-client.tsx, loan-detail-client.tsx | No loans module anywhere in backend/src/modules — though the new-loan page itself delegates its customer-search and market-rate lookups to backend/ (see below) |
| Payments | web/src/lib/services/payments.ts (284 lines) — waterfall allocation (charges → interest → principal) | No payments module; no waterfall logic anywhere in backend/src |
| Follow-ups | web/src/app/(app)/followups/actions.ts, followup-client.tsx, followups-table.tsx | No followups module |
| Billing | web/src/lib/services/billing.ts (138 lines) — PLAN_QUOTAS, checkCanCreateLoan, checkCanCreateBranch, updateOrganizationPlan; web/src/app/(app)/platform-admin/actions.ts, client.tsx | webhooks module writes `billingPlan` but has no quota-enforcement logic and no signature verification — a much narrower, unrelated slice |
| Settings | web/src/app/(app)/admin/settings/actions.ts, settings-client.tsx, settings-page-client.tsx; web/src/lib/services/settings.ts (78 lines) | organizations/market-rates modules cover only LoanPolicy and the AppSetting rate/LTV keys — not the full admin settings surface |
| Staff | web/src/app/(app)/admin/staff/actions.ts (200 lines), staff-client.tsx (739 lines), staff-table.tsx | organizations module's invite/role-update/remove endpoints are a narrower analog, are currently non-functional due to the guard-chain defect above, and are additionally unwired — web/'s staff UI does not call them (see organizations module reference) |
| Reports | web/src/app/(app)/reports/actions.ts, page.tsx, reports-client.tsx | No reports module or equivalent anywhere in backend/src |
| Dashboard | web/src/app/(app)/dashboard/dashboard-client.tsx (585 lines), actions.ts, page.tsx; web/src/components/dashboard-charts.tsx | No dashboard/metrics module anywhere in backend/src |

With one partial exception, none of the web/ files above delegate to backend/'s NestJS API for their core domain logic: payments, followups, billing, settings, staff, and reports/dashboard are independent, parallel implementations against the same Postgres database via web/'s own Prisma client (web/src/lib/db.ts), not backend/-backed — confirmed by the fact that only 4 files in the entire web/src tree reference axiosClient at all (web/src/lib/axiosClient.ts itself, web/src/lib/redux/api/baseApi.ts, web/src/app/(app)/profile/profile-client.tsx, web/src/components/document-uploader.tsx), and none of the files backing those other domains are among them. The exception is the Loans row: web/src/app/(app)/loans/new/page.tsx does call backend/'s NestJS API directly, for its customer-typeahead search and for the market-rate ticker embedded on the page, while its actual loan-creation submission still goes entirely through the local `createLoanAction` / web/src/lib/services/loans.ts path. See "Relationship between backend/ and web/" for the complete, verified picture of where backend/ is and is not wired into web/'s live UI.

## Relationship between backend/ and web/

### backend/ is not purely inert additive surface: web/'s browser code calls it directly

web/src/lib/axiosClient.ts creates a shared axios instance whose `baseURL` is `NEXT_PUBLIC_API_URL || NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api'` — the same default port and prefix as backend/'s own configuration.ts — attaches whatever session token it finds in `localStorage` (`access_token` or `better-auth.session_token`) as a `Bearer` header, and sends every request with `withCredentials: true`. web/src/lib/redux/api/baseApi.ts wraps this in a "hybrid" RTK Query base query that dispatches, per endpoint, either to `axiosClient` (when the endpoint definition supplies a `url`) or to a local Next.js Server Action (when it supplies an `action`) — explicit incremental-migration scaffolding, per its own source comment ("Backward compatibility for server actions if needed"). Concretely, of backend/'s 8 modules, 4 are wired into this hybrid layer and 3 of those 4 are actually exercised by a live page or component today:

- market-rates + cron (live): web/src/components/live-market-ticker.tsx calls `useGetMarketRatesQuery` (`GET /api/market-rates`, 15-minute poll) and `useRefreshMarketRatesMutation` (`POST /api/cron/update-rates`, via a "Refresh Spot" button), both defined in web/src/lib/redux/api/marketRatesApi.ts. `LiveMarketTicker` is rendered inside web/src/app/(app)/layout.tsx — the shared layout wrapping every authenticated route in the app (confirmed: it sits alongside `Sidebar` in `AppLayout`, which itself calls `requireSession()`) — so backend/'s market-rates endpoint is queried on essentially every authenticated page view of the live product, not just one screen. A failed query degrades gracefully to a hardcoded `DEFAULT_RATES` placeholder (`data ?? DEFAULT_RATES`) rather than crashing the page.
- customers (live): web/src/app/(app)/loans/new/page.tsx calls `useLazySearchCustomersQuery` (`GET /api/customers/search`, web/src/lib/redux/api/customersApi.ts) to drive its customer-typeahead field.
- storage (live): web/src/app/(app)/profile/profile-client.tsx and web/src/components/document-uploader.tsx (rendered from web/src/app/(app)/customers/new/page.tsx, web/src/app/(app)/loans/new/page.tsx, and the profile page) both call `axiosClient.post('/storage/upload', ...)` directly, bypassing Redux entirely.
- organizations (defined, but dead): web/src/lib/redux/api/organizationsApi.ts defines RTK Query hooks mirroring all 6 organizations routes field-for-field, but none of its hooks are imported anywhere else in web/src (grep-confirmed) — web/'s live settings/staff screens still use their own local server actions instead.

Practical consequences of this, all directly verified against source:

1. Because backend/ currently cannot boot at all (see "Status headline"), every one of these live call sites would fail over the network in any deployment pointed at this exact codebase — degrading gracefully for the market-rate ticker (silent fallback to placeholder data), but with no client-side fallback coded for the customer-search or file-upload flows.
2. web/.env and web/.env.example both hardcode `NEXT_PUBLIC_API_URL=http://localhost:3001/api` / `NEXT_PUBLIC_BACKEND_URL=http://localhost:3001` for local development; web/.env.prod uses an unfilled `https://api.your-production-domain.com/api` placeholder. Whether a real, separate production origin for backend/ has ever actually been provisioned for any live deployment is Unknown from source alone.
3. axiosClient's `withCredentials: true` makes every one of these calls a credentialed cross-origin request whenever web/ and backend/ are served from different origins (implied by the separate-domain placeholder above, and by the fact web/'s own `next.config.ts` defines no rewrite/proxy that would make these same-origin). backend/src/main.ts's `app.enableCors()` carries no options, so the underlying `cors` package's defaults apply (`origin: '*'`, no `Access-Control-Allow-Credentials` header, confirmed by reading the installed package) — and per standard CORS/Fetch semantics, browsers refuse to expose a credentialed response when the server echoes a wildcard origin without also allowing credentials. So even if backend/ were reachable and booted successfully, these specific browser-originated calls would likely be blocked by the browser's own CORS enforcement unless backend/'s CORS configuration or web/'s axios credentials setting is changed. This was not empirically tested against a live browser; it follows directly from the verified `cors` package defaults and axiosClient's verified `withCredentials: true` setting.
4. Separately, web/'s "Refresh Spot" button sends a user session Bearer token where CronAuthGuard expects the literal `CRON_SECRET` string — see the cron module reference and "Known defects."

(web/src/lib/axiosClient.ts, web/src/lib/redux/api/baseApi.ts, web/src/lib/redux/api/marketRatesApi.ts, web/src/lib/redux/api/customersApi.ts, web/src/lib/redux/api/organizationsApi.ts, web/src/components/live-market-ticker.tsx, web/src/app/(app)/layout.tsx, web/src/app/(app)/profile/profile-client.tsx, web/src/components/document-uploader.tsx, web/.env, web/.env.example, web/.env.prod, web/next.config.ts, backend/src/main.ts)

### Shared schema, tooling, and deployment gaps

- Shared schema, duplicated by copy: backend/prisma/schema.prisma and web/prisma/schema.prisma are byte-identical (435 lines each, zero diff) — two independent copies, not a shared/symlinked file. Any manual schema edit must currently be applied in both places. Likewise backend/prisma/seed.ts and web/prisma/seed.ts are byte-identical, though only web/'s copy can actually resolve its relative `../src/lib/auth` import (see "Repository layout").
- No migrations directory in either subsystem — schema changes are applied via `prisma db push` (a script for this exists in web/package.json; backend/package.json has no prisma-related script at all).
- One physical database, two independent client configurations: both subsystems read the same conceptual DATABASE_URL, but backend/'s ConfigModule also loads `../web/.env` as an explicit fallback (backend/src/config/config.module.ts) — a deliberate, if unusual, cross-subsystem coupling, on top of the direct HTTP coupling described above.
- No monorepo tooling joins the two: no turbo.json, nx.json, pnpm-workspace.yaml, or lerna.json anywhere in the repo (confirmed) — backend/ and web/ are two entirely independent npm projects, each with its own package-lock.json, joined only by docker-compose.yml, shared conventions, and the direct HTTP calls above.
- No CI/CD: there is no .github directory anywhere in the repository (confirmed) — no automated build, lint, or test pipeline for either subsystem.
- docker-compose.yml gap: the repo-root docker-compose.yml mounts `./sql/rls_policies.sql` (a path that does not exist at the repo root — the real file is at backend/sql/rls_policies.sql, and there is no root-level `sql/` directory at all) and builds an `app` service from a root Dockerfile that does not exist (the only Dockerfile in the repo is web/Dockerfile). docker-compose.yml defines no service for backend/ at all — its `app` service listens on port 3000 (web/'s convention, not backend/'s default 3001). As written, `docker compose up` from the repo root cannot build the app service, cannot initialize RLS, and has no way to run backend/ (docker-compose.yml, backend/sql/rls_policies.sql).
- Prisma/Supabase split is inverted relative to backend/'s own SQL comments: backend/'s repositories use Prisma (a single, non-per-tenant client) for ordinary domain CRUD across 5 of 8 modules, while SupabaseService is a single service-role-style singleton used only for raw session-table SQL, Supabase JWT verification, and Storage — not for per-tenant, JWT-carrying tenant CRUD.

## Conflicts with pre-restructure .agents/ historical notes

Per this document's own instructions, current code wins over these pre-restructure notes; each conflict below is flagged rather than silently resolved.

- .agents/context.md (line 12) and .agents/tasks.md describe "Tenant CRUD uses Supabase client SDK carrying authenticated JWTs; Prisma reserved for schema migrations and service-role cross-tenant admin operations." Current backend/ code does the opposite: Prisma is the live-query ORM for customers, health, market-rates, organizations, and webhooks, while SupabaseService's Supabase-JS client defaults to the service-role key (not a per-request user JWT) and is used only for auth/storage (backend/src/modules/*/​*.repository.ts, backend/src/database/supabase.service.ts).
- .agents/decisions.md DEC-001 states RLS is "load-bearing," enforced by "setting session context variables (app.current_organization_id) inside transactions and queries," with verification described as "Tested via `src/__tests__/rls-isolation.test.ts`." Current backend/src has zero references to `app.current_organization_id` or `set_config` anywhere (grep-confirmed) — nothing in backend/ ever sets this session variable. The referenced test file lives under web/ (web/src/__tests__/rls-isolation.test.ts, confirmed present) and is out of scope for this document's subject matter, but it was read directly for this fact-check: both of its test cases (`enforces tenant boundary separation...`, `prevents cross-tenant customer lookups`) operate entirely on hardcoded in-memory JavaScript arrays filtered with `.filter()`/`.find()` — no Postgres connection, no Prisma call, no Supabase call, and no `app.current_organization_id` is ever set anywhere in the file. This directly confirms that DEC-001's "verified"/"Tested" claim does not hold as literally stated: the cited test exercises plain-array filtering logic, not Postgres RLS.
- .agents/decisions.md DEC-004 states "Implemented server-side quota enforcement (`src/lib/services/billing.ts`) with Stripe webhook handler (`/api/webhooks/stripe`)," marked "RESOLVED & EXECUTED (Phase 4)" — describing the old, pre-backend/-split, single-app Stripe integration. The quota-enforcement half is real and lives in web/src/lib/services/billing.ts (confirmed: exports `PLAN_QUOTAS`, `checkCanCreateLoan`, `checkCanCreateBranch`, `updateOrganizationPlan`). The "Stripe webhook handler" half, as it exists today, is backend/'s webhooks module — which has since been migrated off Stripe onto Dodo Payments and now has real signature verification (see "Known defects," now RESOLVED). Whether the original pre-restructure web/ route ever verified Stripe signatures cannot be determined — that route no longer exists in web/src/app/api, and the question is moot now that the integration itself runs against a different provider.
- .agents/decisions.md DEC-002 states Pawnify is distributed under Business Source License 1.1 converting to MIT on 2029-07-01. The root LICENSE file confirms this exactly, but both backend/package.json and web/package.json declare `"license": "MIT"` in their npm metadata — a minor, real inconsistency between package manifests and the actual license terms (LICENSE, backend/package.json, web/package.json).
- .agents/schema.md's "Target Multi-Tenant Schema Blueprint" sketch (Organization/Branch/LoanPolicy/DocumentType only, no domain models, and missing some timestamp fields that the real models carry) is superseded by, and is now a strict subset of, the current 17-model schema.prisma — not contradictory, just partial and stale.

## Open questions (Unknown)

- Which Postgres role backend/'s DATABASE_URL actually connects as in any real deployment, and whether it owns the RLS-protected tables or holds `BYPASSRLS` — this determines whether backend/sql/rls_policies.sql has any real effect at all. Not determinable from source.
- What the intended remediation for PrismaService's constructor is — whether backend/ is expected to adopt web/'s `@prisma/adapter-pg` + `pg.Pool` pattern (which would require adding that dependency and likely a backend/prisma.config.ts), or something else. No in-progress work toward either was found in backend/src.
- Whether CRON_SECRET and DODO_PAYMENTS_API_KEY/DODO_PAYMENTS_WEBHOOK_KEY (which replaced the old STRIPE_WEBHOOK_SECRET when the billing webhook migrated to Dodo Payments) are set to real, non-placeholder values in any actual deployed environment. The untracked, working-tree backend/.env and .env.example contain only template values for these keys (directly confirmed); backend/.env.prod has not even been updated to the new variable names yet and still declares the old `STRIPE_WEBHOOK_SECRET` — a real, currently-live inconsistency worth closing before that deployment target is used. A real production deployment could supply its own values via the hosting platform's own env-var mechanism, entirely invisible from this repository. This determines whether CronAuthGuard's fail-open branch and the webhooks 501 branch are ever actually exercised in practice.
- Whether any external scheduler has been reconfigured to call backend/'s GET or POST /api/cron/update-rates, given that web/vercel.json's only cron job still targets a /api/cron/update-rates path that no longer exists in web/.
- Whether backend/ is deployed and running anywhere today, given it cannot boot in its current checked-in state (reproduced directly, twice). This question now carries more weight than a purely internal curiosity: web/'s live "new loan" page, its global market-rate ticker (rendered on every authenticated page), its "new customer" KYC upload flow, and its profile-avatar upload flow all issue real HTTP requests to backend/ (see "Relationship between backend/ and web/"). If a working backend/ deployment exists, it necessarily differs from this working tree in some way not visible from source (at minimum, its PrismaService construction and its CORS configuration would need to differ from what is checked in for these calls to succeed from a browser).
- Whether the CORS-plus-credentials mismatch and the cron-endpoint auth-mechanism mismatch described in "Relationship between backend/ and web/" have been reconciled in any real deployment (e.g. via a reverse proxy that makes web/ and backend/ appear same-origin, or via a CRON_SECRET actually being pushed into the browser somehow) — nothing in either subsystem's source suggests such a mechanism exists, but this cannot be fully ruled out from source alone.
- What backend/prisma/schema.prisma's LedgerEntry.referenceId and Loan.closedById / LoanPolicy.mandatoryIdDocTypeId are meant to reference — none carry a `@relation` attribute or an explanatory comment naming a target model.