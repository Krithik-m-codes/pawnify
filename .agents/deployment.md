# Pawnify Deployment

Reality-based record of how backend/ (partial NestJS API) and web/ (mature Next.js full-stack app) are built, configured, and deployed today. This document describes what actually works and what does not — it is not a description of intent. Where current code contradicts the pre-restructure notes in .agents/, that conflict is called out explicitly rather than silently resolved.

State captured: 2026-07-11, current working tree on top of HEAD b2523fb. Per git status and git log --all -- web/ backend/ .agents/ docker-compose.yml, the backend/, web/, .agents/ directories and docker-compose.yml have never been committed to this repository on any branch (the repository has exactly one branch, main, plus its remote-tracking ref; git log --all --oneline shows 7 commits total, none of which touch these paths) — everything described below is an in-progress, uncommitted working-tree state, not something that has passed through a commit, a PR, or CI (there is none — see Section 5).

## 1. Verdict

No path in this repository takes a fresh clone to a running production instance of either subsystem today, self-hosted or cloud-hosted. Every path examined — web/ on Vercel, the whole stack via docker-compose.yml, backend/ standalone — fails for independently reproducible reasons detailed in the sections below. Summary:

| Path | Status | Why |
|---|---|---|
| web/ via Vercel (web/vercel.json + framework auto-detect) | Broken | Same build script as everywhere else (web/package.json: prisma generate && next build) hits the identical Prisma and Next.js failures in Section 6.1, regardless of dashboard env vars. |
| Whole stack via docker-compose.yml | Broken | Five independent, stacked failures — wrong file paths, build-time/run-time env timing, and the web/ build failures underneath. See Section 3. |
| backend/ standalone | Compiles, but has no packaged runtime target | nest build succeeds (Section 6.2), but there is no Dockerfile, no compose service, no vercel.json, and no PaaS config anywhere for backend/. Running it means a person manually provisioning a host and running npm scripts by hand. |

## 2. Repository / Git State

git status --porcelain shows six untracked top-level entries — .agents/, CONTRIBUTING.md, LICENSE, backend/, docker-compose.yml, web/ — plus 149 files marked deleted (the old flat pre-restructure layout that HEAD b2523fb still reflects: root-level package.json, prisma/schema.prisma, src/app/..., etc.) and two modified tracked files:

- .gitignore: 43 lines at HEAD, replaced with a single line, .claude, in the working tree (git diff --numstat confirms 1 insertion, 43 deletions).
- AGENTS.md: 5 lines at HEAD, emptied to 0 bytes in the working tree (git diff --numstat confirms 0 insertions, 5 deletions; git show HEAD:AGENTS.md is 5 lines, the working-tree file is empty).

A current top-level listing confirms this: .agents, .claude, .git, .gitignore, AGENTS.md, ARCHITECTURE.md, CLAUDE.md, CONTRIBUTING.md, LICENSE, backend/, docker-compose.yml, web/. ARCHITECTURE.md and CLAUDE.md are tracked at HEAD and absent from git status entirely, i.e. unmodified. No root-level package.json, no root Dockerfile, no root sql/ directory, and no .github directory anywhere in the repository (repo root; confirmed by direct listing and by repository-wide glob for each).

Practical implication for this document: everything below describes an in-progress working-tree state that has not been reviewed, tested by any automated process, or merged. Whatever (if anything) is actually live in production today is necessarily unrelated to the files examined here, since none of them exist in git history.

## 3. Docker Setup

### 3.1 web/Dockerfile (web/ subsystem)

web/Dockerfile is a standard 3-stage Next.js build on node:20-alpine (web/Dockerfile):

- deps stage: copies package.json, package-lock.json, and prisma/, runs npm ci then npx prisma generate (lines 4-10).
- builder stage: copies node_modules from deps, copies the full source (COPY . ., line 16), sets NEXT_TELEMETRY_DISABLED=1, runs npm run build (line 18).
- runner stage: non-root nodejs/nextjs user; copies public/, .next/standalone, .next/static, prisma/, and node_modules from builder; EXPOSE 3000; PORT=3000, HOSTNAME=0.0.0.0; CMD ["npm", "start"] (lines 20-41).

This mirrors Next.js's official "standalone output" recipe for the COPY steps, but deviates in two ways that matter:

- Line 33 (COPY --from=builder /app/node_modules ./node_modules) copies the entire builder-stage node_modules into the runner stage in addition to the trimmed .next/standalone bundle, which defeats most of the size benefit of using standalone output.
- CMD ["npm", "start"] runs next start (web/package.json line 13) against the full app directory, not the official pattern's node server.js against the trimmed standalone bundle. This particular inconsistency alone would not prevent the container from running if the build had succeeded, since node_modules and the Next binary are both present in the runner stage.

Port alignment between Dockerfile (EXPOSE 3000 / PORT=3000) and docker-compose.yml ("3000:3000") is correct.

### 3.2 docker-compose.yml (repo root)

Defines two services, db and app; no service for backend/ at all (docker-compose.yml).

db (lines 4-21): postgres:16-alpine, restart always, credentials from POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB (defaulting to admin/admin1234/pawnify), port 5432 exposed, a named volume pawnify_pgdata, a bind mount ./sql/rls_policies.sql:/docker-entrypoint-initdb.d/01_rls_policies.sql:ro (line 16), and a pg_isready healthcheck.

app (lines 23-39): builds from context "." with dockerfile "Dockerfile" (i.e., expects a Dockerfile at the repo root), depends_on db with condition service_healthy, sets NODE_ENV, DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_DEMO_MODE, and APP_URL as environment variables, maps port 3000:3000.

### 3.3 Current broken state — explicit enumeration

