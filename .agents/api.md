# Pawnify API Reference

## Scope and Conventions

This document catalogs every network-reachable HTTP endpoint in the Pawnify monorepo, plus the Next.js Server Actions in web/ that function as its de facto internal API (invoked over the wire by the browser via Redux Toolkit Query, not as in-process function calls). It covers two independent, unlinked-by-code subsystems:

- **backend/** — a new, partial NestJS API. All routes verified in this document live under 8 module directories: auth, cron, customers, health, market-rates, organizations, storage, webhooks (backend/src/modules). Note: the task brief that seeded this research described this as "7 modules" while naming all 8 of the above — a miscount in that brief, not a discrepancy in the code; this document treats the real, verified count (8) as ground truth.
- **web/** — a Next.js App Router application: web/src/app/ uses route groups, layout.tsx/page.tsx files throughout, "use server" Server Actions are the dominant mutation mechanism (web/src/app/**/actions.ts), and its one Route Handler is built on better-auth's toNextJsHandler (web/src/app/api/auth/[...all]/route.ts) — all of which require Next.js 13.4+. **Verified version discrepancy:** web/package.json declares "next": "^9.3.3" in dependencies, and web/package-lock.json locks node_modules/next at exactly version 9.3.3 (both confirmed by direct read of those two files) — a version that predates the App Router entirely and could not run this codebase as written. The same package.json separately pins devDependencies' eslint-config-next at exactly "16.2.10" (no caret), which is at least consistent with a Next.js 16-era codebase. Which Next.js version actually executes in any real `npm install` of web/ cannot be determined from source alone (node_modules contents are out of scope for this document) — Unknown; what is confirmed is that the manifest is internally inconsistent with itself and with the source it describes. It otherwise serves almost all of its business logic (loans, payments, followups, dashboard, reports, settings, staff, onboarding, billing, profile) through "use server" Server Actions called from Client Components — most of them via RTK Query (web/src/lib/redux/api/*.ts), a small number directly as imported function calls (see section 4.0 for the exact count and citations). These actions are not reachable at a conventional REST path, but they are a real, independently invocable network surface (a Server Action compiles to its own POST-able endpoint under the hood) and are documented here per module/resource, exactly as requested.

Conventions used below:
- File paths are written in plain text, never inside backtick code spans.
- "Unknown" is stated explicitly wherever a fact could not be verified from source.
- Every backend/ route sits under the global prefix /api (backend/src/main.ts, app.setGlobalPrefix(apiPrefix), apiPrefix defaults to "api" — backend/src/config/configuration.ts). Full paths below are given as /api/... to reflect the real deployed path.
- Every backend/ route shares one global error envelope and one global input pipe, described once in section 2.1 rather than repeated per endpoint.

**Critical operational caveat, applies to all of section 2:** backend/ cannot currently boot. PrismaService (backend/src/database/prisma.service.ts) extends PrismaClient with no constructor arguments, but backend/prisma/schema.prisma's datasource block declares no static url and backend/package.json pins @prisma/client at ^7.8.0 with no @prisma/adapter-pg dependency and no backend/prisma.config.ts — Prisma Client 7.x requires either a datasourceUrl option or a driver adapter when the schema has no static datasource url. **This was independently reproduced during this fact-check pass by actually executing the code**, not merely inferred from reading it: `npm run build` (backend/) completes cleanly with exit code 0 and no errors; running `node dist/main.js` against that build then crashes immediately during Nest's InstanceLoader/DI phase — right after the "ConfigModule dependencies initialized" log line and before the "Server listening" log line ever prints — with:

```
PrismaClientInitializationError: `PrismaClient` needs to be constructed with a non-empty, valid `PrismaClientOptions`
    at new PrismaService (backend/dist/database/prisma.service.js:13:39)
```

and a reported `clientVersion: '7.8.0'`, confirming the installed @prisma/client matches package.json's declared ^7.8.0. The error is thrown from inside the PrismaClient constructor itself — before any `$connect()` call or network attempt — so this crash is unconditional and does not depend on whether DATABASE_URL is reachable or valid; it will happen identically regardless of database availability. This is also confirmed by static reading of backend/src/database/prisma.service.ts, backend/prisma/schema.prisma, and backend/package.json. **Confirming contrast, same monorepo:** web/ declares the identical "@prisma/client": "^7.8.0" and uses a byte-identical schema.prisma with no static datasource url (backend/prisma/schema.prisma and web/prisma/schema.prisma are confirmed byte-identical via direct diff — not just in the session/user/account/verification models, but in their entirety), yet web/ boots this correctly: it additionally depends on "@prisma/adapter-pg": "^7.8.0" and constructs its client as `new PrismaClient({ adapter: new PrismaPg(pool) })` (web/src/lib/db.ts), and it ships a web/prisma.config.ts supplying a `datasource.url` fallback (`DIRECT_URL` or `DATABASE_URL`) for the CLI. backend/ has neither of these two things that Prisma 7.x requires, despite its sibling app in the same repository already demonstrating the correct pattern. (Separately, backend/package.json's devDependencies pins the `prisma` CLI at ^6.19.3 alongside `@prisma/client` ^7.8.0 in dependencies — a cross-major-version pairing, confirmed by direct read of backend/package.json.) Since DatabaseModule is @Global() and eagerly imported by every module (backend/src/app.module.ts), this blocks all 15 backend/ routes documented in section 2 (verified by counting every @Get/@Post/@Put/@Patch/@Delete route decorator across backend/src/modules/**/*.controller.ts — see the per-module route lists below), not just the ones that touch Prisma directly. Every "Auth requirement" and "Response" described in section 2 below is what the code specifies, not a live-tested behavior — the guard logic, DTO validation, and Prisma queries described are all real and will execute correctly once this boot defect is fixed, but as committed, no request currently reaches any backend/ handler at all. Whether a deployed instance exists somewhere that differs from this working tree is Unknown.

---

## 1. Authentication and Authorization Mechanics

Read this section before any endpoint in section 2 — every "Auth: JwtAuthGuard" / "Auth: RolesGuard" / "Auth: CronAuthGuard" label below refers back to the mechanics described here.

### 1.1 web/ — better-auth (the only session issuer in the system)

web/ authenticates users exclusively via the better-auth library (web/src/lib/auth.ts): `betterAuth({ database: prismaAdapter(prisma, { provider: "postgresql" }) , emailAndPassword: { enabled: true }, session: { expiresIn: 86400, updateAge: 3600 }, ... })`. Sessions last 24 hours and refresh every hour. The `user.additionalFields` config marks `role` and `isActive` as `input: false` (client sign-up payloads can never set them; they default to `"STAFF"` / `true` server-side) — the code comment explicitly states staff accounts are provisioned only via the admin-gated createStaffUserAction (web/src/lib/auth.ts, lines 24-25). Supabase Auth (GoTrue) is never used for sign-in anywhere in web/ — a repository-wide search for `.auth.signInWithPassword`/`.signUp`/`.signIn`/`.getUser`/`.getSession`/`.onAuthStateChange` returns zero matches in web/src.

- **Route Handler:** web/src/app/api/auth/[...all]/route.ts exports `{ GET, POST } = toNextJsHandler(auth)` — the canonical better-auth Next.js catch-all integration (documented fully in section 3.1).
- **Client SDK:** web/src/lib/auth-client.ts's `authClient = createAuthClient({ baseURL: window.location.origin (browser) or NEXT_PUBLIC_APP_URL (server) })`; used by web/src/app/(auth)/login/page.tsx via `authClient.signIn.email(...)`.
- **Server-side session read:** web/src/lib/auth/session.ts's `getSession()` calls `auth.api.getSession({ headers: await headers() })` — an in-process call into the same better-auth instance, not a network round trip. `requireSession()`/`requireAdmin()` redirect to /login on failure; `checkAuth()`/`checkAdmin()` are the non-redirecting variants used inside every Server Action (see section 4).

### 1.2 backend/ — what "JwtAuthGuard" actually verifies

Despite its name, JwtAuthGuard (backend/src/modules/auth/guards/jwt-auth.guard.ts) does **not** verify a token signed with backend/'s own JWT_SECRET. Its `extractTokenFromRequest` method tries, in order:
1. An `Authorization: Bearer <token>` header.
2. `request.cookies["better-auth.session_token"]` — the literal default session-cookie name better-auth issues. Note: backend/ has no cookie-parser dependency anywhere (verified: zero matches for "cookie-parser"/"cookieParser" across backend/src and backend/package.json), and Express/Nest does not populate `request.cookies` without that middleware, so this specific lookup is very likely always empty in practice; it is not dead code by intent, just structurally unreachable as configured.
3. A regex match (`/better-auth\.session_token=([^;]+)/`) against the raw `Cookie` header — this is the branch that would actually work for cookie-based callers, since it doesn't depend on cookie-parser.

Whatever token is extracted goes to AuthService.validateToken (backend/src/modules/auth/auth.service.ts), which tries two checks in sequence:
1. **AuthRepository.findSessionByToken** (backend/src/modules/auth/auth.repository.ts) runs a raw SQL `SELECT id, "userId", token, "expiresAt" FROM "session" WHERE token = $1 AND "expiresAt" > NOW()` via a plain node-postgres Pool (backend/src/database/supabase.service.ts) — a plain expiry/equality lookup against Postgres, with **no cryptographic signature check at all**. This is exactly the `session` table better-auth's Prisma adapter manages in web/ (confirmed: backend/prisma/schema.prisma's `session`/`user`/`account`/`verification` models — and in fact the entire schema file — are byte-identical to web/prisma/schema.prisma's). If a row matches, the linked `user` row (backend/src/modules/auth/auth.repository.ts's findUserById) is returned if `isActive`.
2. Only if no session row matches, **AuthRepository.verifySupabaseJwtUser** falls back to `supabase.auth.getUser(token)` via @supabase/supabase-js — a genuine Supabase Auth access-token verification. Since web/ never performs a Supabase Auth sign-in, what would ever present a real Supabase JWT to this path is Unknown — possibly a mobile app or third-party integration not present in this repository.

`JWT_SECRET` is declared in backend/.env.example but is never read anywhere in backend/src/config/configuration.ts or any other backend/src file (grep-confirmed zero references) — it is dead configuration. There is no passport/passport-jwt/@nestjs/passport dependency in backend/package.json either; JwtAuthGuard is entirely custom code.

