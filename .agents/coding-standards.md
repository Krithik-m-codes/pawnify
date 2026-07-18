# Pawnify Coding Standards

## 1. Scope and Method

This document describes coding conventions as observed in the current codebase, not aspirational conventions from planning documents. It covers two independent npm projects joined only by a shared Postgres database and shared conventions (docker-compose.yml, no monorepo tooling — verified: no root package.json, turbo.json, pnpm-workspace.yaml, lerna.json, or nx.json exists at the repository root):

- backend/ — a partial NestJS 11 API. backend/src/modules contains 8 module directories (auth, cron, customers, health, market-rates, organizations, storage, webhooks), not 7 — verified directly by directory listing and by backend/src/app.module.ts's imports array, which registers all 8 as Nest modules.
- web/ — a mature Next.js App Router application (backend/package.json and web/package.json show no shared workspace config — neither file has a "workspaces" key) with Prisma, Supabase, better-auth, and Redux Toolkit Query, still owning most business logic (loans, payments, followups, billing, settings, staff, reports, dashboard).

Where a rule differs between subsystems, both are stated explicitly. Where the codebase itself is inconsistent, the inconsistency is stated as the fact — this document does not paper over contradictions. Quantitative claims (line counts, occurrence counts) were produced by direct grep/wc -l against the working tree, not estimated.

The five pre-restructure files at .agents/context.md, .agents/decisions.md, .agents/lessons.md, .agents/schema.md, .agents/tasks.md describe a single-app architecture that predates the backend/ extraction. Current code wins wherever they conflict; conflicts are noted inline.

## 2. Formatting: Prettier & ESLint

### 2.1 Prettier

Both subsystems have their own Prettier config; the two disagree on quote style, trailing commas, and print width.

| Setting | backend/.prettierrc | web/.prettierrc.json |
|---|---|---|
| singleQuote | true | false (double quotes) |
| trailingComma | "all" | "es5" |
| printWidth | (unset → Prettier default 80) | 100 |
| tabWidth | (unset → default 2) | 2 |
| semi | (unset → default true) | true |
| endOfLine | (unset in the file itself; see 2.2) | "auto" |

backend/.prettierrc is a 2-key file. web/.prettierrc.json additionally sets printWidth: 100 and endOfLine: "auto" directly in the Prettier config itself. Only web/ has a .prettierignore (node_modules, .next, out, build, package-lock.json, *.md).

npm scripts differ: backend/package.json's format script is scoped to prettier --write "src/**/*.ts" "test/**/*.ts"; web/package.json's is prettier --write . (repo-wide, subject to .prettierignore) and web/ additionally has a format:check script (prettier --check .) that backend/ lacks.

### 2.2 ESLint

backend/eslint.config.mjs (flat config) builds on eslint.configs.recommended and tseslint.configs.recommendedTypeChecked, then layers eslint-plugin-prettier/recommended, then applies three explicit rule overrides:

```js
'@typescript-eslint/no-explicit-any': 'off',
'@typescript-eslint/no-floating-promises': 'warn',
'@typescript-eslint/no-unsafe-argument': 'warn',
'prettier/prettier': ['error', { endOfLine: 'auto' }],
```

This means explicit any is fully permitted (never flagged), an un-awaited promise is a warning rather than a lint failure, and — notably — the ESLint-enforced endOfLine is "auto", which is not the same value backend/.prettierrc itself specifies (backend/.prettierrc doesn't set endOfLine at all, so a bare prettier --write run defaults to Prettier's own default rather than the "auto" ESLint enforces). Running npm run format and npm run lint --fix in backend/ are not guaranteed to converge on identical output for line endings.

web/eslint.config.mjs spreads only eslint-config-next's core-web-vitals and typescript presets, with zero local rule overrides:

```js
export default eslintConfig; // = [...nextVitals, ...nextTs, globalIgnores([...])]
```

Notably, web/package.json lists eslint-config-prettier (^10.1.8) and eslint-plugin-prettier (^5.5.6) as devDependencies, but web/eslint.config.mjs imports neither — Prettier and ESLint run as two disconnected tools in web/ (verified by reading the full file, which is 18 lines total, not 19; no prettier import appears anywhere in it). backend/ wires them together via eslint-plugin-prettier/recommended; web/ does not, despite having the packages installed. The internal rule contents of eslint-config-next's two presets were not inspected (third-party package internals) — whether they flag no-explicit-any is Unknown.

Net effect: backend/ has a documented, if partial, relaxation of strict-TypeScript lint rules; web/ inherits whatever eslint-config-next enforces, with no project-specific override in either direction.

## 3. TypeScript Configuration and Strictness

The two tsconfig.json files diverge in an order that runs contrary to what module age would suggest.

| Setting | backend/tsconfig.json | web/tsconfig.json |
|---|---|---|
| target | ES2023 | ES2017 |
| module / moduleResolution | nodenext / nodenext | esnext / bundler |
| strict | not set | true |
| strictNullChecks | true (set explicitly) | true (implied by strict) |
| noImplicitAny | false (explicit) | true (implied by strict) |
| strictBindCallApply | false (explicit) | true (implied by strict) |
| noFallthroughCasesInSwitch | false (explicit) | not set (default false) |
| path alias | none | "@/*": ["./src/*"] |
| decorators | emitDecoratorMetadata/experimentalDecorators true (Nest DI requirement) | not set |

backend/ (the newer codebase) explicitly opts out of noImplicitAny and strictBindCallApply rather than adopting TypeScript's strict: true; web/ (the older codebase) uses full strict: true. Combined with backend/eslint.config.mjs turning off @typescript-eslint/no-explicit-any (§2.2), backend/'s effective type-safety posture is the looser of the two, despite being the newer project.

Both subsystems use the same double-cast escape hatch, `as unknown as X`, for reshaping a type that doesn't match the value at hand, but at very different frequencies:

- backend/src: 3 occurrences, confined to one file — backend/src/modules/organizations/organizations.repository.ts, lines 113, 119, 144 — casting a DTO's role field to the Prisma Role enum (e.g. `(dto.role as unknown as Role) || Role.STAFF`).
- web/src: **11 occurrences across 8 files** (verified directly by grep; the draft this document was checked against had claimed 37 occurrences across 18 files — that count does not hold up against the working tree). The dominant pattern is casting better-auth's session.user (whose generated type lacks the app's custom fields) to a locally-defined or inline shape: web/src/lib/auth/session.ts casts to a shared `SessionUser` type at three call sites (inside requireSession, requireAdmin, and checkAuth — getSession and checkAdmin don't cast directly but sit either upstream or downstream of those three); web/src/app/(app)/layout.tsx, web/src/app/(app)/profile/page.tsx, web/src/app/(app)/customers/[id]/page.tsx, and web/src/app/(app)/loans/[id]/page.tsx each cast `session.user` inline to an ad-hoc `{ ... }` shape instead of reusing `SessionUser`; web/src/app/(app)/profile/actions.ts casts `session.user` to `{ id: string }` at two call sites. This is a structural workaround for better-auth's User type not knowing about the app's role/phone/isActive columns, repeated at most call sites rather than solved once via a typed session helper return type. The remaining 2 of the 11 occurrences are unrelated to auth: web/src/lib/db.ts's `globalThis as unknown as { prisma, pool }` (the standard Next.js dev-mode singleton pattern) and web/src/lib/supabase/server.ts's `tx as unknown as typeof prisma` inside `runWithTenantContext` — a function that, along with its sibling exports `createTenantSupabaseClient`/`createAdminSupabaseClient` in the same file, has zero call sites anywhere else in web/src (dead code).

Explicit `: any` type annotations are rare in both: grep for the literal pattern found 2 in backend/src (backend/src/database/supabase.service.ts's `params?: any[]`, on the same line as a `query<T = any>` default that isn't itself a `: any` match; and backend/src/modules/auth/guards/jwt-auth.guard.ts's `request: any` parameter) and 1 in web/src (web/src/lib/redux/api/baseApi.ts's `action?: (...args: any[]) => Promise<unknown>`, itself preceded by an `eslint-disable-next-line @typescript-eslint/no-explicit-any` comment acknowledging it). This grep pattern only matches the literal ": any" annotation form and is not exhaustive of every any-typed expression (e.g. any[] return positions, untyped catch bindings) — treat as a lower bound, not a full count.

## 4. Architecture Conventions

### 4.1 backend/ — NestJS layering

The controller → service → repository → Prisma/Supabase chain is the default but is not applied uniformly across all 8 modules:

- Full 3-layer pattern (controller + service + repository, each constructor-injecting the next): auth, customers, health, market-rates, organizations, webhooks (6 of 8 modules). Example: backend/src/modules/customers/customers.controller.ts calls CustomersService, which calls CustomersRepository, which calls PrismaService directly (backend/src/modules/customers/customers.repository.ts).
- storage (backend/src/modules/storage) has no repository.ts at all — StorageService calls SupabaseService directly (backend/src/modules/storage/storage.service.ts).
- cron (backend/src/modules/cron) has no service.ts, repository.ts, or dto/ of its own — CronController delegates directly to MarketRatesService, imported from a different module (backend/src/modules/cron/cron.controller.ts, backend/src/modules/cron/cron.module.ts). This is the only feature-to-feature module import in the whole graph; every other module either uses a @Global() module (ConfigModule, DatabaseModule, AuthModule — all three decorated @Global() in backend/src/config/config.module.ts, backend/src/database/database.module.ts, backend/src/modules/auth/auth.module.ts) or has no cross-feature dependency.

dto/ subfolders exist in 7 of 8 modules (all but cron). guards/ subfolders exist in 2 of 8 (auth, cron). decorators/ exists in 1 of 8 (auth only, holding CurrentUser and Roles — backend/src/modules/auth/decorators/).

Two independent database clients are globally provided from backend/src/database/database.module.ts (@Global(), no imports of its own): PrismaService (backend/src/database/prisma.service.ts, a bare `extends PrismaClient` with no datasource url or driver adapter configured anywhere in backend/) and SupabaseService (backend/src/database/supabase.service.ts, which builds both a Supabase-JS client and a separate raw pg.Pool from the configured database URL). Prisma is the dominant runtime ORM (customers, health, market-rates, organizations, webhooks all query through it); SupabaseService is used narrowly — raw SQL against the better-auth session/user tables plus JWT verification in auth (backend/src/modules/auth/auth.repository.ts), and Storage uploads in storage (backend/src/modules/storage/storage.service.ts).

Bootstrap order in backend/src/main.ts is fixed: setGlobalPrefix → global ValidationPipe → global exception filter → global logging interceptor → enableCors() (no arguments — wide open) → Swagger (registered via a separate `SwaggerModule.setup('docs', app, document)` call, literal path 'docs') → listen(). The exception filter and interceptor are instantiated with plain `new AllExceptionsFilter()` / `new LoggingInterceptor()` rather than registered as APP_FILTER/APP_INTERCEPTOR providers — neither currently needs injected dependencies, but neither can receive one without being refactored first. Whether the `/api` global prefix actually applies to the Swagger UI's own routes at runtime depends on @nestjs/swagger's internal handling of `setGlobalPrefix`, which is framework (node_modules) behavior this document does not inspect — Unknown from backend/src alone.

### 4.2 web/ — Next.js App Router layering

Three route tiers under one root layout (web/src/app/layout.tsx): public marketing pages at the app root (no auth), an (auth) route group for /login (no auth gate of its own), and an (app) route group where a single call to requireSession() in web/src/app/(app)/layout.tsx gates all child routes by redirecting unauthenticated/roleless/inactive users to /login.

Within (app), the dominant page-level pattern is a thin, non-async or async Server Component page.tsx that renders one colocated Client Component — conventionally named `<segment>-client.tsx` — which does the actual data-fetching via RTK Query hooks. Examples: web/src/app/(app)/dashboard/page.tsx → dashboard-client.tsx; web/src/app/(app)/customers/page.tsx → customers-list-client.tsx; web/src/app/(app)/loans/page.tsx → loans-list-client.tsx. Detail routes (customers/[id], loans/[id], profile) additionally do async data-prep (requireSession(), await params) before rendering their client component.

Mutations are colocated per route segment in a file literally named actions.ts, marked "use server" at the top (e.g. web/src/app/(app)/customers/new/actions.ts, web/src/app/(app)/followups/actions.ts). 14 such actions.ts files exist under web/src/app/(app). One exception to the per-segment convention: web/src/lib/actions/market-rates-actions.ts lives outside the app/ tree entirely, under lib/actions/, and exports getMarketRatesAction — which has zero call sites anywhere in web/src (dead code; web/src/lib/redux/api/marketRatesApi.ts's getMarketRates endpoint calls backend/ over HTTP instead, see below).

web/src/lib/ is layered by concern:
- services/ — Prisma-backed business logic, one file per domain (billing.ts, customers.ts, dashboard.ts, interest.ts, loans.ts, market-rates.ts, payments.ts, settings.ts, valuation.ts). These are the functions actions.ts files call into.
- validation/ — zod schemas (customer.ts, loan.ts, payment.ts).
- redux/ — store.ts, provider.tsx, and hooks.ts live directly here, alongside an api/ subfolder holding one RTK Query "slice" file per domain via api.injectEndpoints (customersApi.ts, dashboardApi.ts, followupsApi.ts, loansApi.ts, marketRatesApi.ts, organizationsApi.ts, profileApi.ts, reportsApi.ts, settingsApi.ts, staffApi.ts), all built on one shared api instance from web/src/lib/redux/api/baseApi.ts.
- auth/ — session.ts, the session-helper module (§16).

A structurally important, verified detail: web/src/lib/redux/api/baseApi.ts defines a hybrid base query that accepts either a `url` (routed through axiosClient to a real HTTP endpoint) or an `action` (a direct in-process call to an imported Server Action function, with no network hop). Individual endpoint files mix both in the same file — web/src/lib/redux/api/customersApi.ts calls the web/-local getCustomerDetailAction, createCustomerAction, etc. via the action path, but its searchCustomers endpoint uses the url path (`url: "/customers/search"`), which — per web/.env.example's NEXT_PUBLIC_API_URL (http://localhost:3001/api) and web/src/lib/axiosClient.ts's baseURL — actually reaches backend/'s NestJS API (backend/src/modules/customers/customers.controller.ts's `@Get('search')` handler). customersApi.ts is the only redux/api/*.ts file that mixes both call styles: web/src/lib/redux/api/organizationsApi.ts and marketRatesApi.ts use the url path exclusively (every endpoint in both files talks to backend/), while loansApi.ts, staffApi.ts, followupsApi.ts, dashboardApi.ts, profileApi.ts, settingsApi.ts, and reportsApi.ts use the action path exclusively (none of their endpoints have been migrated). This one file is the clearest concrete evidence in the codebase of the mid-migration state: most customer operations are still served by web/'s own Prisma-backed Server Actions, while exactly one (search) has been moved to backend/ — and that migration is markedly further along for the organizations and market-rates domains, which have moved entirely.

### 4.3 Known size/complexity outliers

The codebase has no enforced file-size limit, and a handful of files are outliers by a wide margin relative to their nearest structural siblings. These are current facts about the code, not proposals:

| File | Subsystem | Lines | Note |
|---|---|---|---|
| web/src/app/(app)/loans/new/page.tsx | web | 869 | Largest .tsx under web/src/app; fuses customer search, spot-rate sync, collateral-item CRUD, valuation, and submit handling in one component. Nearest sibling, web/src/app/(app)/customers/new/page.tsx, is 312 lines. |
| web/src/app/(app)/admin/staff/staff-client.tsx | web | 739 | Bundles 6 component definitions. EditStaffUserModal (lines 182-329) and EditModalContent (lines 608-739) are near-duplicate edit-staff forms whose DialogTitle copy has already drifted ("Edit Staff Details & Role" vs "Edit Staff Account & Permissions"); EditStaffUserModal has zero import sites elsewhere in the repo (dead code) — only EditModalContent, reached via StaffActionsMenu, is live. |
| web/src/components/document-uploader.tsx | web | 733 | Largest file under web/src/components; 10 useState hooks, at least 8 responsibilities (persistence, validation, upload, categorization, drag-and-drop, clipboard, removal, preview modal) in one component, reused from 4 call sites (web/src/app/(app)/loans/new/page.tsx ×2, customers/new/page.tsx, profile/profile-client.tsx). Its catch block references a bare `axios` identifier that is never imported (only axiosClient is) — a live ReferenceError risk if an upload actually fails. |
| web/src/lib/services/loans.ts | web | 525 | Largest file in web/src/lib/services (next largest, payments.ts, is 284). createLoan() (lines 98-230) interleaves quota enforcement, PAN/KYC threshold checks, valuation, LTV lookup, loan-number generation, and three separate tx.*.create calls. |
| web/src/app/(app)/loans/[id]/loan-actions-client.tsx | web | 562 | Exports 5 unrelated components (RecordPaymentModal, CloseLoanButton, ReleaseItemsButton, PawnTicketPrintButton, ItemPhotoPreview) in one file, despite a sibling file in the same folder (loan-crud-buttons.tsx) already demonstrating the one-component-per-file split. |
| web/src/app/(app)/dashboard/dashboard-client.tsx | web | 585 | Single function, DashboardClient, with no internal decomposition into per-section subcomponents. |
| backend/src/modules/market-rates/market-rates.service.ts | backend | 205 | Largest .service.ts in backend/; roughly 3x the next-largest (backend/src/modules/auth/auth.service.ts, 67 lines). Mixes env-default config, a DB-cached settings read path, and a three-provider external-fetch-with-fallback in one class. Parallels, and has not been consolidated with, web/src/lib/services/market-rates.ts (215 lines) — the same field set and 31.1034768 troy-ounce conversion constant exist in both subsystems independently. |

No backend/ module other than market-rates.service.ts is a size outlier relative to its siblings (every other consecutive size gap among backend/*.service.ts files is under 2x — verified across all 9 *.service.ts files in backend/src, from prisma.service.ts at 24 lines up to market-rates.service.ts at 205).

## 5. Folder Conventions

backend/src:

```
app.module.ts
main.ts
common/{filters, interceptors}/
config/{config.module.ts, configuration.ts}
database/{database.module.ts, prisma.service.ts, supabase.service.ts}
modules/<name>/
  <name>.module.ts
  <name>.controller.ts
  <name>.service.ts
  <name>.repository.ts        (present in 6 of 8 modules)
  dto/                          (present in 7 of 8 modules)
  guards/                       (auth, cron only)
  decorators/                   (auth only)
```

web/src:

```
app/
  layout.tsx                          (root)
  page.tsx, docs/, open-source/, pricing/, privacy/, terms/    (public marketing)
  (auth)/login/                       (unauthenticated)
  (app)/<segment>/
    page.tsx                          (Server Component, thin)
    <segment>-client.tsx              (Client Component, does the work)
    actions.ts                        ("use server" mutations)
    loading.tsx                       (Suspense fallback; present on 5 of 14 segments)
    layout.tsx                        (metadata-only passthrough; customers/new, loans/new only)
  api/auth/[...all]/route.ts          (better-auth Route Handler)
components/
  ui/            (9 files — domain-agnostic design-system primitives)
  marketing/     (6 files — public-site-only components)
  <flat files>   (6 files — authenticated-app shell/widgets: sidebar, page-header, theme-provider, dashboard-charts, document-uploader, live-market-ticker)
lib/
  services/      (Prisma business logic, one file per domain)
  validation/    (zod schemas)
  redux/         (store.ts, provider.tsx, hooks.ts, plus an api/ subfolder of RTK Query endpoint files)
  auth/          (session.ts)
  config/        (jurisdictions.ts, asset-categories.ts)
  actions/       (market-rates-actions.ts — dead code, see §4.2)
  db.ts, debug.ts, serialize.ts, utils.ts, axiosClient.ts, auth.ts, auth-client.ts, supabase-storage.ts, supabase/
__tests__/       (flat, no subdirectories, 7 files)
```

Test placement differs by subsystem: web/'s tests live in a dedicated web/src/__tests__/ folder, decoupled from the modules under test; backend/'s (currently nonexistent) unit tests are configured to live beside their source, matched by the pattern *.spec.ts anywhere under backend/src (backend/package.json's embedded jest.testRegex), with the one existing test at backend/test/app.e2e-spec.ts kept in a separate top-level test/ directory reserved for e2e specs (backend/test/jest-e2e.json's testRegex, .e2e-spec.ts$).

## 6. Naming Conventions

### 6.1 Files

- backend/: kebab-case with a role suffix matching the file's Nest artifact type — customers.controller.ts, customers.service.ts, customers.repository.ts, customers.module.ts, customer-search-query.dto.ts, jwt-auth.guard.ts, current-user.decorator.ts. This is fully consistent across all 8 modules.
- web/: mostly kebab-case, but with real inconsistencies:
  - web/src/components/* (all three subfolders) — kebab-case throughout (dashboard-charts.tsx, document-uploader.tsx, alert-dialog.tsx).
  - web/src/lib/redux/api/*.ts — camelCase throughout (baseApi.ts, customersApi.ts, marketRatesApi.ts).
  - web/src/lib/services/*.ts — mostly single lowercase words (billing.ts, customers.ts, valuation.ts) but one kebab-case file (market-rates.ts) in the same folder.
  - web/src/lib root — mixed: axiosClient.ts (camelCase) sits beside auth-client.ts and supabase-storage.ts (kebab-case) in the same directory.
  - web/src/app/(app)/admin/settings/ contains both settings-client.tsx (495 lines, exports a component named SettingsForm) and settings-page-client.tsx (28 lines, exports SettingsPageClient, and is the file that actually fills the `<segment>-client.tsx` role for page.tsx). The file name settings-client.tsx does not match its exported symbol name, and the "-client" suffix appears on two different files in the same folder for two different structural roles — a genuine naming ambiguity, confirmed by reading web/src/app/(app)/admin/settings/page.tsx (imports SettingsPageClient from ./settings-page-client), web/src/app/(app)/admin/settings/settings-page-client.tsx (imports SettingsForm from ./settings-client), and settings-client.tsx itself.

### 6.2 Symbols

- Classes (backend/): PascalCase, suffixed by role — CustomersController, CustomersService, CustomersRepository, JwtAuthGuard, RolesGuard, CustomerSummaryDto. Fully consistent.
- Components (web/): PascalCase function names — CustomerCrudButtons, DashboardClient, SettingsPageClient — regardless of the file's own casing.
- Functions/variables: camelCase in both subsystems — searchCustomers, createLoanNumber, deriveLoanDisplayStatus, computeAccruedInterest.
- Interfaces/types: PascalCase in both — CreateLoanInput, LoanFilters, AuthUserDto, PaymentAllocation.
- Decorator factories (backend/): PascalCase even though they're called like functions — CurrentUser, Roles (backend/src/modules/auth/decorators/).

### 6.3 Database (Prisma schema, shared byte-for-byte between backend/prisma/schema.prisma and web/prisma/schema.prisma — verified with a direct diff, zero differences)

- Fields: camelCase throughout (fullName, organizationId, principalOutstanding).
- Models: PascalCase for all domain models (Organization, Branch, LoanPolicy, DocumentType, Customer, KycDocument, Loan, LoanItem, LoanCharge, Payment, LedgerEntry, FollowUp, AppSetting) — except the four better-auth tables, which are lowercase: model user, model session, model account, model verification (web/prisma/schema.prisma lines 164, 197, 209, 226). This is not a regression introduced during the backend/ extraction — the pre-restructure blueprint at .agents/schema.md already shows `users user[]` in lowercase in its Organization sketch, meaning the lowercase convention for better-auth's own tables predates the current split and reflects better-auth's expected table-naming convention, not accidental drift. It remains a real naming inconsistency relative to every other model in the schema, and every consumer that references the user model must remember the exception (e.g. backend/src/modules/organizations/organizations.repository.ts's `this.prisma.user.findMany(...)`, lowercase, beside `this.prisma.loanPolicy...`, PascalCase-derived camelCase accessor).
- Enum members: SCREAMING_SNAKE_CASE (PLATFORM_OPERATOR, TROY_OUNCE, MILLESIMAL_FINENESS, ACTUAL_365).

## 7. React Conventions (web/ only — backend/ has no UI layer)

- Server Components are the default; "use client" is added only where a file needs hooks, event handlers, or browser APIs. 8 of the 21 files under web/src/components carry no "use client" directive: page-header.tsx (the one flat-file exception), 2 of the 6 marketing/ files (features-section.tsx, footer.tsx), and 5 of the 9 ui/ files (button.tsx, input.tsx, label.tsx, select.tsx, textarea.tsx). One exception looks like a mistake in the other direction: web/src/components/marketing/landing-hero.tsx is marked "use client" despite containing no hooks or event handlers — pure static JSX — while its equally-static siblings (features-section.tsx, footer.tsx) correctly omit the directive. Note that most of marketing/ (4 of its 6 files) does carry "use client", so landing-hero.tsx is the odd one out within its own folder, not evidence of a broader marketing/ pattern.
- Auth gating is centralized once per route tier, not per-page: web/src/app/(app)/layout.tsx's single requireSession() call is the only mandatory gate for all 14 (app) routes (§4.2, §16 for the ADMIN-specific exceptions).
- Data fetching in Client Components goes through RTK Query hooks (useGetXQuery, useXMutation), not useEffect + fetch/axios directly. The one deliberate exception is a genuine polling interval — web/src/components/live-market-ticker.tsx sets `pollingInterval: 15 * 60 * 1000` on its useGetMarketRatesQuery call; grep across web/src found this to be the only pollingInterval configuration in the codebase (in particular, web/src/app/(app)/loans/new/page.tsx's own useGetMarketRatesQuery call at line 139 takes no arguments and does not poll, despite superficially similar-looking spot-rate UI).
- Design-system primitives (web/src/components/ui/) are built on class-variance-authority for variant styling (button.tsx) and @radix-ui/react-dialog for the two modal primitives (dialog.tsx, alert-dialog.tsx — alert-dialog.tsx is a styled wrapper over the plain Dialog primitive, not a dedicated @radix-ui/react-alert-dialog package, which is not a dependency). input.tsx, label.tsx, select.tsx, and textarea.tsx are thin forwardRef wrappers over native elements with no added props beyond the native HTML attribute types — select.tsx deliberately wraps the native <select> rather than a Radix Select primitive (no such dependency exists in web/package.json).
- Four Radix packages are declared in web/package.json but have zero import sites anywhere in web/src: @radix-ui/react-slot, @radix-ui/react-dropdown-menu, @radix-ui/react-tabs, @radix-ui/react-tooltip. Relatedly, ui/button.tsx declares an asChild?: boolean prop (the shadcn/ui convention for polymorphic rendering via Radix's Slot) that is never read or acted on in the component body — it is spread onto the native <button> element unused.
- Memoization is essentially not a codebase convention: useMemo, useCallback, and React.memo together appear exactly once across the whole of web/src (web/src/components/document-uploader.tsx). Components re-render freely rather than being wrapped defensively.
- Styling is Tailwind utility classes plus CSS custom properties resolved through a runtime class toggle, not Tailwind's dark: variant: web/src/components/theme-provider.tsx toggles a "light"/"dark" class on document.documentElement, and component styles reference var(--bg-card), var(--text-primary), etc. (defined in web/src/app/globals.css), consistently across both ui/ primitives and feature components.
- Client-server result handling: mutation results from RTK Query are checked with the `"error" in res` idiom rather than try/catch, e.g. web/src/app/(app)/customers/[id]/customer-crud-buttons.tsx's handleUpdate/handleDelete.

## 8. NestJS Conventions (backend/ only)

- Dependency injection is exclusively constructor-based, with the `private readonly` parameter-property shorthand — no property injection or factory providers were found in any module.
- Guards are applied per-controller or per-method via @UseGuards(...), never globally (no APP_GUARD provider exists anywhere in backend/src). Confirmed guard placement, read directly from source:
  - @UseGuards(JwtAuthGuard) at the controller level: CustomersController (backend/src/modules/customers/customers.controller.ts), StorageController (backend/src/modules/storage/storage.controller.ts).
  - @UseGuards(JwtAuthGuard) at the method level only: AuthController's getCurrentUser and getSession endpoints (backend/src/modules/auth/auth.controller.ts) — the controller class itself carries no guard, so a hypothetical future endpoint added to this controller would be unguarded by default unless it remembers to add the decorator itself.
  - @UseGuards(RolesGuard) at the controller level, combined with per-method @Roles(...): OrganizationsController (backend/src/modules/organizations/organizations.controller.ts) — its GET endpoints (getPolicy, getMembers) carry no @Roles(), so RolesGuard's own logic (`if (!requiredRoles || requiredRoles.length === 0) return true;`, backend/src/modules/auth/guards/roles.guard.ts) lets any authenticated user read them, while PUT/POST/PATCH/DELETE require OWNER or ADMIN.
  - @UseGuards(CronAuthGuard) at the controller level: CronController (backend/src/modules/cron/cron.controller.ts) — and CronAuthGuard itself fails open (`if (!cronSecret) { return true; }`, backend/src/modules/cron/guards/cron-auth.guard.ts) when CRON_SECRET is unset.
  - No guard at all: HealthController, MarketRatesController (backend/src/modules/market-rates/market-rates.controller.ts — confirmed directly, zero decorators beyond Swagger), WebhooksController (backend/src/modules/webhooks/webhooks.controller.ts — confirmed directly, zero decorators beyond Swagger).
- Swagger documentation is real and hand-written, not inferred: every controller uses @ApiTags/@ApiOperation/@ApiResponse and every DTO uses @ApiProperty/@ApiPropertyOptional (e.g. backend/src/modules/customers/dto/customer-summary.dto.ts). backend/nest-cli.json has no compilerOptions.plugins entry, so none of this is auto-generated from TypeScript types.
- Response-only DTOs (documenting an outgoing shape, not validating an incoming one) correctly carry only @ApiProperty with no class-validator decorators — e.g. backend/src/modules/health/dto/health-response.dto.ts, backend/src/modules/customers/dto/customer-summary.dto.ts. This is the expected, non-buggy pattern, since Nest's ValidationPipe only runs against incoming request bodies/params/queries.
- Configuration is split across two uncoordinated mechanisms. backend/src/config/configuration.ts (loaded via backend/src/config/config.module.ts's ConfigModule.forRoot, envFilePath: ['.env', '../web/.env']) models only env, port, apiPrefix, database.url, and supabase.{url,anonKey,serviceRoleKey}. Everything else reads process.env directly inside feature code, bypassing ConfigService entirely: DODO_PAYMENTS_API_KEY, DODO_PAYMENTS_WEBHOOK_KEY, DODO_PAYMENTS_ENVIRONMENT (backend/src/modules/webhooks/webhooks.service.ts), CRON_SECRET (backend/src/modules/cron/guards/cron-auth.guard.ts), and all of DEFAULT_GOLD_RATE_PER_GRAM, DEFAULT_SILVER_RATE_PER_GRAM, VALUATION_SAFETY_MARGIN_PERCENT, LTV_TIER1..3_PERCENT, LTV_TIER1..2_MAX, DEFAULT_INTEREST_MONTHLY, DEFAULT_GRACE_DAYS, PAN_THRESHOLD (backend/src/modules/market-rates/market-rates.service.ts). No validation schema (Joi, class-validator-based env validation) exists anywhere under backend/src/config — a missing required env var silently resolves to an empty string or a hardcoded fallback rather than failing startup.

## 9. Testing Conventions

web/ uses Vitest (web/vitest.config.ts: environment "node", vite-tsconfig-paths plugin, no coverage thresholds, no custom include/exclude). All 7 test files live flat under web/src/__tests__/ with describe/it/expect explicitly imported from "vitest" (not relied on as globals) — e.g. web/src/__tests__/waterfall.test.ts line 1. describe blocks are annotated with section markers, but the markers trace back to two different, non-.agents/ sources, not to a single shared numbering scheme:
  - §Phase N markers (§Phase 4 in billing.test.ts, §Phase 5 in rls-isolation.test.ts and jurisdiction.test.ts ×2) do trace back to the "Phase N" headings in .agents/tasks.md.
  - §6.N markers (§6.1/§6.2 in valuation.test.ts, §6.3 in interest.test.ts, §6.4 in waterfall.test.ts) trace back instead to root-level ARCHITECTURE.md's section 3, "Financial Mathematics & Core Business Rules" — itself internally tagged "(§6)" — whose four subsections are literally titled §6.1 Item Valuation Algorithm, §6.2 RBI-Compliant Tiered LTV Framework, §6.3 On-Read Actual/365 Interest Formula, and §6.4 Atomic Repayment Waterfall Allocation. ARCHITECTURE.md is a root-level doc, not one of the five .agents/ files.
  - Source (non-test) comments go one step further than either document: web/src/lib/services/loans.ts cites both "Non-Negotiable #5" and "(§6.5)" (for loan closure), but ARCHITECTURE.md's §6 numbering stops at §6.4 and CONTRIBUTING.md's four-item "Non-Negotiable Core Engineering Principles" list stops at #4 — so §6.5 and Non-Negotiable #5 are code-internal references with no corresponding section in any current repository document.

Test fidelity in web/ varies considerably by file:
- billing.test.ts, interest.test.ts, valuation.test.ts directly import and exercise the named production functions from web/src/lib/services/billing.ts, interest.ts, valuation.ts.
- jurisdiction.test.ts and universal-assets.test.ts are misleadingly named relative to their content: jurisdiction.test.ts actually tests valuation.ts's unit conversions and interest.ts's day-count branching, never importing web/src/lib/config/jurisdictions.ts; universal-assets.test.ts is the file that actually tests jurisdictions.ts and asset-categories.ts.
- waterfall.test.ts does not import web/src/lib/services/payments.ts at all — it defines its own local, standalone copy of the waterfall algorithm (function computePaymentWaterfall, declared inline in the test file with a comment acknowledging this: "Recreate pure waterfall logic to test standalone atomic allocation rules") and tests that copy. The real recordPayment/previewPaymentAllocation in web/src/lib/services/payments.ts have zero direct test coverage.
- rls-isolation.test.ts imports only describe/it/expect from vitest — no Prisma, no Supabase, no application code — and asserts that Array.prototype.filter/find behave correctly against a literal in-memory array. It exercises none of the real RLS policies at backend/sql/rls_policies.sql.

backend/ uses Jest twice: an embedded unit-test config in backend/package.json (testRegex: ".*\\.spec\\.ts$", rootDir "src", ts-jest transform) that would discover any *.spec.ts file anywhere under backend/src, and a separate e2e config at backend/test/jest-e2e.json (testRegex: ".e2e-spec.ts$"). Zero *.spec.ts files exist anywhere under backend/src — running npm test in backend/ reports no tests found. The only backend test that runs at all is backend/test/app.e2e-spec.ts, the unmodified Nest CLI scaffold: it boots the full AppModule and asserts GET / returns "Hello World!" — a route that does not exist in any of the 8 real modules (there is no app.controller.ts; the closest real endpoint, GET /health, is never called by this test).

Net: neither subsystem has meaningful automated coverage of its money-handling logic in the sense of exercising the actual production code path end-to-end against a database.

## 10. Error Handling Conventions

backend/: the dominant pattern is `throw new HttpException({ error: '...' }, HttpStatus.X)` — a plain object payload under an `error` key — used consistently in customers.service.ts, storage.service.ts, webhooks.service.ts, market-rates.controller.ts, and both auth guards. This is not fully uniform: backend/src/modules/organizations/organizations.service.ts instead throws Nest's built-in NotFoundException (`throw new NotFoundException(...)`) for its two not-found cases, which produces a differently-shaped body than the rest of the codebase's hand-built `{ error: ... }` envelope. Everything funnels through one @Catch()-all filter, backend/src/common/filters/http-exception.filter.ts, which normalizes the final HTTP response to `{ statusCode, timestamp, path, error }` regardless of which exception type was thrown, and logs via Logger.error with the exception's stack trace when available.

web/: two distinct conventions depending on layer.
- Server Actions never throw to the caller. They catch internally and return a discriminated union, `{ success: false, error: string }` or `{ success: true, ...data }` — e.g. web/src/app/(app)/customers/new/actions.ts's createCustomerAction, web/src/app/(app)/onboarding/actions.ts's saveLoanPolicyAction. RTK Query's baseApi.ts (web/src/lib/redux/api/baseApi.ts) has a dedicated isActionError() type guard specifically to detect this shape and convert it into RTK Query's own `{ error }` result.
- Services (web/src/lib/services/*.ts) throw plain `new Error("human-readable message")` for business-rule violations — e.g. web/src/lib/services/payments.ts's recordPayment throws "Payment amount must be positive" and the overpayment-rejection message; web/src/lib/services/loans.ts's closeLoan throws "Cannot close loan: unsettled charges remain". These are caught one layer up, in the calling actions.ts's try/catch, and converted into the `{ success: false, error: err.message }` shape.
- Server Components / session helpers (requireSession, requireAdmin in web/src/lib/auth/session.ts) use Next.js's redirect() rather than throwing — an auth failure produces a navigation, not an error boundary.

## 11. Logging Conventions

backend/: NestJS's built-in Logger, instantiated as `private readonly logger = new Logger(ClassName.name)`. Adoption is partial, not universal: 27 files declare @Injectable() or @Controller(). Of those 27, 13 (48%) instantiate a Logger — e.g. CustomersService, AuthService, JwtAuthGuard, PrismaService, SupabaseService, CronAuthGuard all do; CustomersController, OrganizationsService, OrganizationsController, WebhooksController do not. (A plain grep for "new Logger(" turns up 15 files, but 2 of those — main.ts and http-exception.filter.ts — are not @Injectable()/@Controller() classes at all: main.ts is the bootstrap function and http-exception.filter.ts is decorated with @Catch(), so they fall outside the 27-file denominator; the correct adoption figure among @Injectable()/@Controller() classes is 13 of 27, not 15 of 27.) The global LoggingInterceptor (backend/src/common/interceptors/logging.interceptor.ts) logs only successful requests — its rxjs `.pipe(tap(() => {...}))` callback takes a single argument, which RxJS treats purely as the success handler, so it never runs on the error channel; a failed request is logged only by AllExceptionsFilter's separate logger.error call, in a different format with no duration measurement. There is no single unified access-log line covering both outcomes.

web/: no logging library. console.error appears in 17 files, exclusively inside actions.ts / service catch blocks as an ad hoc "log then return a friendly error" step — e.g. web/src/app/(app)/customers/new/actions.ts's `console.error("Failed to create customer:", err)`. console.log appears in exactly one file, web/src/lib/debug.ts, which wraps it behind a `debugLog(scope, message, data?)` helper gated on `process.env.DEBUG === "true" || process.env.DEBUG === "1"` — a no-op by default, used for verbose business-logic tracing throughout web/src/lib/services/ (interest accrual, payment allocation, loan creation) and nowhere else raw.

## 12. Comment Conventions

Comment density differs sharply between the two subsystems — not a subjective impression, but a measured ~13x gap. Counting lines that open or continue a comment (// ..., /** , or a JSDoc continuation *) against total line count:

- backend/src: 2,023 total lines, exactly 3 comment lines (~0.15%). The only comments found anywhere in backend/src are three single-line "why" notes inside the external-fetch fallback chain in backend/src/modules/market-rates/market-rates.service.ts (// Primary Market API: GoldPrice Live Spot, // Secondary Market API: OpenER Exchange Rate + GoldAPI Spot, // Offline Cache Fallback from Database). Every other backend/ file read for this document — controllers, services, repositories, guards, DTOs, filters, interceptors — has zero comments.
- web/src: 18,271 total lines, 370 comment lines (~2%).

Where web/ does comment, it is concentrated in web/src/lib/services/ and web/src/lib/db.ts, and is consistently "why", not "what": JSDoc-style file-header blocks citing the same §-numbered and Non-Negotiable-numbered markers used in test describe blocks and traced in §9 above (§6.1 through §6.5, Non-Negotiable #2 and #5 — note §6.5 and #5 have no corresponding section in ARCHITECTURE.md or CONTRIBUTING.md, per §9), e.g. web/src/lib/services/payments.ts's header explaining the waterfall order and that "a partially-applied payment is a data-integrity incident, not a bug" (citing Non-Negotiable #2, which does correspond to CONTRIBUTING.md's "Atomic Waterfall Transactions" principle); web/src/lib/db.ts's comment on runSerializable explaining exactly why Serializable isolation plus retry is needed for concurrent loan writes; web/src/lib/services/loans.ts's inline comment on why getLoans() paginates ACTIVE/OVERDUE filters in memory rather than in the database query. Feature components and Redux/API files are commented far more sparingly than services.

## 13. Import Conventions

backend/ uses only relative imports — there is no path alias in backend/tsconfig.json (no "paths" key present at all). Cross-directory references look like `from '../../database/prisma.service'` or `from '../auth/guards/jwt-auth.guard'` (e.g. backend/src/modules/customers/customers.repository.ts, backend/src/modules/customers/customers.controller.ts). Depth is bounded by the module/dto/guards folder structure (§5), so paths rarely exceed two ../ segments.

web/ uses the `@/*` → `./src/*` alias configured in web/tsconfig.json's compilerOptions.paths, applied pervasively — `@/lib/auth/session`, `@/components/ui/dialog`, `@/lib/db` (e.g. web/src/app/(app)/customers/new/actions.ts, web/src/app/(app)/customers/[id]/customer-crud-buttons.tsx). Relative imports (./x) are used only for same-folder colocated files, such as a page.tsx importing its own `<segment>-client.tsx`.

## 14. Async Code Conventions

async/await is the default in both subsystems; `.then()` chains are effectively absent — grep found exactly two occurrences in the entire codebase, both in the same file, web/src/app/(app)/loans/new/page.tsx (lines 68 and 87, each chained off `.unwrap()` on an RTK Query mutation trigger), versus zero in all of backend/src.

Independent, unrelated reads are batched with Promise.all rather than awaited sequentially: 8 occurrences across 6 files in web/ (web/src/lib/services/loans.ts ×2, market-rates.ts ×2, customers.ts ×1, dashboard.ts ×1, web/src/app/(app)/dashboard/actions.ts ×1, and web/src/app/(app)/followups/actions.ts ×1) and 2 occurrences in 1 file in backend/ (backend/src/modules/market-rates/market-rates.service.ts's fetchAndSaveLiveMetalRates, fetching FX + gold + silver rates concurrently, plus a second Promise.all for the three-setting DB write). Example: web/src/lib/services/loans.ts's getLoanById fetches items, payments, charges, transactions, and followUps concurrently via one Promise.all.

Financial writes are wrapped in explicit transactions, with web/ going further than backend/ on isolation guarantees:
- web/src/lib/db.ts exports runSerializable(fn, maxAttempts = 3), which runs the callback inside `prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })` and retries on a Postgres serialization-failure error code (P2034) up to maxAttempts times. This wraps both loan creation (web/src/lib/services/loans.ts's createLoan) and payment recording (web/src/lib/services/payments.ts's recordPayment).
- Loan closure and item release (web/src/lib/services/loans.ts's closeLoan, releaseItems) use a plain `prisma.$transaction(async (tx) => {...})` without the Serializable override.
- backend/ has no equivalent transaction wrapper; the modules that exist do not yet perform multi-step financial writes requiring one (organizations.repository.ts's upsertOrganizationPolicy is a single upsert call, not a multi-step transaction).

backend/eslint.config.mjs downgrades @typescript-eslint/no-floating-promises from its typescript-eslint recommendedTypeChecked default to 'warn' (§2.2) — an un-awaited promise in backend/ is a lint warning, not a failure that blocks npm run lint's exit code in the same way an 'error'-level rule would.

## 15. Validation Conventions

backend/ validates incoming request data with class-validator decorators on DTOs, enforced globally by the ValidationPipe registered in backend/src/main.ts: `new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })`. This is a real, functioning mechanism — e.g. backend/src/modules/customers/dto/customer-search-query.dto.ts's `@IsOptional() @IsString() q?: string`, backend/src/modules/organizations/dto/team-member.dto.ts's `@IsEmail() @IsNotEmpty() email: string` and `@IsEnum(TeamRole) role: TeamRole` — but coverage is inconsistent across DTOs, not applied uniformly.

web/ validates Server Action input with zod schemas under web/src/lib/validation/ (customer.ts, loan.ts, payment.ts), called via `schema.safeParse(formData)` and checked with `.success` before touching Prisma — e.g. web/src/app/(app)/customers/new/actions.ts's createCustomerAction calling customerCreateSchema.safeParse(formData). This pattern is well-established but, like backend/'s DTOs, is not applied to every action that mutates data — validation is the single most inconsistently-applied convention found in either subsystem: present reliably on create paths, frequently absent on update/settings/policy paths.

Confirmed gaps (independently verified by direct file reads for this document, not merely cited from prior research):

| File | Subsystem | Gap | Priority |
|---|---|---|---|
| backend/src/modules/webhooks/webhooks.controller.ts, webhooks.service.ts | backend | RESOLVED 2026-07-11 — historical finding: the old `stripe-webhook-payload.dto.ts` carried only @ApiPropertyOptional, zero class-validator decorators; the route had no guard; the handler only checked that STRIPE_WEBHOOK_SECRET was set as a string — no Stripe signature verification existed anywhere in backend/src. Fix: the webhook was migrated from Stripe to Dodo Payments — the DTO was deleted, the endpoint now binds `@Req() req: RawBodyRequest<Request>` and verifies `req.rawBody` via the `dodopayments` SDK's `client.webhooks.unwrap()` (real HMAC-SHA256 signature check) before trusting any field, rejecting with 401 on an invalid/missing signature — verified working via a live curl POST. | P0 (RESOLVED) |
| web/src/app/(app)/admin/staff/actions.ts | web | createStaffUserAction casts formData via `as` and only null-checks name/email/password (no email format, no password strength — the UI's own default password value is the literal string "password123"). updateStaffUserAction writes role directly to prisma.user.update with zero validation; the Role enum has 5 members (PLATFORM_OPERATOR, OWNER, ADMIN, BRANCH_MANAGER, STAFF — web/prisma/schema.prisma lines 14-20), so this is a real privilege-escalation surface, not just malformed-string risk. | P0 |
| web/src/app/(app)/customers/[id]/actions.ts | web | updateCustomerDetailsAction writes fullName/phone/email/address fields with only `.trim()` — no schema validation — even though the identical fields are validated by customerCreateSchema (web/src/lib/validation/customer.ts) at creation time in web/src/app/(app)/customers/new/actions.ts. | P1 |
| web/src/app/(app)/admin/settings/actions.ts, web/src/lib/services/settings.ts | web | saveSettingsAction validates only 2 of 11 settings keys (interest rate, grace days); the other 9 (LTV tiers, PAN threshold, gold/silver rate per gram, safety margin) reach updateSetting(), a bare Prisma upsert with no validation of any kind. These same keys are read back by backend/'s market-rates module (backend/src/modules/market-rates/market-rates.repository.ts, same AppSetting table), so an unvalidated write in web/ silently corrupts a value backend/ later re-serves. | P1 |
| backend/src/modules/organizations/dto/organization-policy.dto.ts | backend | Every numeric scalar field on UpdateOrganizationPolicyDto has at least @IsNumber()+@Min(); only 4 of the 9 (safetyMarginPercent, ltvTier1Percent, ltvTier2Percent, ltvTier3Percent) also have an @Max() upper bound — gracePeriodDays, panThreshold, defaultInterestMonthly, ltvTier1Max, and ltvTier2Max have none. ltvTiers itself has only @IsOptional() @IsArray() — no @ValidateNested({ each: true }) + @Type(), so a malformed array element (e.g. `{ maxValue: "abc", ltvPercent: 9999 }`) passes the global ValidationPipe untouched and is written straight into the org's live loan policy via organizations.repository.ts's upsertOrganizationPolicy. | P1 |
| web/src/app/(app)/onboarding/actions.ts | web | saveLoanPolicyAction has no auth check at all — confirmed directly by reading the full file: it imports only prisma and Prisma enums, with no import from @/lib/auth/session, unlike every other actions.ts file under web/src/app. It also takes ltvTiers/gracePeriodDays/mandatoryIdThreshold with zero schema validation before the prisma.loanPolicy.upsert call. | P1 |
| web/src/app/(app)/followups/actions.ts | web | createFollowUpAction only checks `if (!note.trim())`; dueDateStr flows unvalidated into `new Date(dueDateStr)` (JavaScript silently produces an Invalid Date rather than throwing on bad input). | P2 |
| web/src/app/(app)/profile/actions.ts | web | updateProfileAvatarAction writes a raw string straight to prisma.user.update({ data: { image: avatarUrl } }) with no url-format check, unlike its sibling updateProfileNameAction, which does inline-validate length. | P2 |
| backend/src/modules/storage/storage.controller.ts | backend | uploadFile takes bucket via `@Body('bucket') bucket?: string` — a bare field extraction bypassing DTO-based validation entirely; no allowlist constrains which bucket name an authenticated caller can target. | P2 |
| web/src/app/(app)/platform-admin/actions.ts, web/src/lib/services/billing.ts | web | changeOrganizationPlanAction accepts newPlan: string | null with no enum check; getPlanConfig's fallback (`PLAN_QUOTAS[key] || PLAN_QUOTAS.self_hosted`) treats any unrecognized string as the unlimited self-hosted tier — the least safe fallback, not the safest. | P3 |

Priorities above are carried over from prior audit work and were spot-checked against source directly while writing this document (e.g. onboarding/actions.ts's missing auth import and admin/settings/actions.ts's checkAdmin() call were both independently re-confirmed by reading the files, not merely cited).

## 16. Security Conventions

backend/ authenticates via two guard classes, not a locally-signed JWT: JwtAuthGuard (backend/src/modules/auth/guards/jwt-auth.guard.ts) extracts a bearer token or a better-auth.session_token cookie, then calls AuthService.validateToken, which checks the better-auth session table first (raw SQL via AuthRepository.findSessionByToken) and falls back to Supabase JWT verification (verifySupabaseJwtUser). JWT_SECRET is declared in backend/.env.example but has zero references anywhere in backend/src — it is vestigial. RolesGuard (backend/src/modules/auth/guards/roles.guard.ts) reads @Roles(...) metadata via Reflector and compares against request.user.role. Guard placement is per-controller/per-method, not global (§8) — CORS is wide open (`app.enableCors()` with no arguments, backend/src/main.ts, and no CORS_ORIGIN env var read anywhere in backend/src).

web/ has two parallel families of session helpers in web/src/lib/auth/session.ts, and uses them inconsistently:
- Throwing/redirecting, for Server Components: getSession, requireSession, requireAdmin.
- Non-throwing, for Server Actions: checkAuth, checkAdmin (return a `{ authenticated, ... }` discriminated union instead of redirecting).

requireAdmin is defined but has zero call sites anywhere else in web/src (confirmed by grep — only its own definition matches). Both ADMIN-gated pages that exist — web/src/app/(app)/admin/settings/page.tsx and web/src/app/(app)/admin/staff/page.tsx — hand-roll the identical check instead: `const auth = await checkAuth(); if (!auth.authenticated || auth.user?.role !== "ADMIN") redirect("/dashboard");` (confirmed by reading both files directly). This duplicates, rather than calls, the purpose-built helper, and redirects to a different location (/dashboard) than requireAdmin would (/login?error=unauthorized_admin) had it been used.

This same duplication recurs inside the Server Actions for these two features, not just at the page level: within web/src/app/(app)/admin/settings/actions.ts, only getSettingsAction calls checkAdmin(); the other two exported actions in that file, saveSettingsAction and fetchLiveSpotRatesAction, hand-roll `const adminAuth = await checkAuth(); if (!adminAuth.authenticated || adminAuth.user?.role !== "ADMIN")` instead. The same split exists in web/src/app/(app)/admin/staff/actions.ts: only getStaffListAction calls checkAdmin(); createStaffUserAction, updateStaffStatusAction, updateStaffUserAction, and deleteStaffUserAction all hand-roll the identical checkAuth()-plus-manual-role-check pattern (6 hand-rolled occurrences across the two files combined, confirmed directly). So checkAdmin() is consistently used for read/list actions but consistently bypassed — in favor of duplicating its logic inline — for every mutating action checked, in the very same files that also import it correctly.

web/src/app/(app)/platform-admin/page.tsx goes further: it calls checkAuth() and assigns the result to a variable that is never read again — any authenticated, active, role-bearing user (not just ADMIN) can reach the platform-wide organization/billing table this page renders.

Row-Level Security exists at the database layer (backend/sql/rls_policies.sql enables RLS and defines policies on Organization, Branch, LoanPolicy, DocumentType, Customer, KycDocument, Loan, LoanItem, LoanCharge, Payment, LedgerEntry, FollowUp, gated by a current_user_organization_id() function reading the app.current_organization_id session variable), but nothing in backend/src/database (PrismaService or SupabaseService) ever sets that session variable, and both are single shared/admin-style connections rather than per-request, per-tenant clients. (Separately, web/src/lib/supabase/server.ts does define a runWithTenantContext helper that sets this same session variable via `set_config('app.current_organization_id', ...)` inside a transaction — but that helper, and its siblings createTenantSupabaseClient/createAdminSupabaseClient in the same file, have zero call sites anywhere else in web/src, so it does not currently affect whether RLS is enforced in practice either.) Whether RLS is independently enforced therefore depends entirely on which Postgres role DATABASE_URL connects as — Unknown from source alone, not executed for this document. Concretely, backend/src/modules/customers/customers.repository.ts's searchCustomers query has no organizationId filter at any application layer, unlike backend/src/modules/organizations/organizations.repository.ts's equivalent queries, which are explicitly filtered by organizationId.

See §15 for the validation-adjacent security findings (the billing webhook's now-resolved signature check — migrated from Stripe to Dodo Payments, see the §15 table — the staff role-escalation gap, and the storage bucket allowlist gap) — they are not repeated here.

## 17. Performance Conventions

- Concurrent independent reads are batched with Promise.all rather than sequential awaits (§14) — the one explicit, consistently-applied performance convention found in either subsystem.
- Financial write paths accept a real cost (retryable Serializable transactions, §14) in exchange for correctness under concurrent access — a deliberate trade-off documented inline in web/src/lib/db.ts's comment on runSerializable.
- web/src/lib/services/loans.ts's getLoans() has a documented, deliberate escape from database-level pagination: because ACTIVE vs. OVERDUE status is derived per-row from dueDate + gracePeriodDays (deriveLoanDisplayStatus) rather than stored, Prisma's query builder cannot express it as a WHERE clause, so for those two status filters the function fetches every matching ACTIVE loan and paginates in memory (lines 360-381) rather than risk a DB-level skip/take returning a page that doesn't match what deriveLoanDisplayStatus would compute. This is explicitly reasoned about in an inline comment, not an oversight — but it does mean these two filters do not scale with the ACTIVE loan count the way the CLOSED-status path (plain DB skip/take, lines 383-393) does.
- React re-renders are not defended against via memoization (§7) — this is a codebase characteristic, not a documented trade-off; no comment anywhere explains why useMemo/useCallback/React.memo are avoided.
- Exactly one deliberate polling interval exists in the whole frontend (web/src/components/live-market-ticker.tsx, 15 minutes); every other data need is a one-shot RTK Query fetch refreshed only via tag invalidation.
- backend/'s market-rates.service.ts chains up to three external HTTP fetch attempts (goldprice.org, then open.er-api.com + gold-api.com in parallel via Promise.all, then a DB-cached fallback) before giving up — a deliberate degrade-gracefully sequence, at the cost of a potentially slow worst-case response when the primary provider is down but reachable (no explicit timeout is set on any of the fetch() calls in backend/src/modules/market-rates/market-rates.service.ts).

## 18. Quick-Reference: Confirmed Inconsistencies

| # | Topic | Subsystem(s) | Files | Nature |
|---|---|---|---|---|
| 1 | Quote style / trailing commas / print width | backend vs web | backend/.prettierrc, web/.prettierrc.json | Different Prettier settings per subsystem; not a bug, just unharmonized. |
| 2 | Prettier/ESLint integration | web | web/eslint.config.mjs, web/package.json | eslint-config-prettier and eslint-plugin-prettier are installed but never imported/used in web/'s ESLint config. |
| 3 | endOfLine mismatch | backend | backend/.prettierrc, backend/eslint.config.mjs | ESLint enforces endOfLine: "auto"; the standalone .prettierrc doesn't set it, so npm run format and npm run lint --fix can disagree. |
| 4 | tsconfig strictness inversion | backend vs web | backend/tsconfig.json, web/tsconfig.json | The newer backend/ opts out of noImplicitAny/strictBindCallApply; the older web/ uses full strict: true. |
| 5 | as unknown as double-casting | web (heavier), backend (light) | 8 files in web/src (11 occurrences), 1 file in backend/src (3 occurrences) | Workaround for better-auth's session.user type lacking custom fields (web, 9 of 11 occurrences); unrelated singleton/tx casts (web, 2 of 11); enum casting (backend). |
| 6 | Exception class choice | backend | backend/src/modules/organizations/organizations.service.ts vs. everywhere else | NotFoundException (built-in) used once; HttpException({error}) used everywhere else. |
| 7 | Logger adoption | backend | 13 of 27 @Injectable()/@Controller() classes | Partial, not universal. |
| 8 | Comment density | backend vs web | ~0.15% of lines (backend/src) vs ~2% (web/src) | ~13x gap; backend/ is almost uncommented. |
| 9 | requireAdmin() unused; checkAdmin() partially unused | web | web/src/lib/auth/session.ts vs. admin/settings/page.tsx, admin/staff/page.tsx, and the mutating actions in admin/settings/actions.ts and admin/staff/actions.ts | requireAdmin has zero call sites anywhere; checkAdmin is called only by the read/list action in each of the two admin actions.ts files, while every mutating action in those same files hand-rolls the identical checkAuth()+role-check instead. |
| 10 | File name vs. exported symbol | web | web/src/app/(app)/admin/settings/settings-client.tsx, settings-page-client.tsx | Two "-client" files in one folder; the one that fills page.tsx's client-companion role is settings-page-client.tsx, not settings-client.tsx. |
| 11 | lib/ file casing | web | web/src/lib/redux/api (camelCase) vs. web/src/lib/services and lib root (mixed kebab-case/single-word/camelCase) | No single casing rule for non-component TypeScript files. |
| 12 | Model naming casing | backend + web (shared schema) | web/prisma/schema.prisma (= backend/prisma/schema.prisma) | user/session/account/verification lowercase; every other model PascalCase — inherited from better-auth's own table-naming convention, present since the earliest schema blueprint (.agents/schema.md). |
| 13 | Validation coverage | backend + web | See §15 table (10 files) | Present on create paths, frequently missing on update/settings/policy paths, in both subsystems. |
| 14 | Duplicate market-rates logic | backend + web | backend/src/modules/market-rates/market-rates.service.ts, web/src/lib/services/market-rates.ts | Same field set, same conversion constant, not consolidated — a direct artifact of the in-progress migration. |
| 15 | Spec-section numbering provenance | web | ARCHITECTURE.md (§6.1-§6.4), CONTRIBUTING.md (Non-Negotiables #1-#4), web/src/lib/services/*.ts and web/src/__tests__/*.ts | Code and tests cite §6.1-§6.5 and Non-Negotiable #2/#5; only §6.1-§6.4 and #1-#4 are documented in any current root file, and that documentation lives in ARCHITECTURE.md, not in .agents/tasks.md or .agents/decisions.md as such references might suggest. §6.5 and #5 are undocumented anywhere in the repo outside the code comments themselves. |

---

**Summary of corrections made to the draft during this fact-check pass:** (1) web/eslint.config.mjs is 18 lines, not 19; (2) the "as unknown as" count in web/src is 11 occurrences across 8 files, not 37 across 18 — corrected throughout §3 and §18; (3) the "no use client" file breakdown in §7 was wrong about marketing/ ("most of marketing/" lacks it — actually only 2 of 6 do; most of marketing/ has it) and omitted the 5 ui/ files that account for most of the 8; (4) the §-numbered test/comment markers do not all trace to .agents/tasks.md and .agents/decisions.md — only the §Phase N markers do; §6.N markers trace to root-level ARCHITECTURE.md, and §6.5/Non-Negotiable #5 are undocumented anywhere; (5) Logger adoption in backend/ is 13 of 27 (48%), not 15 of 27 (56% — the original count incorrectly included main.ts and http-exception.filter.ts, neither of which is an @Injectable()/@Controller() class); (6) .then() chains number two, not one, both in the same file; (7) the claim that admin/settings/actions.ts's Server Actions "correctly" call checkAdmin() was true for only 1 of its 3 actions — corrected in §16 and §18; (8) the UpdateOrganizationPolicyDto validation claim overstated @Max() coverage (only 4 of 9 numeric fields have it); (9) the web/src/lib folder tree misplaced store.ts/provider.tsx/hooks.ts inside redux/api/ (they are siblings of api/, not children) and omitted the dead-code lib/actions/ folder; (10) the web/src comment-line count is 370, not 368. All other concrete, checkable claims in the draft — file paths, line numbers, quoted code, quoted strings, field names, enum members, route paths, and counts — were verified against the working tree and left unchanged.