Confirmed audit finding (docker-compose.yml, priority P1, difficulty Easy): the RLS volume mount and the app build both point at paths that do not exist at the repo root. The restructure moved these files to backend/sql/rls_policies.sql and web/Dockerfile respectively, and no service was ever added for backend/. Suggested remediation: point the volume mount at backend/sql/rls_policies.sql, add explicit build contexts for a new backend/ service and for web/ (using web/Dockerfile), and fix or remove the root-level Dockerfile reference.

Beyond that headline gap, five independent problems stack on top of each other, each of which alone would stop the stack from working even if the others were fixed:

1. Path mismatch (ground truth). build.context: . + dockerfile: Dockerfile expects ./Dockerfile at the repo root; the only Dockerfile anywhere in the repository is web/Dockerfile. The db service's ./sql/rls_policies.sql similarly does not exist at the repo root; the only such file is backend/sql/rls_policies.sql (backend/sql/rls_policies.sql confirmed present by direct glob).
2. Build-time vs run-time environment variables. docker-compose.yml's app.environment block (lines 32-37) is only injected at container-start time (docker-compose up), never during image build (docker build / docker-compose build). web/Dockerfile has no ARG/ENV supplying a datasource URL before RUN npx prisma generate (deps stage, line 10) or RUN npm run build (builder stage, line 18, which re-runs prisma generate via web/package.json's build script). So even with problem 1 fixed, the build would still fail at prisma generate — see Section 6.1 for the reproduced error, which is independent of compose entirely.
3. APP_URL vs NEXT_PUBLIC_APP_URL naming mismatch. docker-compose.yml sets a variable named APP_URL (line 37); web/ code never reads APP_URL anywhere — it reads process.env.NEXT_PUBLIC_APP_URL, with a "http://localhost:3000" fallback, in three places: web/src/lib/auth-client.ts line 7 (better-auth client baseURL), web/src/lib/auth.ts line 10 (better-auth server trustedOrigins), and web/src/app/layout.tsx line 24 (metadata.metadataBase). Because compose supplies the wrong name, the container would always fall back to the hardcoded default rather than any compose-supplied value, silently misconfiguring better-auth's base URL and the site's metadataBase — even before accounting for the fact that Next.js only inlines NEXT_PUBLIC_* variables at build time, which compose's run-time environment: block cannot supply anyway (same class of problem as #2). Neither NEXT_PUBLIC_APP_URL nor NEXT_PUBLIC_DEMO_MODE (read at web/src/app/(auth)/login/page.tsx line 287 as a strict "true" string check, gating a demo-credentials UI panel) appears in web/.env.example or web/.env.prod at all — docker-compose.yml is currently the only place in the repo that documents either variable, and it gets one of the two names wrong (confirmed: a repository-wide search for NEXT_PUBLIC_APP_URL matches only web/src/app/layout.tsx, web/src/lib/auth-client.ts, and web/src/lib/auth.ts — never docker-compose.yml — while NEXT_PUBLIC_DEMO_MODE correctly matches both docker-compose.yml and the login page).
4. next.config.ts never sets output: "standalone" (web/next.config.ts — the exported config object has no properties: const nextConfig: NextConfig = {/* config options here */};, a placeholder comment with no actual keys). Without that flag, Next.js never emits a .next/standalone directory. web/Dockerfile's runner stage unconditionally does COPY --from=builder .../.next/standalone ./ (line 30), which would fail the moment a next build ever actually completed, independent of problems 1-3 and of the build failures in Section 6.1.
5. No .dockerignore anywhere in the repo (web/, backend/, or root — confirmed by repo-wide glob). web/Dockerfile's builder stage does COPY . . (line 16), which — absent a .dockerignore — copies every file in web/, including web/.env (present on disk locally; holds the same placeholder values as web/.env.example — NEXT_PUBLIC_API_URL, NEXT_PUBLIC_BACKEND_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, BETTER_AUTH_SECRET, BETTER_AUTH_URL; see Section 4.3), into that intermediate build-stage filesystem layer. The final runner stage does a selective copy (public/, .next/standalone, .next/static, prisma/, node_modules only), so .env is not present in the final image, but it does transiently exist in the builder layer / build cache. The general risk this point illustrates — real secrets in a build context reaching an intermediate layer absent a .dockerignore — is not hypothetical: backend/.env (Section 4.3) does hold what appears to be live credentials, though backend/ has no Dockerfile or build context today for this mechanism to apply to (Section 6.2).

No service for backend/ exists in docker-compose.yml at all, so even a fully-fixed compose file as currently scoped would still never start the API.

## 4. Environment Variables

Two subsystems, two independent .env.example files, no shared/root one. web/README.md's self-hosting instructions tell the reader to run cp .env.example .env from the repo root (web/README.md line 42) — no such file exists at the repo root; see Section 13.

### 4.1 backend/.env.example (backend/ subsystem)