**Conclusion on the backend/–web/ relationship:** backend/ trusts a caller by directly reading a session row that web/'s better-auth already wrote into a Postgres table both subsystems' independent Prisma clients model identically. This is a shared-database relationship, not a shared secret and not shared code — the two are separate npm projects with no imports between them (backend/src/modules/auth/auth.service.ts and web/src/lib/auth/session.ts independently re-implement the same authorization rule, down to reusing the identical error strings "Not authenticated. Please sign in." and "Access denied: User account inactive or missing role.", without sharing code). Whether this actually works in a deployed environment depends on backend/'s DATABASE_URL pointing at the same physical Postgres instance web/ uses, and on the browser's cookie actually being sent cross-origin (see the CORS caveat at the end of this section) — neither is confirmed from source (Unknown). Note: in this working tree, backend/.env does define a DATABASE_URL (in fact two candidate values — one a literal placeholder host matching backend/.env.example, one a real-looking Supabase pooler host), while web/.env defines no DATABASE_URL at all (only BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_BACKEND_URL, and two NEXT_PUBLIC_SUPABASE_* keys), so a direct same-instance comparison cannot be made from these two files; this does not resolve the Unknown, it only confirms the two subsystems' local dev env files are not directly comparable as checked into this working tree.

`request.user` is populated only by a successful JwtAuthGuard.canActivate call (line `request.user = user;`); no other mechanism in backend/src ever sets it. `CurrentUser` (backend/src/modules/auth/decorators/current-user.decorator.ts) is a trivial `request.user` pass-through with no validation of its own, used only in AuthController's two handlers (grep-confirmed: no other file references it).

### 1.3 backend/ — RolesGuard and the `@Roles(...)` decorator

`Roles(...roles)` (backend/src/modules/auth/decorators/roles.decorator.ts) is `SetMetadata('roles', roles)` — it accepts arbitrary strings, not a TypeScript enum. RolesGuard (backend/src/modules/auth/guards/roles.guard.ts) reads that metadata (`Reflector.getAllAndOverride` on the handler then the class):
- **No `@Roles(...)` declared on the route → `canActivate` returns `true` immediately, without even checking whether `request.user` exists.**
- `@Roles(...)` declared → requires `request.user` to already be populated (401 `{ error: 'Unauthorized' }` if not — this is the case for every RolesGuard-only controller, see 2.5), requires `user.isActive` (403 if not), requires `requiredRoles.includes(user.role)` (403 `{ error: 'Access denied: Insufficient privileges.' }` otherwise).

The canonical `Role` enum (web/prisma/schema.prisma and backend/prisma/schema.prisma, both identical) has 5 members: `PLATFORM_OPERATOR`, `OWNER`, `ADMIN`, `BRANCH_MANAGER`, `STAFF`. `AuthUserDto.role` (backend/src/modules/auth/dto/auth-user.dto.ts) is typed as a plain `string` (its Swagger `@ApiProperty` description reads "User role (ADMIN or STAFF)"; the example value given is just `'STAFF'`), so nothing in backend/'s auth layer statically constrains `role` to the Prisma enum. The only place `@Roles(...)` is ever applied in backend/src is OrganizationsController (backend/src/modules/organizations/organizations.controller.ts), always as `@Roles('OWNER', 'ADMIN')`, on 4 of its 6 routes (section 2.5). `PLATFORM_OPERATOR` and `BRANCH_MANAGER` are never referenced in any `@Roles(...)` call anywhere in backend/src.

There is no global guard anywhere in backend/: no `APP_GUARD` provider in any module (backend/src/app.module.ts), and no `app.use(...)` auth middleware in backend/src/main.ts. Applying a guard to a controller is always an explicit, per-controller `@UseGuards(...)` choice — which is why the auth posture varies route-by-route (documented per endpoint in section 2).

### 1.4 backend/ — CronAuthGuard: an entirely separate shared-secret mechanism

CronAuthGuard (backend/src/modules/cron/guards/cron-auth.guard.ts) has no relationship to JwtAuthGuard, RolesGuard, better-auth, or Supabase. It reads `process.env.CRON_SECRET` directly (bypassing ConfigService — CRON_SECRET is never registered in backend/src/config/configuration.ts):
- If `CRON_SECRET` is unset or empty → `canActivate` returns `true` immediately (**fails open** — no auth enforced when the env var is missing).
- If set → requires the literal `Authorization` header to equal `"Bearer " + CRON_SECRET` (plain string equality via `===`, not a constant-time comparison).

Applied at the controller level in CronController (backend/src/modules/cron/cron.controller.ts), gating both routes in section 2.7.

### 1.5 Shared error envelope and global validation pipe (backend/, applies to every route in section 2)

- **Error responses:** AllExceptionsFilter (backend/src/common/filters/http-exception.filter.ts) catches every exception and returns `{ statusCode: number, timestamp: ISO-string, path: string, error: object | { message: string } }`. Stack traces are logged server-side only, never returned to the client.
- **Request validation:** backend/src/main.ts installs one global `ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })`. Consequence relevant throughout section 2: class-validator's whitelist mechanism only recognizes a DTO property as "known" if it carries at least one validator decorator; a DTO class with **zero** decorated properties has an empty whitelist, so with `forbidNonWhitelisted: true`, every property on an incoming plain object for that DTO — including properties that are legitimately expected — gets rejected with 400. This is directly relevant to the webhooks endpoint (section 2.8).
- **CORS:** backend/src/main.ts calls `app.enableCors()` with **no options object**. The underlying `cors` npm package's documented default for an empty/no-options call is `credentials: false` (this is a fact about a third-party package's own defaults, not independently re-verifiable from this repository's source since `cors` is only a transitive dependency here — not directly declared in backend/package.json — via @nestjs/platform-express). Since web/'s axiosClient (web/src/lib/axiosClient.ts) sets `withCredentials: true` on every request to backend/, this is a likely (not runtime-confirmed; Unknown without live testing) point of failure for cookie-based cross-origin auth against backend/ — the browser will not attach or accept credentialed cross-origin responses unless the server explicitly echoes `Access-Control-Allow-Credentials: true`, which a bare `enableCors()` call does not do by the `cors` package's own documented default. Compounding this, web/src/lib/auth.ts sets no `crossSubDomainCookies`/cookie-domain configuration for better-auth. Note, separately: axiosClient.ts also attaches a `Bearer` token from `localStorage.getItem("access_token") || localStorage.getItem("better-auth.session_token")` when present (web/src/lib/axiosClient.ts) — a header-based path that is not subject to the cookie-credentials CORS restriction described above, though nothing in web/src writes a `better-auth.session_token` value into `localStorage` (better-auth's session token is normally an httpOnly cookie, not app-managed storage), so whether this fallback ever actually carries a usable token in practice is Unknown from source. Whether these gaps actually break cross-origin session auth in any deployed environment depends on deployment domain topology not present in this repo (Unknown).
- **API documentation:** Swagger UI is mounted at /docs with no guard of any kind (backend/src/main.ts, `SwaggerModule.setup('docs', app, document)`) — the full schema, including which routes carry `@ApiBearerAuth()`, is publicly browsable once/if the app is reachable.

---

## 2. backend/ NestJS HTTP API (global prefix /api)

### 2.1 Auth Module

File(s): backend/src/modules/auth/auth.controller.ts, auth.service.ts, auth.repository.ts, dto/auth-user.dto.ts, dto/auth-session.dto.ts.

#### GET /api/auth/me
- **Purpose:** Return the caller's own authenticated profile.
- **Auth:** JwtAuthGuard (section 1.2) — required.
- **Permissions:** None beyond a valid session/user (no role check).
- **Request:** No params, query, or body.
- **Response (200):** `AuthUserDto` — `{ id: string, name: string, email: string, role: string, phone: string | null, isActive: boolean }` (backend/src/modules/auth/dto/auth-user.dto.ts). This is simply `request.user` echoed back via the `CurrentUser` decorator (backend/src/modules/auth/decorators/current-user.decorator.ts) with no additional query.
- **Errors:** 401 `{ error: 'Unauthorized' }` — missing/invalid token (JwtAuthGuard). 403 `{ error: 'Access denied: User account inactive or missing role.' }` — token valid but `user.isActive` is false.
- **Validation:** None (GET, no input).

#### GET /api/auth/session
- **Purpose:** Validate the current session and return status plus profile in one call.
- **Auth:** JwtAuthGuard — required.
- **Permissions:** None beyond a valid session/user.
- **Request:** No params, query, or body.
- **Response (200):** `AuthSessionDto` — `{ authenticated: true, user: AuthUserDto }` (backend/src/modules/auth/auth.controller.ts's `getSession` handler always hard-codes `authenticated: true` on success, since JwtAuthGuard already rejected any failure case before the handler body runs). `AuthSessionDto` also declares an optional `sessionId?: string` and `error?: string` field (backend/src/modules/auth/dto/auth-session.dto.ts), but `AuthController.getSession` never populates `sessionId` — a real gap versus web/'s equivalent `checkAuth()` (web/src/lib/auth/session.ts), which does return a real `session.session.id` as `sessionId`. Why this field is declared-but-unused is Unknown (oversight vs. deliberate incompleteness).
- **Errors:** Same as GET /api/auth/me (JwtAuthGuard rejects before the handler runs).
- **Validation:** None.

*Note: There is no login, logout, register, or password-reset endpoint anywhere in backend/. Credential-based sign-in lives entirely in web/ (section 3.1). AuthService.checkAuthStatus (backend/src/modules/auth/auth.service.ts) exists in code but is not wired to any controller route in backend/src (grep-confirmed: the only match for "checkAuthStatus" in backend/src is its own definition) — it is unused/orphaned relative to the two documented routes above.*

### 2.2 Customers Module

File(s): backend/src/modules/customers/customers.controller.ts, customers.service.ts, customers.repository.ts, dto/customer-search-query.dto.ts, dto/customer-summary.dto.ts.

#### GET /api/customers/search
- **Purpose:** Typeahead search for customers by name or phone (used by web/'s loan-creation flow, see section 4).
- **Auth:** JwtAuthGuard, applied at the controller level (`@UseGuards(JwtAuthGuard)` on CustomersController) — required.
- **Permissions:** None beyond a valid session (no role check, no organization check).
- **Request:**
  - Query: `q?: string` (`CustomerSearchQueryDto`; `@IsOptional() @IsString()` — backend/src/modules/customers/dto/customer-search-query.dto.ts). No format constraint on content or length at the DTO layer.
- **Response (200):** `CustomerSummaryDto[]` — array of `{ id: string, fullName: string, phone: string, city: string }` (backend/src/modules/customers/dto/customer-summary.dto.ts).
- **Service-layer behavior (backend/src/modules/customers/customers.service.ts):** trims/defaults `q` to `''`; if length < 2, returns `[]` without querying the database at all; otherwise calls the repository with `limit = 10`.
- **Repository query (backend/src/modules/customers/customers.repository.ts):** `prisma.customer.findMany({ where: { OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q, mode: 'insensitive' } }] }, select: { id, fullName, phone, city }, orderBy: { fullName: 'asc' }, take: 10 })`.
- **Errors:** 401 (JwtAuthGuard). 500 `{ error: 'Failed to search customers' }` on any repository error (customers.service.ts's generic catch block).
- **Validation:** `q` accepts any string; no minimum/maximum length enforced by class-validator (the length-2 floor is application logic in the service, not a rejected-request validation rule).
- **Known issue — cross-tenant data leak (confirmed):** The Prisma query above has **no `organizationId` filter of any kind**. `Customer` is explicitly modeled as tenant-scoped in the schema (`organizationId String`, `@@unique([organizationId, phone])`, `@@index([organizationId])` — backend/prisma/schema.prisma), and this cannot currently be fixed by reading the caller's own organization either: `AuthUserDto` (the type of `request.user`) has no `organizationId` field at all. Effect: any authenticated user from **any** organization can search and see `fullName`/`phone`/`city` belonging to **any other** organization via this endpoint. backend/sql/rls_policies.sql defines a Postgres RLS policy for this table keyed on a `current_user_organization_id()` helper, but (a) that policy uses plain `ENABLE ROW LEVEL SECURITY` (grep-confirmed: no `FORCE ROW LEVEL SECURITY` statement anywhere in that file), not `FORCE ROW LEVEL SECURITY`, which Postgres does not apply to a table owner or superuser connection, and (b) nothing in backend/src ever sets the `app.current_organization_id` session variable that helper reads (repo-wide grep, zero matches) — so even under a restricted DB role, the RLS fast path would never engage. backend/.env.example and backend/.env.prod both show a `DATABASE_URL` connecting as the `postgres` user (confirmed by direct read of both files: `postgresql://postgres:...`), which is Supabase's default superuser/owner role; whether the real deployed DATABASE_URL differs from this is Unknown from source. This directly conflicts with the pre-restructure architectural invariant recorded in .agents/context.md and .agents/lessons.md ("Prisma reserved for schema migrations and service-role cross-tenant admin operations... tenant isolation must be enforced at the database level via RLS, not solely in application-layer WHERE clauses") — per this task's own rules, current code wins over that historical note, but the conflict is a real, present-day regression against the project's own recorded design, not merely an abstract best-practice gap.

### 2.3 Health Module

File(s): backend/src/modules/health/health.controller.ts, health.service.ts, health.repository.ts, dto/health-response.dto.ts.

#### GET /api/health
- **Purpose:** System/database liveness check.
- **Auth:** None — no guard of any kind (intentionally public).
- **Permissions:** None.
- **Request:** No params, query, or body.
- **Response (200):** `HealthResponseDto` — `{ status: "healthy", database: "connected", timestamp: ISO-string }`.
- **Response (503):** `{ status: "unhealthy", database: "disconnected", error: string, timestamp: ISO-string }` — thrown as an `HttpException` when `HealthRepository.checkDatabaseConnection()` (a raw `prisma.$queryRaw\`SELECT 1\`` call) throws.
- **Validation:** None (GET, no input).
- **Known issue:** Given the boot-crash defect described above, this route currently cannot be reached at all in this working tree — the process fails to start before any request could hit it.

### 2.4 Market Rates Module

File(s): backend/src/modules/market-rates/market-rates.controller.ts, market-rates.service.ts, market-rates.repository.ts, dto/market-rates-response.dto.ts.

#### GET /api/market-rates
- **Purpose:** Return cached spot gold/silver rates plus LTV/interest/grace/PAN-threshold parameters used to price and value loans.
- **Auth:** None — no guard (intentionally public read).
- **Permissions:** None.
- **Request:** No params, query, or body.
- **Response (200):** `MarketRatesResponseDto` — `{ success: true, rates: MarketRatesDto }`, where `MarketRatesDto` = `{ goldRatePerGram: number, silverRatePerGram: number, lastUpdated: string, safetyMarginPercent: number, source: string, ltvTier1Percent: number, ltvTier2Percent: number, ltvTier3Percent: number, ltvTier1Max: number, ltvTier2Max: number, defaultInterestMonthly: number, defaultGraceDays: number, panThreshold: number }` (backend/src/modules/market-rates/dto/market-rates-response.dto.ts).
- **Behavior (backend/src/modules/market-rates/market-rates.service.ts):** Reads 12 `AppSetting` keys (`rate.gold.per_gram`, `rate.silver.per_gram`, `rate.last_updated`, `valuation.safety.margin`, `ltv.tier1/2/3.percent`, `ltv.tier1/2.max`, `interest.default.monthly`, `grace.period.days`, `pan.threshold`) via the repository; any missing/unparsed value falls back per-field to an environment-variable default (`DEFAULT_GOLD_RATE_PER_GRAM`, `LTV_TIER1_PERCENT`, etc., read directly via `process.env.X`, bypassing ConfigService). On any DB error, the entire response falls back to pure env-var defaults (never throws to the caller from this branch).
- **Errors:** 500 `{ success: false, error: 'Failed to fetch market rates' }` on an unexpected service-layer exception (the controller's catch block; the service itself is designed to avoid throwing under normal DB-error conditions, so this path is narrow).
- **Validation:** None (GET, no input).
- **Known issue (inherited from web/, confirmed):** The `AppSetting` rows this endpoint reads are the same rows web/'s admin-settings Server Action writes (web/src/app/(app)/admin/settings/actions.ts; section 4.6). That write path validates only 2 of 11 fields server-side. A bad value written there (e.g., a negative or absurd `ltv.tier1.max`) is re-served here into the live loan-eligibility calculation shown on web/src/app/(app)/loans/new/page.tsx, with no independent validation on the backend/ side either.

### 2.5 Organizations & Team RBAC Module

File(s): backend/src/modules/organizations/organizations.controller.ts, organizations.service.ts, organizations.repository.ts, dto/organization-policy.dto.ts, dto/team-member.dto.ts.

**Controller-wide auth defect (confirmed):** `OrganizationsController` is decorated only with `@UseGuards(RolesGuard)` at the class level (backend/src/modules/organizations/organizations.controller.ts) — it **never** applies `JwtAuthGuard`, unlike CustomersController and StorageController (both confirmed to carry `@UseGuards(JwtAuthGuard)` at their class level). Per section 1.3, RolesGuard alone cannot populate `request.user`. Concretely:
- The two routes below with **no** `@Roles(...)` decorator hit RolesGuard's "no required roles → return true" branch and execute with **no authentication of any kind**.
- The four routes below with `@Roles('OWNER', 'ADMIN')` always hit RolesGuard's "`request.user` is undefined → throw 401" branch — they are **permanently inaccessible** (always 401) as committed, regardless of credentials supplied, rather than actually enforcing an OWNER/ADMIN check.

Even setting that defect aside, **no route in this controller ever checks that the authenticated caller belongs to the `:orgId` in the URL** — `orgId` flows straight from `@Param('orgId')` through the service to the repository with no membership comparison anywhere (backend/src/modules/organizations/organizations.controller.ts, organizations.service.ts, organizations.repository.ts). `AuthUserDto` (the type `JwtAuthGuard` would populate, were it applied) has no `organizationId` field at all, so even a correctly-guarded version of this controller could not check org membership without first extending that DTO. Net effect once the missing-guard defect is fixed: any authenticated OWNER/ADMIN of any organization could still read or mutate any other organization's policy or team roster by supplying a different `orgId` path segment (a cross-tenant IDOR).

This whole module is currently **unused by web/'s frontend** — a repo-wide search for `organizationsApi`, every one of its exported RTK Query hooks, `OrganizationPolicy`, and `TeamMember` across web/src returns matches only inside web/src/lib/redux/api/organizationsApi.ts itself (section 4 does not include it for that reason; it is documented here purely as backend/ surface area). Note: organizationsApi.ts's endpoints are wired with real `url:`-based calls that would target these exact backend/ routes if invoked — the gap is that no component anywhere imports or calls any of its hooks, not that the plumbing is missing.

#### GET /api/organizations/:orgId/policy
- **Purpose:** Read an organization's `LoanPolicy` (currency, grace period, mandatory-ID threshold, LTV tiers).
- **Auth:** Effectively none — no `@Roles(...)` on this route, so RolesGuard auto-passes (see controller-wide defect above).
- **Permissions:** None (as coded).
- **Request:** Path param `orgId: string`. No query/body.
- **Response (200):** Two structurally different shapes depending on whether a row exists (backend/src/modules/organizations/organizations.repository.ts's `getOrganizationPolicy`):
  - If a `LoanPolicy` row exists: the raw Prisma row — `{ id, organizationId, currencyCode, currencySymbol, weightUnit, purityExpression, dayCountConvention, gracePeriodDays, mandatoryIdThreshold, mandatoryIdDocTypeId, ltvTiers: Json, createdAt, updatedAt }` (confirmed against the `LoanPolicy` model field-for-field, backend/prisma/schema.prisma).
  - If no row exists yet: a hand-built object — `{ organizationId, currencyCode: "INR", currencySymbol: "₹", gracePeriodDays: 7, mandatoryIdThreshold: 50000, safetyMarginPercent: 0, ltvTier1Percent: 85.0, ltvTier2Percent: 80.0, ltvTier3Percent: 75.0, ltvTier1Max: 250000, ltvTier2Max: 500000, defaultInterestMonthly: 1.5, ltvTiers: [...] }`. The two shapes share only `organizationId`/`currencyCode`/`currencySymbol`/`gracePeriodDays`/`mandatoryIdThreshold`/`ltvTiers`; the flat `ltvTier1Percent`/etc. fields exist only in the "no row yet" default and are never part of a real stored row. No `@ApiResponse({ type: ... })` in the controller enforces a single contract.
- **Errors:** None modeled beyond generic framework errors — the repository always returns a value, real or synthesized.
- **Validation:** None (GET, `orgId` is an unvalidated raw string param).

#### PUT /api/organizations/:orgId/policy
- **Purpose:** Update an organization's `LoanPolicy`.
- **Auth:** JwtAuthGuard is never applied to this controller → `request.user` is always undefined → **RolesGuard always throws 401** for this route (controller-wide defect above). Permanently inaccessible as committed.
- **Permissions (as designed, currently unreachable):** `@Roles('OWNER', 'ADMIN')`.
- **Request:**
  - Path: `orgId: string`.
  - Body: `UpdateOrganizationPolicyDto` (backend/src/modules/organizations/dto/organization-policy.dto.ts), all fields optional: `currencyCode?: string`, `currencySymbol?: string`, `gracePeriodDays?: number (Min 0)`, `panThreshold?: number (Min 0)`, `safetyMarginPercent?: number (Min 0, Max 50)`, `defaultInterestMonthly?: number (Min 0)`, `ltvTier1Percent?/ltvTier2Percent?/ltvTier3Percent?: number (Min 1, Max 100)`, `ltvTier1Max?/ltvTier2Max?: number (Min 0)`, `ltvTiers?: Array<{ maxValue: number | null; ltvPercent: number }>`.
- **Response (200):** The upserted `LoanPolicy` Prisma row (see field list above).
- **Errors:** 401 always (defect above, once past that: 403 if role check fails once fixed).
- **Validation:**
  - Every scalar field has proper `@IsNumber()`/`@IsString()`/`@Min()`/`@Max()` guards.
  - **`ltvTiers` has only `@IsOptional() @IsArray()` — no `@ValidateNested({ each: true })` + `@Type(() => LtvTierDto)` pairing (confirmed).** A malformed element such as `{ maxValue: "abc", ltvPercent: 9999 }` passes the global `ValidationPipe` untouched and is written straight into the `ltvTiers` Json column via `prisma.loanPolicy.upsert` (backend/src/modules/organizations/organizations.repository.ts). Since `ltvTiers` determines the maximum loan principal permitted against pledged collateral, an out-of-range tier could permit lending beyond the intended safety margin. web/'s own equivalent write path (web/src/app/(app)/onboarding/actions.ts, section 4.8) has the identical unvalidated-array gap — this is not yet fixed in either subsystem.
  - **`defaultInterestMonthly` and `safetyMarginPercent` are accepted and pass validation but are never persisted:** `upsertOrganizationPolicy`'s create/update payloads only include `organizationId, currencyCode, currencySymbol, gracePeriodDays, mandatoryIdThreshold, ltvTiers` — neither field is referenced, and the `LoanPolicy` Prisma model has no column for either concept at all. A caller sending these fields gets a 200 with the values silently discarded.
  - Once any real `LoanPolicy` row exists, `existing.ltvTiers` is always truthy, so the merge logic `dto.ltvTiers ?? existing.ltvTiers ?? [fallback from dto.ltvTier1Max/Percent etc.]` means sending only `ltvTier1Percent`/`ltvTier2Percent`/`ltvTier3Percent`/`ltvTier1Max`/`ltvTier2Max` (without also sending a full `ltvTiers` array) silently leaves the stored `ltvTiers` JSON unchanged after the very first write.

#### GET /api/organizations/:orgId/members
- **Purpose:** List an organization's staff/team roster.
- **Auth:** Effectively none — no `@Roles(...)`, RolesGuard auto-passes (controller-wide defect above).
- **Permissions:** None (as coded).
- **Request:** Path param `orgId: string`.
- **Response (200):** Array of `{ id, name, email, role, phone, isActive, createdAt }` (backend/src/modules/organizations/organizations.repository.ts's `getTeamMembers`, ordered by `createdAt` ascending) — real staff PII, retrievable by anyone who can guess/enumerate an `orgId`, with no token required at all, despite the controller class carrying a (Swagger-only, no-runtime-effect) `@ApiBearerAuth()`.
- **Errors:** None modeled beyond generic framework errors.
- **Validation:** None.

#### POST /api/organizations/:orgId/members/invite
- **Purpose:** Add or "invite" a team member into an organization.
- **Auth:** Always 401 (controller-wide defect above).
- **Permissions (as designed, currently unreachable):** `@Roles('OWNER', 'ADMIN')`.
- **Request:**
  - Path: `orgId: string`.
  - Body: `InviteTeamMemberDto` (backend/src/modules/organizations/dto/team-member.dto.ts) — `email: string (@IsEmail, @IsNotEmpty)`, `name: string (@IsString, @IsNotEmpty)`, `role: TeamRole (@IsEnum; OWNER | ADMIN | BRANCH_MANAGER | STAFF)`, `branchId?: string`.
- **Response (201):** `{ id, name, email, role, organizationId, branchId, isActive }` (selected fields from the upserted `user` row).
- **Errors:** 401 always (defect above); once fixed, 403 on role mismatch.
- **Validation:** DTO-level validation on the fields above is solid (email format, enum-constrained role, non-empty name). **Behavioral gap (confirmed): the repository implements this as `prisma.user.upsert({ where: { email: dto.email }, ... update: { role, organizationId, branchId, isActive: true } })`** (backend/src/modules/organizations/organizations.repository.ts). Since `user.email` is globally unique with no compound uniqueness against `organizationId`, if the invited email already belongs to a user in a **different** organization, the `update` branch fires and silently reassigns that existing user's `organizationId` (and role/branchId/isActive) to the inviting org — an existing staff account can be hijacked from Org B into Org A with no consent check and no "already belongs to another org" guard.
- New user IDs are hand-generated as `` `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` `` because the Prisma `user.id` field has no `@default(...)` (confirmed: `id String @id` with no default, web/prisma/schema.prisma and backend/prisma/schema.prisma).

#### PATCH /api/organizations/:orgId/members/:userId/role
- **Purpose:** Change a team member's role.
- **Auth:** Always 401 (controller-wide defect above).
- **Permissions (as designed, currently unreachable):** `@Roles('OWNER', 'ADMIN')`.
- **Request:** Path: `orgId: string`, `userId: string`. Body: `UpdateMemberRoleDto` — `{ role: TeamRole }` (`@IsEnum`).
- **Response (200):** Prisma `updateMany` result (`{ count: number }`) mapped through `OrganizationsService.updateMemberRole`, which throws `NotFoundException` if `count === 0` (i.e., the `userId`/`organizationId` pair matched no row).
- **Errors:** 401 always (defect above); 404 if the member/org pair doesn't match once reachable.
- **Validation:** `role` is enum-constrained to `TeamRole` (`OWNER | ADMIN | BRANCH_MANAGER | STAFF` — note this excludes `PLATFORM_OPERATOR`, which exists in the underlying Prisma `Role` enum).

#### DELETE /api/organizations/:orgId/members/:userId
- **Purpose:** Remove a team member from an organization.
- **Auth:** Always 401 (controller-wide defect above).
- **Permissions (as designed, currently unreachable):** `@Roles('OWNER', 'ADMIN')`.
- **Request:** Path: `orgId: string`, `userId: string`. No body.
- **Response (200):** `{ success: true, removedUserId: userId }`. Implementation note: this does **not** delete the user row — `removeTeamMember` (backend/src/modules/organizations/organizations.repository.ts) runs `prisma.user.updateMany({ where: { id: userId, organizationId }, data: { organizationId: null, isActive: false } })`, i.e. it detaches and deactivates the account rather than deleting it.
- **Errors:** 401 always (defect above); 404 (`NotFoundException`) if no matching row was updated.
- **Validation:** None beyond path params being strings.

### 2.6 Storage Module

File(s): backend/src/modules/storage/storage.controller.ts, storage.service.ts, dto/upload-response.dto.ts. No repository file exists — no Prisma usage in this module.

#### POST /api/storage/upload
- **Purpose:** Upload a file (KYC documents, collateral photos, etc.) to a Supabase Storage bucket.
- **Auth:** JwtAuthGuard, applied at the controller level — required (correctly configured, unlike Organizations).
- **Permissions:** None beyond a valid session (no role/ownership check on the target bucket).
- **Request:** `multipart/form-data`.
  - `file`: binary (bound via `@UploadedFile()` + `FileInterceptor('file')`, **no options object passed** — no `limits.fileSize`, no `fileFilter` for mimetype/extension; Multer's own unrestricted defaults apply, so there is no application-level cap on upload size or file type in this module).
  - `bucket?: string` — bound via `@Body('bucket') bucket?: string`, a raw property-level extraction with **no DTO class**, so the global `ValidationPipe` never inspects it at all.
- **Response (201):** `UploadResponseDto` — `{ url: string, fileName: string, size: number, bucket: string }`.
- **Behavior (backend/src/modules/storage/storage.service.ts):** Rejects with 400 `'No file provided'` if `!file || !file.buffer`. Sanitizes the filename (`replace(/[^a-zA-Z0-9.-]/g, '_')`) and prefixes it with `Date.now()_`. If the Supabase client wasn't initialized (missing env vars), it logs a warning and returns a **fabricated** fallback response `{ url: '/uploads/fallback/<originalname>', ... }` with **no file actually written anywhere** and no error surfaced to the caller — a silent broken link in that misconfiguration scenario. Otherwise it calls the real Supabase client: `supabase.storage.from(bucketName).upload(filePath, file.buffer, { contentType, upsert: true })` then `.getPublicUrl(filePath)`. The default bucket name is `'pawnify-docs'` (`const DEFAULT_BUCKET = 'pawnify-docs'`, backend/src/modules/storage/storage.service.ts), matching the Swagger example on the controller.
- **Errors:** 400 if no file. 500 (wrapping the Supabase error message) on a real storage failure.
- **Validation (confirmed gap):** `bucket` is accepted as any string with no allowlist (`@IsIn([...])` or similar) — an authenticated caller can direct an upload into any bucket name the underlying Supabase project happens to have, not only the documented default `"pawnify-docs"`. Requires a valid JWT (unlike the webhooks gap below), so severity is lower, but it is a literal instance of a body parameter with zero DTO-based validation.
- **Consumer:** web/src/components/document-uploader.tsx posts here directly via a raw `axiosClient.post("/storage/upload", formData, ...)` call (not through RTK Query), sending `file` and `bucket` fields; used by web/'s customer-KYC flow (web/src/app/(app)/customers/new/page.tsx), loan-collateral photo upload flow (web/src/app/(app)/loans/new/page.tsx), and staff profile document/avatar upload (web/src/app/(app)/profile/profile-client.tsx, which also separately calls the same endpoint via its own raw axiosClient.post for the avatar image specifically).

### 2.7 Cron Module

File(s): backend/src/modules/cron/cron.controller.ts, cron.module.ts, guards/cron-auth.guard.ts. No service/repository/DTO of its own — reuses `MarketRatesService`/`MarketRatesResponseDto` from section 2.4.

#### GET /api/cron/update-rates
#### POST /api/cron/update-rates
Both routes are separate handler methods with identical logic.
- **Purpose:** Trigger a live refresh of spot gold/silver rates from external market-data APIs and cache the result.
- **Auth:** CronAuthGuard (section 1.4) — a shared-secret bearer check, fails open if `CRON_SECRET` is unset.
- **Permissions:** N/A (not role-based; a scheduler credential, not a user credential).
- **Request:** No params, query, or body (both GET and POST accept none).
- **Response (200):** `MarketRatesResponseDto` — `{ success: true, rates: MarketRatesDto }` (same shape as section 2.4).
- **Behavior (backend/src/modules/market-rates/market-rates.service.ts's `fetchAndSaveLiveMetalRates`):** Tries a primary external API (`https://data-asg.goldprice.org/dbXRates/INR`), then a secondary combination (`https://open.er-api.com/v6/latest/USD` + `https://api.gold-api.com/price/XAU` + `https://api.gold-api.com/price/XAG`, converting via the standard 1 troy oz = 31.1034768 g), then falls back to whatever is already cached in the DB, then upserts `rate.gold.per_gram`, `rate.silver.per_gram`, `rate.last_updated` `AppSetting` rows.
- **Errors:** 500 (the `MarketRatesResponseDto` result itself, re-thrown as an `HttpException`) if `result.success` is false (i.e., the DB upsert failed after a successful or fallback rate fetch).
- **Validation:** None (no input).
- **Known issue — stale scheduler wiring:** web/vercel.json still configures a Vercel Cron Job at path `/api/cron/update-rates` (schedule `"0 0 * * *"`, matching the recent commit "fix: update cron schedule for rate updates to run daily at midnight"), but no `cron` route exists anywhere under web/src/app/api anymore (only `auth/[...all]` remains) — that functionality has moved here, to a separate NestJS deployment with no vercel.json/Procfile/@nestjs/schedule of its own (no self-scheduling; this module only exposes an HTTP endpoint for an external caller). Whether any real scheduler has been repointed at this backend/ path is Unknown from source.

### 2.8 Webhooks Module

File(s): backend/src/modules/webhooks/webhooks.controller.ts, webhooks.service.ts, webhooks.repository.ts. (The old dto/stripe-webhook-payload.dto.ts was deleted when this module migrated from Stripe to Dodo Payments — the endpoint no longer binds its body via a DTO at all.)

#### POST /api/webhooks/dodo-payments
- **Purpose:** Receive Dodo Payments billing events and update an organization's subscription plan accordingly. (Migrated from a Stripe integration formerly at the same conceptual route, `POST /api/webhooks/stripe`.)
- **Auth:** No `JwtAuthGuard`/`RolesGuard` (confirmed: `webhooks.controller.ts` carries no `@UseGuards`, unlike organizations/cron/storage/customers/auth) — expected for a public third-party webhook receiver, which authenticates via cryptographic signature verification instead of a NestJS guard (see Behavior).
- **Permissions:** None.
- **Request:** No `@Body()`-bound DTO. The controller method takes `@Req() req: RawBodyRequest<Request>` and reads `req.rawBody` (a raw `Buffer`, not a parsed object) plus the request headers, passing both to the service. Raw-body capture is enabled globally via `NestFactory.create(AppModule, { rawBody: true })` in backend/src/main.ts — necessary because signature verification requires the exact original bytes Dodo Payments signed, not Nest's re-serialized JSON. The verified event envelope shape (once signature verification succeeds) is `{ business_id, type, timestamp, data: { payload_type, metadata: { organizationId?, planId? } } }`.
- **Response (200):** `{ received: true }`.
- **Behavior (backend/src/modules/webhooks/webhooks.service.ts):** Checks that `DODO_PAYMENTS_API_KEY` and `DODO_PAYMENTS_WEBHOOK_KEY` are both configured (501 `{ error: 'Webhook not configured on this self-hosted deployment' }` if not, same shape as the old Stripe check). It then constructs the official `dodopayments` npm SDK client — `new DodoPayments({ bearerToken: DODO_PAYMENTS_API_KEY, environment: DODO_PAYMENTS_ENVIRONMENT, webhookKey: DODO_PAYMENTS_WEBHOOK_KEY })` — and calls `client.webhooks.unwrap(rawBody.toString(), { headers: { 'webhook-id', 'webhook-signature', 'webhook-timestamp' } })`. `unwrap()` performs genuine HMAC-SHA256 signature verification per the Standard Webhooks spec (the `dodopayments` package depends on the `standardwebhooks` package for this) and **throws on an invalid or missing signature** — the service catches that and returns a real `401 { error: 'Invalid webhook signature' }`, verified working end-to-end: a live curl POST with no valid signature headers against the running dev server returned exactly that 401. Only once `unwrap()` succeeds does the handler trust the payload: for `type` in `{"subscription.active", "subscription.renewed"}`, it calls `WebhooksRepository.updateOrganizationPlan(organizationId, planId ?? "starter")`; for `type` in `{"subscription.cancelled", "subscription.expired", "subscription.failed"}`, it calls the same with `null`. Any other event type is silently ignored (still returns `{ received: true }`). Dodo Payments ships no NestJS-specific adapter (only Express/Fastify/Next.js/etc.), which is why this raw-body-plus-manual-`unwrap()` pattern is used instead of a framework-provided middleware.
- **Repository (backend/src/modules/webhooks/webhooks.repository.ts):** `prisma.organization.updateMany({ where: { id: organizationId }, data: { billingPlan: newPlan } })` — uses `updateMany` (not `update`), so an unknown `organizationId` matches zero rows and fails silently with no error surfaced. Unchanged by the Stripe-to-Dodo migration.
- **Errors:** 501 if `DODO_PAYMENTS_API_KEY`/`DODO_PAYMENTS_WEBHOOK_KEY` unset. 401 `{ error: 'Invalid webhook signature' }` if `unwrap()` throws. 400 `{ error: 'Webhook processing failed' }` on any other thrown error.
- **Validation — RESOLVED, historical CRITICAL/P0 finding:** This endpoint used to bind its body via a `StripeWebhookPayloadDto` whose `type`/`data` fields carried only `@ApiPropertyOptional()` — zero class-validator decorators — and, combined with no route guard and no signature verification anywhere in the monorepo, any unauthenticated caller who knew the expected JSON shape could POST a forged `checkout.session.completed` body naming any `organizationId` and `planId: "enterprise"` and have that organization's billing plan changed for free, or forge `customer.subscription.deleted` to strip a competitor's plan to `null`. This was the single most severe finding across the whole API surface documented in this reference. **Fix**: the integration was replaced end-to-end with Dodo Payments. The endpoint no longer binds a `@Body()` DTO at all (so the old DTO's validation gap is moot — there is no DTO left to under-validate), and real cryptographic signature verification now gates the handler before any field is trusted, as described in Behavior above. This finding is resolved.
- **Historical-note conflict:** .agents/decisions.md (DEC-004) records "Implemented server-side quota enforcement (`src/lib/services/billing.ts`) with Stripe webhook handler (`/api/webhooks/stripe`)" as "RESOLVED & EXECUTED (Phase 4)" — describing the old, pre-backend/-split, single-app Stripe integration. The quota-enforcement half is true today (web/src/lib/services/billing.ts, section 4.9). The "webhook handler" half, as it exists in current code, has moved to backend/ and been migrated off Stripe onto Dodo Payments, and now has real signature verification, addressing the gap this note previously flagged. Whether the original pre-restructure web/ route (now deleted — web/src/app/api contains only `auth/[...all]` today) ever verified Stripe signatures is Unknown; that question is moot now that the integration itself has changed providers.

---

## 3. web/ HTTP Route Handlers

### 3.1 GET/POST /api/auth/* (better-auth catch-all)

- **File:** web/src/app/api/auth/[...all]/route.ts — four lines: `export const { GET, POST } = toNextJsHandler(auth);`, where `auth` is the better-auth instance from web/src/lib/auth.ts (section 1.1).
- **Purpose:** Serves all of better-auth's internal endpoints (sign-up, sign-in, sign-out, session read, etc.) under this one catch-all Route Handler.
- **Auth:** N/A at the route-handler level — individual sub-paths have their own semantics defined internally by the better-auth package (e.g., sign-in/sign-up require no prior session; a session-read endpoint requires a valid session cookie to return non-null).
- **Permissions:** N/A — enforced internally by better-auth and by the `user.additionalFields` config in web/src/lib/auth.ts (`role`/`isActive` are `input: false`, so no sign-up/sign-in payload can ever set them).
- **Request / Response:** The exact set of sub-paths, their request bodies, and their response shapes are defined internally by the third-party better-auth package (version `^1.6.23`, web/package.json) and were not enumerated from this repository's source — **Unknown**, out of scope for this repo-level reference. (This Route Handler mechanism itself — a catch-all `route.ts` under web/src/app/api/ — requires Next.js's App Router, which is part of the broader Next.js version discrepancy noted in the Scope section above: web/package.json/package-lock.json declare and lock next@9.3.3, a version that predates Route Handlers and could not serve this file as written.)
- **Validation:** Delegated entirely to better-auth's internal implementation.
- **Relationship to backend/:** None directly — this route only writes to the shared Postgres `user`/`session`/`account`/`verification` tables via Prisma; backend/'s auth module (section 2.1, section 1.2) separately reads those same tables to authenticate its own callers, with no code or network call between the two Route Handlers.

---

## 4. web/ Server Actions — De Facto API Surface

### 4.0 How these function as an API

Every action below is a `"use server"` Next.js Server Action. From the browser's perspective these are POST-able endpoints Next.js generates automatically (not visible as conventional REST paths). **31 of the 33** actions documented below are invoked via RTK Query's custom `hybridAxiosBaseQuery` (web/src/lib/redux/api/baseApi.ts): each RTK Query slice's `query()` function returns either `{ url, method, ... }` (a real HTTP call through web/src/lib/axiosClient.ts to backend/ — already documented in section 2 for the 3 endpoints this actually targets: customers/search, market-rates, cron/update-rates) or `{ action: <imported Server Action function>, args: [...] }` (an in-process call with **no network hop and no involvement from backend/ at all**). **The remaining 2 — saveLoanPolicyAction (section 4.8) and changeOrganizationPlanAction (section 4.9) — are not wired into any RTK Query api slice at all** (confirmed: neither function name appears anywhere under web/src/lib/redux/api/); instead they are imported directly and called as plain async functions from inside `"use client"` components — `saveLoanPolicyAction` from web/src/app/(app)/onboarding/onboarding-wizard-client.tsx (`await saveLoanPolicyAction(form)`), and `changeOrganizationPlanAction` from web/src/app/(app)/platform-admin/client.tsx (`await changeOrganizationPlanAction(organizationId, planArg)`, wrapped in a `useTransition`). This does not change their status as independently network-invocable Server Actions — a Server Action compiles to its own POST-able endpoint regardless of which mechanism the calling component uses to invoke it — it only means these 2 bypass RTK Query's cache-tagging/invalidation layer that the other 31 go through. Because a Server Action remains independently invocable as its own network endpoint regardless of which UI calls it, any client-side type/shape restriction (a `<select>`'s fixed options, an HTML `type="date"` input, a TypeScript parameter annotation) is **not** a substitute for server-side validation — a point noted below wherever it matters.

Every action in this section is authenticated via one of web/src/lib/auth/session.ts's `checkAuth()`/`checkAdmin()`/`requireSession()` helpers (section 1.1), **except where explicitly noted as missing**.

### 4.1 Customers

File(s): web/src/app/(app)/customers/actions.ts, web/src/app/(app)/customers/[id]/actions.ts, web/src/app/(app)/customers/new/actions.ts.

#### getCustomersListAction(filters: CustomerFilters)
- **Auth:** checkAuth() — any authenticated, active, role-bearing user.
- **Args:** `filters: { search?: string, page?: number, pageSize?: number }`.
- **Behavior/Response:** Delegates to web/src/lib/services/customers.ts's `getCustomers` — paginated (default page 1, pageSize 20), case-insensitive `OR` search across `fullName`/`phone`/`email`, includes `kycDocuments` (docType/status only) and a `_count.loans`. Returns `{ customers: [...], total, page, pageSize, totalPages }`, run through `serializeForClient` (Decimal→string, Date→ISO-string; web/src/lib/serialize.ts).
- **Validation:** None beyond default coercion of `page`/`pageSize` to 1/20.
- **Errors:** Throws (not a `{ success: false }` return) if unauthenticated — propagates as an RTK Query error via the `hybridAxiosBaseQuery`'s try/catch.

#### getCustomerDetailAction(customerId: string)
- **Auth:** checkAuth().
- **Args:** `customerId: string`.
- **Response:** `{ customer: Serialized<Customer & { kycDocuments, createdBy, loans }>, panStatus: { required: boolean, hasPan: boolean, threshold: number } }` (web/src/lib/services/customers.ts's `getCustomerById` + `checkPanRequired`).
- **Errors:** Throws `"Customer not found"` if the ID doesn't resolve.
- **Validation:** None (`customerId` used directly in a Prisma `findUnique`).

#### addKycDocumentAction(customerId: string, formData: unknown)
- **Auth:** checkAuth().
- **Validation:** `kycDocumentSchema` (web/src/lib/validation/customer.ts) — `docType` enum-constrained to `AADHAAR | PAN | VOTER_ID | PASSPORT | DRIVING_LICENSE`, with format-specific `docNumber` rules per type (PAN: `^[A-Z]{5}[0-9]{4}[A-Z]$`; Aadhaar: exactly 12 digits; Voter ID: `^[A-Z]{3}\d{7}$`; Passport: `^[A-Z]\d{7}$`; Driving License: length ≥ 10). Note: the underlying Prisma `KycDocType` enum has a 6th value, `CUSTOM` (web/prisma/schema.prisma), that this zod schema does not accept — an organization-defined custom document type (via the `DocumentType` model) cannot currently be submitted through this action's validation.
- **Response:** `{ success: true, docId: string }` or `{ success: false, error: string }`.
- **Errors:** `{ success: false, error: "Unauthorized" }`; `{ success: false, error: <first zod issue message> }`.

#### verifyKycDocumentAction(docId: string, customerId: string, status: KycStatus)
- **Auth:** checkAuth().
- **Args:** `status` is typed as the Prisma `KycStatus` enum (`PENDING | VERIFIED | REJECTED`) at the TypeScript level only — no runtime `@IsEnum`-equivalent check before it's passed to `updateKycStatus` (web/src/lib/services/customers.ts), which writes it straight to the `kycDocument.status` column. Since this is a Server Action, TypeScript types are erased at the network boundary; a directly-crafted call could send any string, and Prisma would reject non-enum values at the DB layer with an unhandled/generic error rather than a clean validation message.
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

#### updateCustomerDetailsAction(customerId: string, data: { fullName, phone, email?, addressLine1, city, state, pincode })
- **Auth:** checkAuth().
- **Validation — confirmed gap, priority P1:** No schema validation at all — only bare `.trim()` calls (email falls back to `null`) before `prisma.customer.update`. This bypasses `customerCreateSchema` (web/src/lib/validation/customer.ts), which enforces the Indian 10-digit mobile regex and 6-digit pincode regex on the identical fields at creation time (web/src/app/(app)/customers/new/actions.ts). A customer's phone or pincode can be silently corrupted to an invalid value through the edit-customer UI with no server-side rejection; `phone` also feeds the follow-up/collections contact workflow (web/src/app/(app)/followups).
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

#### deleteCustomerAction(customerId: string)
- **Auth:** checkAdmin() — ADMIN role required.
- **Behavior:** Blocks with `{ success: false, error: "Cannot delete customer with active loans. Please close or settle loans first." }` if `prisma.loan.count({ where: { customerId, status: "ACTIVE" } }) > 0`; otherwise cascades manual deletes in this exact order: `kycDocument`, `loanItem`, `payment`, `loanCharge`, `ledgerEntry`, `followUp`, `loan`, then `customer`.
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

#### createCustomerAction(formData: unknown)
- **Auth:** checkAuth().
- **Validation:** `customerCreateSchema` (web/src/lib/validation/customer.ts) — `fullName` 2-100 chars; `phone` Indian-mobile regex `^[6-9]\d{9}$`; `email` optional, zod `.email()` format if present; `addressLine1` 1-200 chars; `city`/`state` required, 1-100 chars; `pincode` exactly 6 digits (`^\d{6}$`); `photoUrl` optional URL format.
- **Behavior:** Resolves `organizationId` from the caller's own `user.organizationId`, falling back to `prisma.organization.findFirst()` if the staff account has none — returns `{ success: false, error: "No organization configured" }` if no organization exists at all.
- **Response:** `{ success: true, customerId: string }` or `{ success: false, error: string }`.

### 4.2 Loans and Payments

File(s): web/src/app/(app)/loans/actions.ts, web/src/app/(app)/loans/[id]/actions.ts, web/src/app/(app)/loans/new/actions.ts.

#### getLoansListAction(filters: LoanFilters)
- **Auth:** checkAuth().
- **Args:** `{ status?: "ACTIVE"|"OVERDUE"|"CLOSED", customerId?, search?, metalType?: "GOLD"|"SILVER", dateFrom?, dateTo?, handledById?, page?, pageSize? }`.
- **Behavior:** `status` is a **derived** value (web/src/lib/services/loans.ts's `deriveLoanDisplayStatus` — the Prisma `LoanStatus` enum itself only has `ACTIVE`/`CLOSED`; "overdue" is computed from `dueDate + gracePeriodDays` at query time, never stored). For `ACTIVE`/`OVERDUE` filters the service fetches all matching `ACTIVE` rows and paginates in memory (DB-level skip/take can't express the derived-status filter). Returns `{ loans: [...], total, page, pageSize, totalPages }`.
- **Response:** Serialized via `serializeForClient`.

#### getLoanDetailAction(loanId: string)
- **Auth:** checkAuth().
- **Response:** Full loan aggregate — base loan + `customer`, `handledBy`, `items`, `payments`, `charges` (ledger `transactions`), `followUps`, plus computed `displayStatus`, `interestSummary` (web/src/lib/services/interest.ts's `computeInterestSummary`), and `totalDue` (`principalOutstanding + accruedInterest + unsettled charges`).
- **Errors:** Throws `"Loan not found"` if the ID doesn't resolve.

#### recordPaymentAction(formData: unknown)
- **Auth:** checkAuth().
- **Validation:** `paymentSchema` (web/src/lib/validation/payment.ts) — `loanId` non-empty string; `amountPaid` coerced number `> 0`; `mode` enum `CASH | UPI | BANK_TRANSFER | CARD`; `notes` optional, max 500 chars.
- **Behavior:** Delegates to web/src/lib/services/payments.ts's `recordPayment` — the full atomic waterfall inside one `prisma.$transaction` (via `runSerializable`, i.e. `SERIALIZABLE` isolation): (1) outstanding charges, oldest first; (2) accrued interest (computed via web/src/lib/services/interest.ts); (3) principal. Rejects overpayment beyond total outstanding (`> ₹0.01` tolerance) rather than silently absorbing it. Writes a `Payment` row (with a generated `REC-YYYYMMDD-XXXXX` receipt number) and a `LedgerEntry` audit row in the same transaction. Advances the interest clock proportionally rather than fully whenever a partial interest payment occurs (documented in-code as a deliberate correctness fix, not a shortcut).
- **Response:** `{ success: true, receiptNumber: string }` or `{ success: false, error: string }`.

#### closeLoanAction(loanId: string)
- **Auth:** checkAuth().
- **Behavior (web/src/lib/services/loans.ts's `closeLoan`):** Requires `status === "ACTIVE"`, `principalOutstanding <= 0`, zero unsettled charges, and re-verified accrued interest `<= ₹0.01`, all inside one transaction; throws a specific error message identifying which precondition failed otherwise. Writes a `CLOSURE` `LedgerEntry`.
- **Response:** `{ success: true }` or `{ success: false, error: string }`.
- **Note:** This is a purely financial closure — physical item hand-back is the separate action below.

#### releaseItemsAction(loanId: string)
- **Auth:** checkAuth().
- **Behavior:** Requires `status === "CLOSED"`; sets `releasedAt` on all not-yet-released `LoanItem` rows; throws if items were already released. Writes an `ITEM_RELEASE` `LedgerEntry`.
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

#### updateLoanNotesAction(loanId: string, notes: string)
- **Auth:** checkAuth().
- **Validation:** None — `notes.trim() || null` written directly, no length cap, no schema.
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

#### deleteLoanAction(loanId: string)
- **Auth:** checkAdmin().
- **Behavior:** Cascading manual deletes across `loanItem`, `payment`, `loanCharge`, `ledgerEntry`, `followUp`, then `loan` — no active-loan-count precondition (unlike `deleteCustomerAction`).
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

#### createLoanAction(formData: unknown)
- **Auth:** checkAuth().
- **Validation:** `createLoanSchema` (web/src/lib/validation/loan.ts) — `customerId` required; `items`: array, min 1, each item validated by `loanItemSchema` (`metalType` enum GOLD/SILVER; `purityPercent` 0 < x ≤ 100; `grossWeightGrams` > 0; `stoneWeightGrams` ≥ 0, must be `<` gross weight; `valuationRatePerGram` > 0; `packetNumber`/`storageLocation` required, plus `description`/`purityLabel` also required); `tenureMonths` integer 1-12 (RBI cap, per code comment); `interestRateMonthly` 0 < x ≤ 10; `principalAmount` > 0; `gracePeriodDays` integer 0-90 (default 7); `processingFee` optional, ≥ 0.
- **Behavior (web/src/lib/services/loans.ts's `createLoan`):** Enforces the Cloud SaaS plan quota via `checkCanCreateLoan` (section 4.9's `PLAN_QUOTAS`; self-hosted/`null` plan = unlimited). Enforces a mandatory primary-ID check via `checkPanRequired` (web/src/lib/services/customers.ts) — throws if the customer's cumulative active-loan exposure (existing + this new principal) meets/exceeds the organization's `mandatoryIdThreshold` (or the `pan.threshold` `AppSetting` fallback) and no matching-type primary ID document exists at all. **Confirmed nuance:** despite the "PAN required" framing in the UI, this check (the `hasPrimaryDoc` computation) does not filter by `KycStatus` — a KYC document sitting in `PENDING` or even `REJECTED` status still satisfies the requirement, since the underlying query has no `status`/`"VERIFIED"` filter; only the document's `docType`/`documentType.isPrimaryId` classification is checked. `verifyKycDocumentAction` (section 4.1) is a separate, unconnected workflow. Separately, the service **recomputes every item's assessed value and the loan's LTV-tiered eligible amount server-side** (never trusts client-submitted valuation totals) and rejects if `principalAmount` exceeds the recomputed eligible amount. All of this, plus loan-number generation, item creation, an optional processing-fee `LoanCharge`, and a `DISBURSEMENT` `LedgerEntry`, happens inside one `SERIALIZABLE` transaction.
- **Response:** `{ success: true, loanId: string }` or `{ success: false, error: string }`.

### 4.3 Follow-ups

File: web/src/app/(app)/followups/actions.ts.

#### getFollowUpsAction(tab: string)
- **Auth:** checkAuth().
- **Behavior:** `tab === "DONE"` filters `status: "DONE"`; any other string (including garbage input — no enum validation on `tab`) falls through to `status: "PENDING"`. Also returns `activeLoanOptions` (id/loanNumber/customerName for all `ACTIVE` loans, for a task-creation dropdown) and computes `isOverdueTask: tab === "PENDING" && new Date(f.dueDate) < today` per row.
- **Response:** `{ followUps: [...], activeLoanOptions: [...] }`.

#### createFollowUpAction(loanId: string, note: string, dueDateStr: string)
- **Auth:** checkAuth().
- **Validation — confirmed gap, priority P2:** Only `if (!note.trim())` is checked. `loanId` is implicitly guarded only by a `prisma.loan.findUnique` existence lookup (returns `"Loan not found"` otherwise), not a format check. `dueDateStr` has **zero** validation and is passed directly into `new Date(dueDateStr)` in the `prisma.followUp.create` payload — JavaScript's `new Date("garbage")` silently produces an `Invalid Date` rather than throwing, which would then either surface as an opaque Prisma error or (best case) get persisted and corrupt the `isOverdueTask` comparison above that staff rely on daily. No file in this action imports from web/src/lib/validation.
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

#### updateFollowUpStatusAction(id: string, status: FollowUpStatus)
- **Auth:** checkAuth().
- **Validation:** `status` is TypeScript-typed only (`PENDING | DONE | CANCELLED`), not runtime-validated before the `prisma.followUp.update` call — same class of gap as `verifyKycDocumentAction` above.
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

#### deleteFollowUpAction(id: string)
- **Auth:** checkAuth().
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

### 4.4 Dashboard

File: web/src/app/(app)/dashboard/actions.ts.

#### getDashboardDataAction()
- **Auth:** checkAuth().
- **Args:** None.
- **Response:** `{ stats: {...}, chartData: {...} }` (web/src/lib/services/dashboard.ts). `stats` includes `activeCount`, `overdueCount`, `closedCount`, `totalAUM`, `overdueAmount`, `dueIn7Days`, `dueIn30Days`, `avgLtv`, `weeklyInterestAccrued`, `pendingFollowUpsCount`, `disbursedToday`/`disbursedWeek`/`collectionsToday` (each `{ count, amount }`), `recentLoans` (5 most recent, with `displayStatus`), `overdueLoans` (up to 10), and `customerCount`. `chartData` includes `metalBreakdown`, `statusBreakdown`, and a 6-month `monthlyTrend` of disbursed vs. collected totals.
- **Validation:** N/A (no input).

### 4.5 Reports

File: web/src/app/(app)/reports/actions.ts.

#### getReportsDataAction()
- **Auth:** checkAuth().
- **Args:** None.
- **Response:** Aggregate report figures computed in-process over every `Loan`/`Payment`/`LoanCharge` row (no pagination/date-range filter on the query itself): `totalLoansCount`, `totalPaymentsCount`, `totalChargesCount`, `activeCount`, `overdueCount`, `closedCount`, `totalActiveAUM`, `goldLoansCount`/`silverLoansCount` (mutually exclusive — a loan counted as gold if it has any GOLD item, silver only if it has a SILVER item and no GOLD item), `goldAssessedValue`/`silverAssessedValue`, `ltv85Count`/`ltv80Count`/`ltv75Count` (bucketed by each loan's stored `ltvPercent`: ≥85 / ≥80-and-<85 / else), `totalCollected`/`interestCollected`/`principalCollected`/`chargesCollected`, `totalDisbursed`.
- **Validation:** N/A (no input). No organization scoping is applied to any of these aggregate queries (they run over the entire table) — consistent with a single-tenant-per-deployment assumption also visible elsewhere in web/'s service layer, though not verified against a specific multi-tenant requirement here.

### 4.6 Admin Settings

File: web/src/app/(app)/admin/settings/actions.ts.

#### getSettingsAction()
- **Auth:** checkAdmin() — ADMIN role required.
- **Response:** `{ ltv_tier1_max, ltv_tier2_max, ltv_tier3_max, ltv_tier1_limit, ltv_tier2_limit, default_interest_monthly, default_grace_days, pan_required_threshold, rate_gold_per_gram, rate_silver_per_gram, valuation_safety_margin, rate_last_updated }` — all strings, read from `AppSetting` with hard-coded defaults if a key is absent.

#### saveSettingsAction(formData: FormData)
- **Auth:** checkAuth() with an inline `adminAuth.user?.role !== "ADMIN"` check (not the `checkAdmin()` helper — functionally equivalent here, but a separate hand-written check).
- **Validation — confirmed gap, priority P1:** Of 11 settable keys (`ltv_tier1_max`, `ltv_tier2_max`, `ltv_tier3_max`, `ltv_tier1_limit`, `ltv_tier2_limit`, `default_interest_monthly`, `default_grace_days`, `pan_required_threshold`, `rate_gold_per_gram`, `rate_silver_per_gram`, `valuation_safety_margin`), only 2 are range-checked: `default_interest_monthly` must be `> 0` and `≤ 10`, `default_grace_days` must be `0-90`. The other 9 — including both metal per-gram rates and all three LTV percentage tiers — are written via `updateSetting(dbKey, val.toString())` with **no numeric or range check at all** (web/src/lib/services/settings.ts's `updateSetting` is a bare `prisma.appSetting.upsert` with zero validation of its own). The only guardrail on these 9 fields today is client-side HTML5 `min`/`max` attributes in web/src/app/(app)/admin/settings/settings-client.tsx, bypassed entirely by a direct call to this action. **Confirmed downstream impact:** these `AppSetting` rows are the same ones backend/'s GET /api/market-rates (section 2.4) reads and re-serves into the live loan-eligibility calculation shown on web/src/app/(app)/loans/new/page.tsx — an unvalidated write here (e.g., an LTV tier of 500%, or a zero/negative gold rate) propagates into every loan disbursed afterward with no independent check on the read side either.
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

#### fetchLiveSpotRatesAction()
- **Auth:** checkAuth() with the same inline ADMIN-role check as above.
- **Behavior:** Dynamically imports and calls web/src/lib/services/market-rates.ts's `fetchAndSaveLiveMetalRates` — a web/-resident duplicate of backend/'s identically-named method (section 2.7), independently implemented (same external APIs, same troy-ounce conversion constant, separate code), not a call into backend/.
- **Response:** `{ success: true, rates: MarketRates }` or `{ success: false, rates: {...}, error: string }`.

### 4.7 Admin Staff

File: web/src/app/(app)/admin/staff/actions.ts.

#### getStaffListAction()
- **Auth:** checkAdmin().
- **Response:** Array of `{ id, name, email, role, isActive, _count: { loansHandled, paymentsCollected }, createdAt, isSelf: boolean }` for every `user` row (not organization-scoped).

#### createStaffUserAction(formData: unknown)
- **Auth:** checkAuth() with an inline ADMIN-role check.
- **Validation — confirmed gap, priority P0:** `formData` is cast via `as` to `{ name, email, password, role }` with only `if (!data.name || !data.email || !data.password)` checked — no email-format check, no password length/strength requirement at all (the calling UI's default password value is the literal string `"password123"` — web/src/app/(app)/admin/staff/staff-client.tsx). The ADMIN-promotion branch **is** gated correctly (`if (data.role === "ADMIN")` before a follow-up `prisma.user.update`), so this specific action cannot itself be tricked into writing an arbitrary role string.
- **Behavior:** Checks for an existing user by email first; otherwise calls better-auth's `auth.api.signUpEmail` (which always creates a `STAFF` account per the `input: false` config in web/src/lib/auth.ts), then separately promotes to `ADMIN` via a direct `prisma.user.update` if requested.
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

#### updateStaffStatusAction(userId: string, isActive: boolean)
- **Auth:** checkAuth() with an inline ADMIN-role check.
- **Behavior:** Blocks self-deactivation (`userId === adminAuth.user.id` → error).
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

#### updateStaffUserAction(userId: string, data: { name, email, role, isActive })
- **Auth:** checkAuth() with an inline ADMIN-role check.
- **Validation — confirmed gap, priority P0, the real privilege-escalation risk in this module:** `data` is typed only via a TypeScript parameter annotation (unenforced at the network boundary — this is invoked as an RTK Query mutation, i.e. reachable directly). `name`, `email`, `role`, `isActive` are all written straight to `prisma.user.update` with **zero runtime validation**. The underlying Prisma `Role` enum has 5 members — `PLATFORM_OPERATOR, OWNER, ADMIN, BRANCH_MANAGER, STAFF` — not just the two values (`"ADMIN" | "STAFF"`) the admin UI's `<select>` exposes; a crafted call to this action could set `role` to `"OWNER"` or `"PLATFORM_OPERATOR"` and Prisma would accept it as a valid enum value. Self-demotion and self-deactivation are separately blocked (`if (userId === adminAuth.user?.id && data.role !== "ADMIN")`, `if (userId === adminAuth.user?.id && !data.isActive)`), and a duplicate-email check runs before the write.
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

#### deleteStaffUserAction(userId: string)
- **Auth:** checkAuth() with an inline ADMIN-role check.
- **Behavior:** Blocks self-deletion; blocks deletion if `prisma.loan.count({ where: { handledById: userId } }) > 0` (must deactivate instead); otherwise cascades `session`/`account` deletes then deletes the `user` row.
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

### 4.8 Onboarding

File: web/src/app/(app)/onboarding/actions.ts.

#### saveLoanPolicyAction(input: SavePolicyInput)
- **Auth — confirmed gap, priority P1, the most severe auth gap in web/'s Server Action surface:** **No authentication check of any kind.** Unlike every other file matched by web/src/app/**/actions.ts (confirmed by grepping every actions.ts file under web/src/app for `checkAuth`/`checkAdmin`/`requireSession`: every other file has at least 2 matches; this file has 0), this file imports only `prisma`, Prisma-generated enums, and `revalidatePath` — no import from web/src/lib/auth/session at all. There is no web/middleware.ts or web/src/middleware.ts to provide a route-level backstop (confirmed: neither path exists), and `checkAuth`/`checkAdmin` are opt-in per-action helpers, not globally enforced. This action can set org-wide loan policy for any caller able to reach the route, authenticated or not. It is also one of the 2 actions in this document not wired through RTK Query — it is called directly from web/src/app/(app)/onboarding/onboarding-wizard-client.tsx (see section 4.0).
- **Args:** `SavePolicyInput` — `{ organizationId?, currencyCode, currencySymbol, weightUnit: WeightUnit, purityExpression: PurityExpression, dayCountConvention: DayCountConvention, gracePeriodDays, mandatoryIdThreshold, ltvTiers: Array<{ maxValue: number | null; ltvPercent: number }> }`. (`WeightUnit`: GRAM/TROY_OUNCE/TOLA; `PurityExpression`: KARAT/MILLESIMAL_FINENESS/PERCENTAGE; `DayCountConvention`: ACTUAL_365/ACTUAL_360/THIRTY_360 — web/prisma/schema.prisma.)
- **Validation:** None — same unvalidated-`ltvTiers`-array pattern as backend/'s equivalent DTO (section 2.5).
- **Response:** `{ success: true, policyId: string }` or `{ success: false, error: string }`.

### 4.9 Platform Admin (Billing)

File: web/src/app/(app)/platform-admin/actions.ts. Supporting service: web/src/lib/services/billing.ts.

#### changeOrganizationPlanAction(organizationId: string, newPlan: string | null)
- **Auth — confirmed gap, priority P3:** checkAuth(), then a **conditionally-skipped** authorization check: `if (adminEmail && auth.user.email !== adminEmail) { check org ADMIN role }` — when the `PLATFORM_ADMIN_EMAIL` env var is unset, this whole block is skipped and **any authenticated user** (not just an admin) reaches `updateOrganizationPlan`. This is also one of the 2 actions in this document not wired through RTK Query — it is called directly from web/src/app/(app)/platform-admin/client.tsx inside a `useTransition` (see section 4.0).
- **Validation — confirmed gap:** `newPlan` is accepted as any string with no check that it's one of `PLAN_QUOTAS`'s recognized keys (`self_hosted`, `starter`, `growth`, `enterprise` — web/src/lib/services/billing.ts). `getPlanConfig` (same file) treats any unrecognized `billingPlan` value as `"self_hosted"` — the `Infinity`-quota, i.e. **unlimited**, tier. A typo'd or malicious plan string is not rejected; it's stored as-is and then resolves to the most permissive tier the next time the plan is read, which is the opposite of fail-safe. The calling UI's `<select>` (web/src/app/(app)/platform-admin/client.tsx) only emits the 4 valid values, but that's a client-side constraint on a directly-invocable Server Action.
- **Response:** `{ success: true }` or `{ success: false, error: string }`.
- **Related, separate gap (page-level, not this action):** web/src/app/(app)/platform-admin/page.tsx calls `checkAuth()` (confirmed: the result is assigned to a variable that is never read or branched on afterward) but never branches on the result before server-rendering a full cross-tenant billing table (via `prisma.organization.findMany()`) — any authenticated, active, role-bearing user (STAFF included, not just ADMIN) who clears the `(app)` layout's `requireSession()` gate (web/src/app/(app)/layout.tsx, which checks only for a valid session + role + isActive, not a specific role) can view all-tenant billing data on this page, though the mutation itself is still gated by the (conditionally-skipped) check described above.

### 4.10 Profile

File: web/src/app/(app)/profile/actions.ts.

#### updateProfileNameAction(formData: FormData)
- **Auth:** requireSession().
- **Validation:** Inline — `name.trim().length < 2` rejected with `"Name must be at least 2 characters long"`.
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

#### updateProfileAvatarAction(avatarUrl: string)
- **Auth:** requireSession().
- **Validation — confirmed gap, priority P2:** None at all — the raw string is written directly to `prisma.user.update({ data: { image: avatarUrl } })`. No URL-format check, no length cap, no protocol/domain allowlist. Contrast with the sibling action above, which does inline-validate. The only render site for this value anywhere in web/src is web/src/app/(app)/profile/profile-client.tsx's `<img src={displayAvatarUrl} ...>` (confirmed: `.image` appears nowhere else under web/src, including the sidebar and staff listings) — an overlong or malformed value breaks rendering there. web/src/lib/validation/customer.ts already has a directly reusable precedent (`photoUrl: z.string().url().optional().or(z.literal(""))`).
- **Response:** `{ success: true }` or `{ success: false, error: string }`.

---

## 5. Historical-Notes-vs-Current-Code Conflicts (per task rules: current code wins; conflicts noted)

- .agents/context.md and .agents/lessons.md record Postgres RLS as the load-bearing tenant-isolation mechanism ("Load-Bearing RLS: Row-Level Security enforced at Postgres level... Prisma reserved for schema migrations and service-role cross-tenant admin operations", .agents/context.md; "RLS Boundary: Tenant isolation must be enforced at the database level via Postgres Row-Level Security, not solely in application layer WHERE clauses", .agents/lessons.md) rather than tenant CRUD. Current code conflicts with this for GET /api/customers/search (section 2.2): it performs tenant CRUD via raw Prisma with no `organizationId` filter and no RLS session variable ever set anywhere in backend/src. Current code wins per this task's rules; the conflict itself is a real, present-day regression against this project's own recorded design.
- .agents/decisions.md's DEC-004 records a Stripe webhook handler as "RESOLVED & EXECUTED." Current code (backend/src/modules/webhooks/webhooks.service.ts, section 2.8) has since migrated that handler from Stripe to Dodo Payments and added real signature verification via the `dodopayments` SDK's `unwrap()` — verified working end-to-end via a live curl POST with no valid signature headers, which returned `401 Invalid webhook signature`. Whether the original pre-restructure route ever verified Stripe signatures is Unknown (that file no longer exists in web/); current code — now cryptographically verified, just against a different provider than the note describes — is what stands today.
- The task's own seed material describes backend/ as having "7 modules"; the verified, current module count is 8 (auth, cron, customers, health, market-rates, organizations, storage, webhooks) — noted in the Scope section as a miscount, not a code discrepancy.
- Separately (not a .agents/*.md conflict, but a code-internal one worth recording alongside these): web/package.json/package-lock.json declare and lock `next` at exactly 9.3.3, while the actual web/src/app source tree, its Server Actions, and its Route Handler are unambiguously written against Next.js's App Router (13.4+) — see the Scope section for the full citation. This is an internal inconsistency in the current manifest itself, not a stale-docs-vs-code conflict, and it remains unresolved: which version truly executes at runtime is Unknown from source.