| Variable | Purpose | Actually consumed at | Notes |
|---|---|---|---|
| PORT | HTTP port NestJS listens on | backend/src/config/configuration.ts line 3 (default 3001); backend/src/main.ts line 42 (app.listen(port)) | |
| API_PREFIX | Global route prefix | configuration.ts line 4 (default api); main.ts line 17 (app.setGlobalPrefix) | All backend/ routes are served under /api/* by default, e.g. GET /api/health, GET/POST /api/cron/update-rates. |
| NODE_ENV | Standard Node environment flag | configuration.ts line 2 (default development) | |
| SUPABASE_URL | Supabase project URL | configuration.ts line 9, with fallback to NEXT_PUBLIC_SUPABASE_URL | See Section 4.5 — the fallback can be satisfied by web/'s env file, not just backend/'s. |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service-role key | configuration.ts line 11; backend/src/database/supabase.service.ts lines 16-22 (initializes the Supabase JS client, falling back to an anon key if service role key is absent) | Used both for backend/'s Supabase client (auth/storage) and, via that client, for the object-storage bucket in Section 10. |
| DATABASE_URL | Direct Postgres connection string | configuration.ts line 6; backend/src/database/supabase.service.ts lines 32-38 (initializes a raw pg Pool used for hand-written SQL, e.g. the session lookup in Section 4.5); backend/prisma/seed.ts line 20 (falls back from DIRECT_URL) | backend/ has no DIRECT_URL variable of its own in .env.example (unlike web/'s compose entry) — only DATABASE_URL. See Section 6.2 for why backend/prisma/seed.ts, which reads this same fallback, cannot actually run in backend/'s current tree regardless. |
| JWT_SECRET | Declared, described as "JWT & Security" | Not referenced anywhere in backend/src (confirmed via repository-wide grep — zero matches) | Dead configuration in the current codebase. backend/ does not verify a self-signed JWT anywhere; see Section 4.5 for what it actually verifies. |
| CRON_SECRET | Bearer-token secret protecting the cron endpoints | Read directly via process.env.CRON_SECRET in backend/src/modules/cron/guards/cron-auth.guard.ts line 15 (bypasses the ConfigService/configuration.ts layer entirely) | See Section 11 — this guard is a no-op (allows all requests) if the variable is unset. |
| DODO_PAYMENTS_API_KEY | Dodo Payments API bearer token, used to construct the `dodopayments` SDK client (`new DodoPayments({ bearerToken, environment, webhookKey })`) | Read directly via process.env.DODO_PAYMENTS_API_KEY in backend/src/modules/webhooks/webhooks.service.ts (also bypasses ConfigService) | Endpoint returns 501 if unset |
| DODO_PAYMENTS_WEBHOOK_KEY | Verifies incoming Dodo Payments webhook payloads via a real HMAC-SHA256 signature check (Standard Webhooks spec, via the `standardwebhooks` package the `dodopayments` SDK depends on) | Read directly via process.env.DODO_PAYMENTS_WEBHOOK_KEY in backend/src/modules/webhooks/webhooks.service.ts, passed to the SDK client that `client.webhooks.unwrap()` uses (also bypasses ConfigService) | Endpoint returns 501 if unset; replaces the old `STRIPE_WEBHOOK_SECRET`, which was previously only checked for presence, never used cryptographically — `unwrap()` now throws on an invalid/missing signature, turned into a real 401 |
| DODO_PAYMENTS_ENVIRONMENT | Selects the Dodo Payments SDK environment (`test_mode` or `live_mode`) | Read directly via process.env.DODO_PAYMENTS_ENVIRONMENT in backend/src/modules/webhooks/webhooks.service.ts | |

configuration.ts additionally supports SUPABASE_ANON_KEY (line 10, with a NEXT_PUBLIC_SUPABASE_ANON_KEY fallback) — a variable that is not listed in backend/.env.example at all, only inferable by reading the config source.

### 4.2 web/.env.example (web/ subsystem)

| Variable | Purpose | Actually consumed at | Notes |
|---|---|---|---|
| NEXT_PUBLIC_API_URL | Base URL web/'s client code uses to call backend/'s REST API | web/src/lib/axiosClient.ts lines 3-6 (first-priority fallback, default "http://localhost:3001/api") | Confirms web/ and backend/ are meant to communicate over HTTP as separate services. |
| NEXT_PUBLIC_BACKEND_URL | Secondary fallback for the same axios base URL | web/src/lib/axiosClient.ts line 5 | |
| NEXT_PUBLIC_SUPABASE_URL | Client-side Supabase project URL | Also usable as backend/'s SUPABASE_URL fallback — see Section 4.5 | |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Client-side Supabase anon key | Also usable as backend/'s SUPABASE_ANON_KEY fallback — see Section 4.5 | |
| BETTER_AUTH_SECRET | better-auth session signing secret | web/src/lib/auth.ts (betterAuth(...) config) | |
| BETTER_AUTH_URL | better-auth server base URL | web/src/lib/auth.ts | |

web/.env.example does not include NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_DEMO_MODE, both of which are read by web/ code (Section 3.3, point 3) — the only place either name appears anywhere in the repo is docker-compose.yml, which supplies the wrong name for one of them.

### 4.3 .env.prod files, and the real .env files on disk

Both subsystems also carry a committed-looking .env.prod (backend/.env.prod, web/.env.prod) with the same variable sets as their respective .env.example files, populated with placeholder-style production values (e.g. SUPABASE_URL=https://prod-project.supabase.co, CRON_SECRET=prod-cron-secret) rather than real secrets. These read as templates for a production environment, not live credentials.

Separately, both subsystems also carry a plain .env file actually present on disk (backend/.env, web/.env — both untracked, like the rest of backend/ and web/, Section 2). The two differ materially:

- web/.env is byte-for-byte identical to web/.env.example (diff confirms zero differences): pure placeholder values (your-project.supabase.co, your-supabase-anon-key, your-better-auth-secret, etc.), not real credentials.
- backend/.env is not a placeholder file. Alongside the same PORT/API_PREFIX/NODE_ENV values as backend/.env.example, it holds a specific Supabase project subdomain, a JWT-structured SUPABASE_SERVICE_ROLE_KEY value, and pooler-hostname DATABASE_URL / DIRECT_URL entries all referencing that same project reference — categorically different in kind from the your-project.supabase.co / your-supabase-service-role-key placeholders in backend/.env.example and backend/.env.prod. This document does not reproduce those values. Whether that Supabase project is still active, and whether the key has since been rotated, cannot be determined from the repository (Unknown) — but backend/.env's contents should be treated as live secret material, not a template, and scrubbed or rotated before any commit or wider sharing.

### 4.4 docker-compose.yml's own environment block

app.environment (docker-compose.yml lines 32-37) sets NODE_ENV, DATABASE_URL, DIRECT_URL (pointed at the db service's internal hostname db:5432), NEXT_PUBLIC_DEMO_MODE, and APP_URL. None of backend/'s required variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, CRON_SECRET, DODO_PAYMENTS_API_KEY, DODO_PAYMENTS_WEBHOOK_KEY, DODO_PAYMENTS_ENVIRONMENT) are set here — consistent with there being no backend/ service defined at all in this file.

### 4.5 Cross-service authentication and configuration wiring (backend/ and web/)

This was flagged by the orchestrator as needing direct verification rather than assumption. Confirmed by reading backend/src/modules/auth/auth.service.ts, backend/src/modules/auth/guards/jwt-auth.guard.ts, backend/src/modules/auth/auth.repository.ts, web/src/lib/auth.ts, and web/src/lib/auth-client.ts:

web/ authenticates using better-auth (web/src/lib/auth.ts, web/src/lib/auth-client.ts), backed by a Prisma adapter against Postgres (prismaAdapter(prisma, { provider: "postgresql" }), web/src/lib/auth.ts lines 5-8). Supabase is not used for primary authentication in web/ — it is used for Postgres/RLS/storage, consistent with the orchestrator's hypothesis.

backend/'s JwtAuthGuard (backend/src/modules/auth/guards/jwt-auth.guard.ts) extracts a credential from either an Authorization: Bearer <token> header or a better-auth.session_token cookie (lines 44-67), then calls AuthService.validateToken(token) (backend/src/modules/auth/auth.service.ts lines 12-37), which tries two things in order:

1. A raw SQL lookup of that exact token against the shared Postgres session table — SELECT id, "userId", token, "expiresAt" FROM "session" WHERE token = $1 AND "expiresAt" > NOW() LIMIT 1 (backend/src/modules/auth/auth.repository.ts lines 16-22) — i.e., backend/ validates a better-auth session by directly querying the same database row that better-auth's Prisma adapter wrote in web/, not by verifying any cryptographic signature.
2. If that lookup does not yield an active user — no session row found, or a found session's user is missing or inactive (auth.service.ts lines 16-25) — AuthService falls back to supabase.auth.getUser(token) (backend/src/modules/auth/auth.repository.ts lines 32-37), i.e., verifying the token as a Supabase-issued JWT via the Supabase Auth API.

So backend/ accepts either a raw better-auth session token (validated via direct DB lookup) or a genuine Supabase JWT (validated via Supabase's own API) — it never verifies a token against JWT_SECRET, which is why that variable has zero references in backend/src (Section 4.1). This has a direct deployment consequence: backend/ must have network access to the same Postgres database that web/'s better-auth Prisma adapter writes sessions into (shared DATABASE_URL) for path 1 to work at all — the two subsystems cannot be pointed at independent databases and still share sessions.

Separately, backend/src/config/config.module.ts line 11 configures NestJS's ConfigModule with envFilePath: ['.env', '../web/.env'] — backend/'s own config loader explicitly also reads a .env file one directory above its own (i.e., from a sibling web/ directory), which is how configuration.ts's NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY fallbacks (Section 4.1) are intended to resolve in practice. This hard-codes an assumption that backend/ and web/ are checked out as siblings on the same filesystem (true of the current repo layout) and will silently fail to pick up that fallback (NestJS's ConfigModule does not error on a missing envFilePath entry) if backend/ is ever deployed standalone, copied out of this repository layout, or run from a different working directory — a real constraint for anyone attempting the "backend/ deployed separately" path implied by NEXT_PUBLIC_API_URL / NEXT_PUBLIC_BACKEND_URL (Section 4.2).

Also worth noting: NestConfigModule.forRoot (backend/src/config/config.module.ts lines 8-12) has no validationSchema, and SupabaseService.onModuleInit (backend/src/database/supabase.service.ts lines 14-39) does not throw when credentials are missing — it only logs a warning and leaves this.pool / this.supabaseClient undefined. Any repository code that then calls this.pool.query(...) (e.g. AuthRepository, or the health check in Section 12) would fail lazily at request time with an ambiguous runtime error rather than a clear boot-time failure. There is no fail-fast startup validation of required environment variables anywhere in backend/.

## 5. CI/CD

None exists. Confirmed audit finding (repo root, priority P2, difficulty Medium): there is no .github directory anywhere in the repository (no workflows of any kind), and no monorepo tooling (no turbo.json, nx.json, pnpm-workspace.yaml, or lerna.json — confirmed by repository-wide globs; the only lerna.json matches anywhere are inside third-party node_modules test fixtures, not repository tooling). backend/ and web/ are two fully independent npm projects, each with its own package-lock.json, connected only by convention and by docker-compose.yml. No automated build, lint, or test gate runs on any change in either subsystem, and a breaking change in one (e.g. a backend/ DTO field rename) can silently break the other (e.g. a web/ RTK Query slice expecting the old field shape) with nothing catching it before a human notices at runtime. Suggested remediation: add a CI workflow that builds/lints/tests both backend/ and web/ on every push and pull request; consider npm/pnpm workspaces or Turborepo if the two projects need to share types or run together routinely.

## 6. Production Build Process

### 6.1 web/ (web/ subsystem)

web/package.json's build script is prisma generate && next build (web/package.json line 12). Both halves fail independently and reproducibly in the current working tree:

1. prisma generate fails unconditionally — Prisma error P1012: "Argument \"url\" is missing in data source block \"db\"", pointing at web/prisma/schema.prisma's datasource block (lines 8-10: datasource db { provider = "postgresql" } — no url field at all, not even an env() reference). web/prisma.config.ts attempts to inject a URL programmatically (datasource: { url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"] }, web/prisma.config.ts lines 10-12), but re-running the build with both variables explicitly exported to a syntactically valid dummy Postgres URL produced the byte-identical error — ruling out "missing env var" as the cause. This was independently reproduced again in this pass (npx prisma generate with DATABASE_URL and DIRECT_URL both set to a dummy postgresql:// URL, run directly against the working tree); it is a deterministic failure of the currently committed-to-working-tree schema/config combination, not an environment artifact.
2. next build then fails immediately with: "Configuring Next.js via 'next.config.ts' is not supported. Please replace the file with 'next.config.js'." — reproduced directly in this pass via npx next build. web/package.json pins "next": "^9.3.3" (line 47), and web/package-lock.json / the installed web/node_modules/next/package.json both agree on 9.3.3 exactly — a version that predates App Router entirely and rejects TypeScript config files outright. web/src/app is nonetheless a complete App Router tree (route groups (app)/(auth), dynamic segments, server actions, the better-auth catch-all at web/src/app/api/auth/[...all]/route.ts), with no pages/ directory anywhere (confirmed: no web/src/pages or web/pages exists). Git history shows this is a regression: the last commit's root-level package.json (pre-restructure, confirmed via git show HEAD:package.json) pinned "next": "16.2.10" exactly, matching the still-present "eslint-config-next": "16.2.10" devDependency in the current web/package.json (line 67). Nothing in the repository explains the regression to ^9.3.3.
3. Even if both of the above were fixed, web/next.config.ts's exported config is an empty object — output: "standalone" is never set anywhere in the repo (confirmed by repository-wide search; the sole unrelated match, in web/src/__tests__/waterfall.test.ts, is a code comment about "standalone atomic allocation rules" for payment waterfalls, not a Next.js config key) — so web/Dockerfile's runner-stage COPY of .next/standalone (line 30) would still fail; see Section 3.3.

A Vercel deployment of web/ would install from the same web/package-lock.json and run the same build script, hitting failures 1 and 2 regardless of what environment variables are configured in a Vercel project dashboard (proven irrelevant to failure 1 specifically, since a syntactically valid dummy DATABASE_URL/DIRECT_URL did not change the error).

### 6.2 backend/ (backend/ subsystem)

backend/'s build script is nest build (backend/package.json line 9); production start is node dist/main via start:prod (line 15), the standard NestJS entrypoint, consistent with backend/nest-cli.json (sourceRoot: "src", deleteOutDir: true under compilerOptions, default dist/ output). Running nest build directly in this pass completed with exit code 0, regenerating backend/dist/main.js and the full dist/ tree — the only build path in the repository verified to succeed end-to-end.

Three caveats worth flagging precisely:

- backend/package.json has no postinstall or prisma-generate step anywhere in its scripts (unlike web/package.json's explicit build: "prisma generate && next build" and postinstall: "prisma generate"). backend/prisma/schema.prisma has the identical structural gap as web/'s — a datasource block with no url field (backend/prisma/schema.prisma lines 8-10) — and backend/ has no prisma.config.ts at all (confirmed by glob — none exists) to attempt the override web/ attempts. Because nest build is a pure TypeScript compile, it only needs @prisma/client's type declarations to already exist in node_modules (from some prior generate) to succeed — it does not itself invoke or require prisma generate. This was tested directly in this pass: running npx prisma generate inside backend/ (against the existing node_modules, which already has a previously-generated @prisma/client) reproduces the identical P1012 error seen in web/ — "Argument \"url\" is missing in data source block \"db\"", pointing at the same lines 8-10 — confirming that a genuinely fresh install needing to run prisma generate for the first time would fail identically. nest build currently succeeds only because a working @prisma/client already exists in node_modules from some prior generate; nothing in backend/'s own scripts would ever regenerate it.
- backend/'s GET /api/health endpoint depends on Prisma: HealthRepository.checkDatabaseConnection (backend/src/modules/health/health.repository.ts) calls this.prisma.$queryRaw`SELECT 1` via PrismaService (backend/src/database/prisma.service.ts), which extends the generated PrismaClient. If @prisma/client were not properly generated in a given deployment environment, this specific endpoint (and backend/src/modules/organizations/organizations.repository.ts, the other confirmed Prisma consumer) would fail at runtime even though the rest of backend/ (which mostly uses the raw pg Pool via SupabaseService, e.g. auth session lookups) would not be affected.
- backend/prisma/seed.ts is identical to web/prisma/seed.ts — a diff between the two files shows zero differences, and both are 1,045 lines — and it imports ../src/lib/auth, a module that does not exist anywhere under backend/src (backend/ has no src/lib directory at all, confirmed by glob/find). backend/package.json defines no db:seed script and no top-level prisma.seed config (unlike web/package.json's, which has both — Section 4.1), so nothing in backend/'s own lifecycle invokes this file. It reads as a stray file-level copy left over from the restructure rather than a working part of backend/'s build, seed, or deploy path: running it manually (e.g. npx tsx prisma/seed.ts from inside backend/) would fail immediately on the missing import, independent of the datasource-url problem above.

Nothing packages or runs backend/ anywhere: no Dockerfile, no docker-compose service, no vercel.json, no Procfile/render.yaml/railway.json/fly.toml anywhere in the repository (confirmed by repository-wide globs — zero matches for any of these outside web/vercel.json). The only way to run backend/ today is manually: npm install, npm run build, npm run start:prod (or start:dev for iteration), on a host someone provisions and configures by hand with backend/.env's variables (Section 4.1).

## 7. Cloud Providers Actually Referenced

### 7.1 Vercel

The only Vercel-specific file in the repository is web/vercel.json (a repo-wide glob for vercel.json returns exactly this one match — no root-level or backend/ vercel.json exists). Its entire content is one Cron entry: path /api/cron/update-rates, schedule 0 0 * * * (daily at midnight) — byte-identical to the last-committed root-level vercel.json (confirmed via git show HEAD:vercel.json), carried over verbatim by the restructure. See Section 11 for why this cron entry is non-functional today. web/'s better-auth configuration also references a Vercel-specific runtime variable directly: web/src/lib/auth.ts lines 9-13 includes process.env.VERCEL_URL in its trustedOrigins list (a variable Vercel injects automatically at runtime, not one declared in any .env.example), alongside a hardcoded fallback origin "https://pawnify-three.vercel.app" — implying a Vercel deployment of web/ existed or was intended at some point, though whether it is presently live cannot be determined from the repository.

### 7.2 Supabase

Referenced extensively in both subsystems as the Postgres/Auth/Storage provider: web/.env.example (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) and web/package.json's @supabase/supabase-js dependency (line 35); backend/.env.example (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) and backend/src/database/supabase.service.ts, which initializes both a Supabase JS client (for Auth/Storage calls) and a plain pg Pool against the same DATABASE_URL (for raw SQL). See Section 4.5 for how Supabase Auth is used only as a fallback verification path in backend/, not as web/'s primary auth mechanism (that is better-auth).

## 8. Database

Postgres 16 in both deployment shapes referenced in this repo:

- Self-hosted via docker-compose.yml's db service (postgres:16-alpine, Section 3.2) — currently broken as a bootstrap path because its RLS-policy init script mount points at a nonexistent ./sql/rls_policies.sql (Section 3.3); the real file is at backend/sql/rls_policies.sql.
- Bring-your-own Supabase Postgres — both backend/.env.example and web/.env.example expect a DATABASE_URL pointing at a Supabase-hosted Postgres instance (db.your-project.supabase.co), which is how Row-Level Security is described as being enforced (session-scoped variables such as app.current_organization_id) per .agents/decisions.md (DEC-001, line 11) and, in current-code documentation, web/README.md (line 21). This is a correction to scope: .agents/schema.md does not describe RLS enforcement or session variables at all — it is a proposed Prisma model/hierarchy blueprint only (Organization/Branch/LoanPolicy/DocumentType), with no mention of app.current_organization_id anywhere in it. This document does not re-verify the RLS policy SQL itself beyond confirming backend/sql/rls_policies.sql is the one real copy in the repo — that is a schema/domain-logic concern out of scope here.

Two independent Prisma schemas exist — web/prisma/schema.prisma and backend/prisma/schema.prisma — both declaring the same datasource db { provider = "postgresql" } shape with no url field (Section 6.1, Section 6.2), and both presumably intended to point at the same underlying multi-tenant database given backend/'s direct dependency on tables written by web/'s better-auth adapter (Section 4.5). Whether the two schema.prisma files are otherwise identical model-for-model was not exhaustively diffed in this task; backend/'s Prisma usage observed is narrower (PrismaService/organizations.repository.ts) than the full domain model implied by the historical notes for web/.

## 9. Redis

Not found anywhere. A repository-wide, case-insensitive search for redis, ioredis, and bullmq/bull-related terms in every package.json in the repository (excluding node_modules) returns no matches in either subsystem. There is no queue, job runner, or cache layer of any kind referenced in the code. This is directly relevant to Section 11 (cron): nothing in the repo provides in-process scheduling as an alternative to an external trigger.

## 10. Object Storage

Supabase Storage, via backend/'s storage module (backend/src/modules/storage/storage.service.ts). StorageService.uploadFile uploads a Multer file buffer to a Supabase Storage bucket (default bucket name "pawnify-docs", line 5) using the Supabase JS client obtained from SupabaseService.getClient(), then returns a public URL via supabase.storage.from(bucketName).getPublicUrl(...) (lines 49-51). If the Supabase client was never initialized (missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY, Section 4.1), the service degrades to returning a fabricated fallback URL string (/uploads/fallback/<filename>, lines 27-33) rather than throwing — another instance of the lazy-failure pattern noted in Section 4.5. No other object storage provider (S3, GCS, Azure Blob, Cloudinary, etc.) is referenced anywhere in the repository (confirmed via repository-wide search of every package.json for the relevant SDK package names).

## 11. Cron Jobs

backend/'s cron module (backend/src/modules/cron/cron.controller.ts) exposes GET and POST /api/cron/update-rates (route resolved as /api/cron/update-rates given the api global prefix, Section 4.1), both calling MarketRatesService.fetchAndSaveLiveMetalRates() and both guarded by @UseGuards(CronAuthGuard) at the controller level (line 16).

CronAuthGuard (backend/src/modules/cron/guards/cron-auth.guard.ts): if process.env.CRON_SECRET is unset, canActivate returns true unconditionally (lines 16-18) — the endpoint is open to anyone with no authentication at all. If CRON_SECRET is set, the guard requires an exact Authorization: Bearer <CRON_SECRET> header match (lines 20-24); otherwise it logs a warning and throws a 401 (lines 26-27). Operationally, this means the endpoint's security is entirely dependent on an operator remembering to set CRON_SECRET in whatever environment runs backend/ — there is no default-deny behavior.

How this would actually get triggered on a schedule: nothing in the repository currently does so. cron.module.ts registers no @nestjs/schedule job (confirmed: no ScheduleModule import and no @Cron/@Interval/@Timeout decorator anywhere in backend/src), and @nestjs/schedule is not a dependency of backend/ at all (confirmed via backend/package.json) — there is no self-triggering scheduler inside the NestJS process. web/vercel.json's one cron entry targets the path string /api/cron/update-rates (Section 7.1), which is the same path string as backend/'s route, but Vercel Cron entries only ever invoke a path on the same deploying project's own domain (the crons schema has no host/url field) — so even if web/ were successfully deployed to Vercel, its cron could never reach backend/, an entirely separate, currently-undeployed service (Section 6.2). Separately, no route matching /api/cron/* exists anywhere under web/src/app/api today (the only route there is the better-auth catch-all, web/src/app/api/auth/[...all]/route.ts — confirmed this is the sole file under web/src/app/api) — so web/vercel.json's cron entry is also pointed at a path that doesn't exist in the project that would receive it, independent of the cross-service problem. Given Section 9 (no Redis/queue library) and this cron module having no in-process scheduler, an external scheduler is required for this job to ever run periodically in practice — e.g., a hosted cron service (such as a redeployed Vercel Cron pointed correctly at wherever backend/ ends up running, if that host exposes a stable HTTPS URL), a scheduled CI job, or an OS-level cron/systemd timer on whatever host eventually runs backend/ — none of which currently exists anywhere in this repository.

## 12. Monitoring and Observability

Largely none found. There is no Sentry, Datadog, New Relic, Grafana, Prometheus, Logtail, Axiom, or PostHog reference anywhere in either subsystem's package.json or source code (confirmed via repository-wide case-insensitive search across both). OpenTelemetry is a partial exception, worth stating precisely: web/package-lock.json resolves @opentelemetry/semantic-conventions (a direct dependency of @better-auth/core) and @opentelemetry/api (an optional peer dependency of the same package) — both pulled in transitively by better-auth itself, not by any Pawnify application code. Neither package is imported anywhere under web/src (confirmed via search), no OpenTelemetry SDK is configured, and nothing exports traces or metrics anywhere in the repository. So the substantive conclusion — no monitoring/observability tool is actually wired up and in use — still holds; only the earlier characterization of the package-lock.json match as an unrelated coincidental substring was inaccurate.

What does exist:

- NestJS's built-in Logger, used throughout backend/ (e.g. backend/src/main.ts, every guard/service/repository shown above logs via new Logger(ClassName.name) or similar) — this is console-based structured logging local to whatever process runs backend/, with no shipping to any external log aggregator configured in code.
- A global LoggingInterceptor and AllExceptionsFilter, imported at backend/src/main.ts lines 6-7 and wired up at lines 27-28 — request/response and exception logging, still local/console-based.
- One health endpoint, GET /api/health (backend/src/modules/health/health.controller.ts), which reports { status, database, timestamp } based on a Prisma SELECT 1 (Section 6.2) — this is a liveness/readiness check an external monitor could poll, but nothing in the repository currently polls it; there is no uptime-monitoring configuration, alerting rule, or dashboard defined anywhere.
- web/ has no equivalent health-check route and no client-side error-tracking SDK configured (no Sentry SDK or similar in web/package.json's dependencies).

## 13. Documentation vs. Reality Gaps

- web/README.md presents a "Self-Hosting Quickstart (Docker Compose)" (web/README.md lines 33-49) instructing git clone ... && cd pawnify, cp .env.example .env, then docker-compose up -d --build from the repo root. Per Sections 3-4, none of this works as written today: there is no root-level .env.example (only backend/.env.example and web/.env.example, with different variable sets), and docker-compose up --build fails per every issue enumerated in Section 3.3.
- backend/README.md is unmodified NestJS CLI scaffolding — it references NestJS's generic hosted docs and a third-party "Mau" AWS deployment platform (backend/README.md lines 60-71) that is not configured, referenced, or installed anywhere else in this repository (no mau.json, no other mention). This describes a generic NestJS deployment option, not anything actually wired up for Pawnify.

## 14. Historical Notes vs. Current Code

.agents/tasks.md line 28 marks "Docker Compose setup & documented .env.example" as complete ([x]), and .agents/decisions.md lines 20-21 state Pawnify supports "Complete self-hosted Docker Compose orchestration (docker-compose.yml) running local PostgreSQL 16 + Next.js 15" as one of two supported deployment topologies. Current code contradicts both claims: the compose file as it stands cannot build the app service or initialize RLS (Section 3.3), and there is no single documented .env.example — there are two, one per subsystem, with no root-level equivalent (Section 4). Per the standing instruction for this document set, current code wins; this conflict is recorded here rather than silently resolved. These notes also predate the backend/ extraction entirely and do not anticipate a two-service topology at all, which is consistent with docker-compose.yml defining no backend/ service.

## 15. Open Questions (Unverifiable From This Repository)

- Whether a Vercel project dashboard (outside version control) has DATABASE_URL, DIRECT_URL, and NEXT_PUBLIC_APP_URL configured as build-time variables, or has overridden the default Build Command away from web/package.json's script — cannot be determined from repository contents.
- Whether backend/ is actually deployed anywhere today (a VM, Railway, Render, Fly, etc.) via provider-dashboard configuration invisible to this repo — cannot be determined from repository contents.
- Whether any real, currently-live production system is still running the old pre-restructure flat-layout commit rather than anything under web/ or backend/ — cannot be determined without access to the actual hosting provider.
- The intended original value of web/'s "next" dependency before it became "^9.3.3" (typo, bad merge, or deliberate downgrade) — cannot be determined from the repository; only that it contradicts the last-committed root package.json's "next": "16.2.10" and the still-present eslint-config-next: 16.2.10 devDependency.
- Whether web/prisma.config.ts's datasource.url override was meant to pair with a sibling engine: "classic" key (an unfinished edit) or reflects a misunderstanding of the Prisma config API — cannot be determined from the repository, only from the reproduced failure behavior.
- Whether the Supabase project referenced by backend/.env's non-placeholder credentials (Section 4.3) is still active, and whether that service-role key has since been rotated — cannot be determined from the repository.

## 16. Remediation Checklist (Derived Strictly From Sections Above)

1. docker-compose.yml: fix the RLS SQL bind-mount path to backend/sql/rls_policies.sql; add a build context for a new backend/ service; fix or remove the root Dockerfile reference so it targets web/Dockerfile (Section 3.3).
2. web/prisma/schema.prisma: add a url field to the datasource block (or fix web/prisma.config.ts's override mechanism) so prisma generate can run without a hardcoded, valid connection string at parse time (Section 6.1).
3. web/package.json: correct the "next" version back toward the last-known-working 16.2.10 (matching eslint-config-next), and replace next.config.ts with next.config.js or upgrade to a Next.js version that supports TypeScript config (Section 6.1).
4. web/next.config.ts (or its replacement): add output: "standalone" so web/Dockerfile's runner-stage COPY succeeds (Section 3.3).
5. docker-compose.yml: rename APP_URL to NEXT_PUBLIC_APP_URL and pass it as a Docker build ARG (not just a run-time environment: entry) so Next.js can inline it (Section 3.3, Section 4.4).
6. Add a .dockerignore to web/ (at minimum excluding .env*, .git, node_modules) before any Docker build is attempted again (Section 3.3).
7. backend/: add a Dockerfile, a docker-compose service, and/or a PaaS config (Procfile, render.yaml, etc.) — currently zero deployment mechanism exists (Section 6.2).
8. backend/: add an explicit prisma generate step to the build/install lifecycle and give backend/prisma/schema.prisma a working datasource url — confirmed necessary, not merely theoretical: running prisma generate in backend/ today reproduces the same P1012 failure as web/'s (Section 6.2), and nest build currently only succeeds because a previously generated @prisma/client already sits in node_modules, which a genuinely fresh install would not have.
9. web/vercel.json and backend/'s cron controller: either redirect the Vercel Cron entry at wherever backend/ actually ends up hosted (once Section 7 items are resolved) or implement an equivalent external scheduler — nothing today calls /api/cron/update-rates on any schedule (Section 11).
10. Add a CI workflow covering both subsystems (Section 5) — currently the only gate on any change is a human.
11. backend/prisma/seed.ts: delete it or rewrite it against backend/'s actual NestJS module set. As it stands it is an unmodified copy of web/prisma/seed.ts, imports a ../src/lib/auth module that does not exist under backend/src, and is invoked by nothing in backend/package.json (Section 6.2).

---

I fact-checked this document by directly re-reading and, where practical, re-executing the underlying source in E:\projects\pawnify. Corrections made to the draft, in order of materiality:

1. Section 2 (Repository/Git State) was substantially wrong: it undercounted untracked top-level entries (four claimed vs. six actual — missing CONTRIBUTING.md and LICENSE), overcounted deleted files (152 vs. 149 actual), and missed that AGENTS.md is a second modified tracked file (emptied from 5 lines to 0), not just .gitignore. The "current top-level listing" it gave also omitted AGENTS.md, ARCHITECTURE.md, CLAUDE.md, CONTRIBUTING.md, and LICENSE. All fixed with exact git diff --numstat and git show HEAD figures.
2. Section 3.3/4.3: the claim that web/.env holds "real-looking values" was wrong — it is byte-identical to web/.env.example (pure placeholders). The actually-consequential finding, not in the original draft, is that backend/.env (a different file) does hold what appears to be a live Supabase project reference and a JWT-structured service-role key; I flagged this without reproducing the secret.
3. Section 6.2: upgraded "whether backend/'s prisma generate would fail the same way... not independently re-executed" from an inference to a directly confirmed result — I ran it and it reproduces the identical P1012 error.
4. Section 6.2: added a new, directly verified finding not in the draft — backend/prisma/seed.ts is an unmodified copy of web/prisma/seed.ts and imports a ../src/lib/auth module that does not exist anywhere in backend/src, and nothing in backend/package.json invokes it. Added a corresponding remediation item.
5. Section 12: corrected a wrong claim that a package-lock.json monitoring-tool match was "an unrelated substring" — it is in fact @opentelemetry/semantic-conventions and @opentelemetry/api, real (if unused/transitive, via @better-auth/core) dependencies.
6. Section 8: fixed a citation — .agents/schema.md does not describe RLS session variables at all (only .agents/decisions.md DEC-001 and web/README.md do); the draft had attributed the claim to both files.
7. Section 4.5: made the session-lookup SQL quote exact (added the LIMIT 1 clause) and made the auth fallback description precise (it also falls back when a session row exists but its user is missing/inactive, not only when no row is found).
8. Section 12: fixed a line-citation (backend/src/main.ts imports AllExceptionsFilter and LoggingInterceptor at lines 6-7, not just line 7).
9. Section 3.3/6.1: corrected a slightly inexact quotation of web/next.config.ts's contents (it contains a comment, not literally {}).

Everything else in the draft — every other file path, line number, route path, config value, and library reference I checked (the great majority of the document) — matched the actual repository state exactly on direct re-inspection, including precise line-by-line verification of web/Dockerfile, docker-compose.yml, backend/src/config/configuration.ts, backend/src/config/config.module.ts, the cron/webhooks/storage/health modules, web/package.json, web/next.config.ts, web/prisma.config.ts, both prisma schemas, both auth.ts/auth-client.ts files, axiosClient.ts, layout.tsx, the login page's demo-mode check, both READMEs, both vercel.json states (current and at HEAD), and the .agents/ notes.