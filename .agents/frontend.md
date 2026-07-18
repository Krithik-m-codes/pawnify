# Pawnify Frontend (Next.js Web App)

## 1. Scope and Subsystem Boundary

This document describes web/ only — the mature Next.js application in this monorepo. Every fact below applies to web/ unless a subsection is explicitly labeled otherwise (a handful of backend/ facts are included for contrast where web/ actually calls into backend/, e.g. §8 and §10.3).

backend/ is a partial NestJS API. Its module directory contains 8 subdirectories — auth, cron, customers, health, market-rates, organizations, storage, webhooks (verified via direct directory listing of backend/src/modules) — not 7; the "7 modules" figure used elsewhere in this project's working context is an off-by-one miscount against that same list of 8 names, noted here once for precision and not repeated below.

Verification method: every routing, component, state-management, and auth claim in this document was confirmed by directly reading the cited source file(s) in this pass, not inferred. Line counts and dependency versions were measured directly (wc -l, and direct reads of web/package.json and web/package-lock.json). Where a fact could not be established from source, it is marked "Unknown" rather than guessed, per this task's grounding rules.

## 2. Stack Facts and a Verified Version Contradiction

web/package.json declares (web/package.json):

| Package | Declared | Installed (web/package-lock.json) | Note |
|---|---|---|---|
| next | ^9.3.3 | 9.3.3 (confirmed; node_modules/next resolves to 9.3.3, and the ancillary @next/polyfill-nomodule package is also locked at exactly 9.3.3) | Next.js 9.3.3 predates the App Router, Route Handlers, Middleware, and Promise-based dynamic route params by several major versions. |
| react / react-dom | 19.2.4 | 19.2.4 (confirmed in lockfile) | React 19 has no supported pairing with a Next 9 runtime. |
| eslint-config-next | 16.2.10 | 16.2.10 (confirmed in lockfile; package.json pins this exact version with no `^`) | Paired devDependency implies a target of Next 16, not 9. |
| lucide-react | ^1.23.0 | 1.23.0 (confirmed in lockfile) | Unusually low major version for this package; genuinely installed as declared. |

Every routing convention actually used in web/src/app — the App Router directory structure itself, Route Handlers (web/src/app/api/auth/[...all]/route.ts), Server Actions ("use server" files throughout), and `await params` on dynamic segments (e.g. web/src/app/(app)/customers/[id]/page.tsx, web/src/app/(app)/loans/[id]/page.tsx) — requires Next.js 13+ (App Router), 15+ (Promise-based params) respectively. ARCHITECTURE.md — at the repository root, not under web/ — itself states "Next.js 16 (App Router)" (ARCHITECTURE.md, line 18); web/README.md separately states "Next.js 15 (App Router)" (web/README.md, line 14); and web/src/components/marketing/footer.tsx's rendered copy reads "Powered by Next.js 15" (web/src/components/marketing/footer.tsx, line 130) — all three directly contradicting the package.json/lockfile pin. There is no file named web/ARCHITECTURE.md; a citation to that path would be wrong. **Unknown**: whether next@9.3.3 is what actually builds/serves this app in any real environment, or whether some override supplies a different version at build or deploy time. This was not resolved by running npm install or next dev — only source and lockfile were inspected.

Tailwind: v4, confirmed via web/postcss.config.mjs (`"@tailwindcss/postcss": {}`) and the `@import "tailwindcss";` / `@theme { … }` block at the top of web/src/app/globals.css. There is no tailwind.config.js/ts anywhere in web/ (confirmed by search) — the only customization is a `--font-sans` override and nine `--color-accent-*` steps inside `@theme` (web/src/app/globals.css, lines 3–17). No breakpoint is redefined, so Tailwind v4's compiled default breakpoints apply throughout: sm 40rem/640px, md 48rem/768px, lg 64rem/1024px, xl 80rem/1280px, 2xl 96rem/1536px.

Test coverage: web/src/__tests__ contains 7 files (billing.test.ts, interest.test.ts, jurisdiction.test.ts, rls-isolation.test.ts, universal-assets.test.ts, valuation.test.ts, waterfall.test.ts — confirmed by directory listing), run under Vitest with `environment: "node"` (web/vitest.config.ts). web/package.json's devDependencies contain no @testing-library/* package and no jsdom. Conclusion: these tests exercise pure business-logic functions in web/src/lib/services/, not React components — there is no component-level or rendering test coverage anywhere in web/.

Directory sizes (independently measured, .ts/.tsx only): web/src/app — 70 files; web/src/components — 21 files / 3,612 lines; web/src/lib — 40 files / 3,741 lines; web/src/__tests__ — 7 files.

## 3. Routing

web/src/app is a single App Router tree under one root layout (web/src/app/layout.tsx), split into three tiers plus one Route Handler. Total distinct page routes: 21 (6 marketing + 1 login + 14 app). Route groups (auth) and (app) do not appear in the URL.

### 3.1 Root layout

web/src/app/layout.tsx is an unauthenticated Server Component wrapping every route: loads the Poppins font, forces the initial `<html>` class to `"light"` (theme is corrected client-side post-mount — see §4.1), wraps children in ReduxProvider then ThemeProvider, and declares all default metadata/OpenGraph/icons/viewport (web/src/app/layout.tsx). Global stylesheet: web/src/app/globals.css (548 lines).

### 3.2 Tier 1 — Public marketing routes (6 routes, no auth)

| Route | File | Pattern |
|---|---|---|
| / | web/src/app/page.tsx (36 lines) | Server Component. Renders MarketingNavbar, LandingHero, UniversalAssetCalculator, FeaturesSection, MarketingFooter. |
| /docs | web/src/app/docs/page.tsx (92 lines) | Server Component, static documentation hub. |
| /open-source | web/src/app/open-source/page.tsx (127 lines) | Server Component, OSS/self-host description. |
| /pricing | web/src/app/pricing/page.tsx (222 lines) | Server Component, self-hosted vs. cloud plan comparison. |
| /privacy | web/src/app/privacy/page.tsx (57 lines) | Server Component, static text. |
| /terms | web/src/app/terms/page.tsx (54 lines) | Server Component, static text. |

All six are `async` Server Components whose only per-request logic is `const session = await getSession(); const isAuthenticated = !!session;`, passed to MarketingNavbar purely to switch its CTA between "Sign In" and "Go to Dashboard" (verified directly in web/src/app/page.tsx, web/src/app/docs/page.tsx, web/src/app/pricing/page.tsx, web/src/app/privacy/page.tsx, web/src/app/terms/page.tsx; getSession defined in web/src/lib/auth/session.ts). None of the six requires authentication or redirects.

### 3.3 Tier 2 — (auth) route group

Nesting: Root layout → web/src/app/(auth)/layout.tsx (sets `background: var(--bg-secondary)`, metadata only, no auth logic) → web/src/app/(auth)/login/layout.tsx (pure passthrough, metadata only) → web/src/app/(auth)/login/page.tsx.

/login (web/src/app/(auth)/login/page.tsx, 375 lines) is a Client Component (`"use client"`). Its default export wraps an inner AuthForm component in `<Suspense>` (needed because AuthForm calls `useSearchParams()`). AuthForm: controlled `email`/`password` state, calls `authClient.signIn.email({ email, password, callbackURL })` (better-auth client SDK, web/src/lib/auth-client.ts) on submit, fires a canvas-confetti burst on success, then `router.push(callbackUrl)` (followed by `router.refresh()`) where `callbackUrl` defaults to `/dashboard` from the `callbackUrl` search param. A demo-account quick-fill panel (`fillDemo`) renders only when `process.env.NEXT_PUBLIC_DEMO_MODE === "true"`. Layout: `hidden lg:flex lg:w-1/2` dark editorial panel + `w-full lg:w-1/2` form panel (mobile collapses to form-only). **No file in this chain redirects an already-authenticated visitor away from /login** — confirmed by reading all three files; there is no session check anywhere in the (auth) tree.

### 3.4 Tier 3 — (app) route group (14 routes, session-gated)

Nesting: Root layout → web/src/app/(app)/layout.tsx. This layout is the single central gate: it calls `await requireSession()` (web/src/lib/auth/session.ts) before rendering anything, redirecting unauthenticated users to `/login` or roleless/inactive users to `/login?error=unauthorized_role`. On success it renders `<Sidebar user={user} />` and `<LiveMarketTicker />` as persistent chrome around `{children}` (web/src/app/(app)/layout.tsx).

| Route | Files (lines) | Component type | Extra guard beyond layout | loading.tsx |
|---|---|---|---|---|
| /dashboard | page.tsx (9) → dashboard-client.tsx (585) | Thin server wrapper → Client | none | yes (66) |
| /customers | page.tsx (9) → customers-list-client.tsx (104) | Thin server wrapper → Client | none | yes (56) |
| /customers/new | new/layout.tsx (11, metadata-only) → new/page.tsx (312) | Client only | none | inherits ../loading.tsx |
| /customers/[id] | page.tsx (20) → customer-detail-client.tsx (348) | async Server (awaits `params`, calls `requireSession()` again, computes `isAdmin`) → Client | redundant requireSession() | none (own) |
| /loans | page.tsx (9) → loans-list-client.tsx (180) | Thin server wrapper → Client | none | yes (67) |
| /loans/new | new/layout.tsx (12, metadata-only) → new/page.tsx (869) | Client only | none | inherits ../loading.tsx |
| /loans/[id] | page.tsx (20) → loan-detail-client.tsx (428) | async Server (same pattern as customers/[id]) → Client | redundant requireSession() | none |
| /followups | page.tsx (9) → followups-client.tsx (85) | Thin server wrapper → Client | none | yes (62) |
| /reports | page.tsx (9) → reports-client.tsx (263) | Thin server wrapper → Client | none | none |
| /profile | page.tsx (35, async, `requireSession()`) → profile-client.tsx (380) | Server → Client, wrapped in an explicit inline `<Suspense fallback={<Loader2 .../>}>` | none extra | none (own inline Suspense instead) |
| /onboarding | page.tsx (24, non-async) → onboarding-wizard-client.tsx (407) | Server (static JSX shell, no explicit auth call of its own — relies entirely on the (app) layout gate) → Client | none | none |
| /admin/settings | page.tsx (17) → settings-page-client.tsx (28) → settings-client.tsx (495) | async Server → Client → Client | manual `checkAuth()` + `role !== "ADMIN"` → `redirect("/dashboard")` | none |
| /admin/staff | page.tsx (17) → staff-management-client.tsx (37) → staff-client.tsx (739) + staff-table.tsx (186) | async Server → Client → Client | same manual ADMIN check as above | yes (50) |
| /platform-admin | page.tsx (118, async) → client.tsx (38, `PlanSelectorClient`) | async Server (queries `prisma.organization.findMany()` directly, renders full table server-side) | see finding below | none |

Guard duplication (verified by reading both files): web/src/app/(app)/admin/settings/page.tsx and web/src/app/(app)/admin/staff/page.tsx each independently write:
```
const auth = await checkAuth();
if (!auth.authenticated || auth.user?.role !== "ADMIN") redirect("/dashboard");
```
instead of calling the existing `requireAdmin()` helper (web/src/lib/auth/session.ts), which performs the same check but redirects to `/login?error=unauthorized_admin` instead. `requireAdmin()` is defined but has zero call sites anywhere in web/src/app (confirmed by search) — it is dead code, superseded in practice by this duplicated inline pattern.

Authorization gap on /platform-admin (verified by reading web/src/app/(app)/platform-admin/page.tsx in full): the file calls `const auth = await checkAuth();` at line 13 and never reads `auth` again anywhere else in the file — no role branch, no redirect. As written, any authenticated, active, role-bearing user who clears the (app) layout's `requireSession()` gate (i.e. any STAFF or ADMIN, not ADMIN-only) can view every tenant organization's loan/branch/user counts and billing plan — unlike /admin/settings and /admin/staff, which do restrict to ADMIN. The page's `PlanSelectorClient` triggers `changeOrganizationPlanAction` (web/src/app/(app)/platform-admin/actions.ts, 38 lines), which is gated, but only conditionally: it always requires `checkAuth()` (any authenticated, active, role-bearing user) to succeed, and separately requires the caller's DB-looked-up `role` to equal `"ADMIN"` — but that DB-role check only runs when the environment variable `PLATFORM_ADMIN_EMAIL` is set and the caller's session email does not match it. `PLATFORM_ADMIN_EMAIL` is not declared in web/.env.example and has exactly one reference anywhere in the repository (its own read site in this action), so whether it is configured in any real deployment is Unknown. If it is unset, the mutation has exactly the same gap as the view: any authenticated STAFF can change any tenant's billing plan.

Sidebar admin-section visibility (web/src/components/sidebar.tsx, line 144: `{user.role === "ADMIN" && (…)}`) hides the /platform-admin, /admin/staff, /admin/settings, and /onboarding nav links from non-admins, but this is UI-only — it does not by itself prevent a non-admin from navigating directly to any of these URLs, and for /platform-admin specifically, nothing else prevents it either (see above).

No admin/layout.tsx exists, and /admin itself has no page.tsx (not a valid route).

### 3.5 Route Handlers

web/src/app/api/auth/[...all]/route.ts (4 lines) is the only Route Handler in web/: `export const { GET, POST } = toNextJsHandler(auth)`, delegating entirely to the better-auth instance in web/src/lib/auth.ts. It does not nest under any layout.tsx (Next.js Route Handler convention) and has no dependency on backend/. **Unknown**: the exact set of sub-paths served under /api/auth/* (sign-in, session, sign-out, etc.) — defined internally by the third-party better-auth package, not enumerated from this repo's source.

### 3.6 Non-route routing-adjacent files

- web/next.config.ts: `const nextConfig: NextConfig = {/* config options here */};` — empty. Zero rewrites, redirects, headers, or experimental flags.
- web/src/proxy.ts (37 lines): exports `function proxy(request: NextRequest)` and `export const config = { matcher: ["/api/:path*", "/proxy/:path*"] }` — shaped exactly like Next.js Middleware (edge signature + matcher export) but named `proxy`, not `middleware`. No file named middleware.ts exists anywhere in the repo's source (confirmed by search; ignoring build output under .next/), and no other file imports this exported `proxy` function (confirmed by search) — its only possible activation path is Next.js's filename-based auto-detection of a file literally named middleware.ts/js, which this is not. Its logic (verified by direct read): for paths under /api/ or /proxy/, sets `Access-Control-Allow-Origin` (echoing the request's Origin header, or `"*"` if none is present), `-Allow-Credentials`, `-Allow-Methods`, `-Allow-Headers` (including `X-Supabase-Auth`, `Authorization`, `Cookie`), plus `X-Forwarded-Host` and `X-Proxy-By`, and short-circuits `OPTIONS` with a 200. It never rewrites the URL or forwards to another origin, so it is not a reverse proxy despite the name. The `/proxy/*` half of its matcher matches no real route anywhere in web/src/app. Combined with the Next 9.3.3 pin (§2, which predates Middleware by several major versions), **whether this file executes at all is Unknown from source.**
- web/vercel.json: configures a daily Vercel Cron (`"0 0 * * *"`) hitting `/api/cron/update-rates`. No route matching `/api/cron/*` exists anywhere under web/src/app/api (confirmed by search — the only file there is api/auth/[...all]/route.ts). The closest match repo-wide is backend/src/modules/cron/cron.controller.ts, which defines both a `@Get('update-rates')` and a `@Post('update-rates')` handler under `@Controller('cron')`. Vercel Cron Jobs invoke their configured path via an HTTP GET request by default, so it is the `@Get('update-rates')` handler that structurally matches vercel.json's configured trigger, not the POST handler — either way, this is a structurally different NestJS route not reachable at the Vercel-configured path without an explicit rewrite (none exists in web/next.config.ts or web/src/proxy.ts). This is concrete evidence of an in-progress, not-fully-cleaned-up migration of this one feature from web/ to backend/.

## 4. UI Architecture and Design System

### 4.1 Theming mechanism

Two-value ("light"/"dark") theme via React Context, not Tailwind's `dark:` variant (web/src/components/theme-provider.tsx). `ThemeProvider` stores the theme in `localStorage["pawnify-theme"]`, toggles a `"light"`/`"dark"` class on `document.documentElement`, and renders children with `visibility: hidden` until mounted to avoid a flash-of-wrong-theme. It is mounted once at the true app root (web/src/app/layout.tsx), covering both the marketing site and the authenticated app. The exported `useTheme()` hook's default context value (`{ theme: "light", toggleTheme: () => {} }`) means calling it outside the provider silently no-ops rather than throwing.

Every component (both ui/ primitives and feature components) styles itself via Tailwind utility classes plus inline `style={{ color: "var(--text-primary)", … }}` referencing CSS custom properties defined twice in web/src/app/globals.css — once under `:root, html.light` (lines 21–67) and once under `html.dark` (lines 69–115) — e.g. `--bg-primary`, `--bg-card`, `--text-primary`, `--accent`, `--border-primary`. This is why no component in the tree uses Tailwind's `dark:` variant: the whole design system is class-toggle + CSS-variable based.

### 4.2 ui/ primitives (web/src/components/ui/, 9 files)

Domain-agnostic, no data fetching, no business logic. Built on class-variance-authority + a shared `cn()` helper (`clsx` + `tailwind-merge`, web/src/lib/utils.ts) plus @radix-ui/react-dialog for the two modal primitives.

| File | Lines | Wraps | Confirmed import sites |
|---|---|---|---|
| button.tsx | 46 | Native `<button>`, cva variants (default/secondary/destructive/outline/ghost/link) × sizes (default/sm/lg/icon) | 6 files: admin/staff/staff-client.tsx, customers/[id]/customer-crud-buttons.tsx, followups/followup-client.tsx, loans/[id]/loan-actions-client.tsx, loans/[id]/loan-crud-buttons.tsx, ui/alert-dialog.tsx |
| input.tsx | 23 | Native `<input>`, applies the same global `input-field` CSS class internally | 4 files: admin/staff/staff-client.tsx, customers/[id]/customer-crud-buttons.tsx, followups/followup-client.tsx, loans/[id]/loan-actions-client.tsx |
| label.tsx | 20 | Native `<label>` | same 5 files as input.tsx plus loans/[id]/loan-crud-buttons.tsx |
| select.tsx | 24 | Native `<select>` (no @radix-ui/react-select dependency exists in web/package.json), also applies `input-field` internally | 3 files: admin/staff/staff-client.tsx, followups/followup-client.tsx, loans/[id]/loan-actions-client.tsx |
| textarea.tsx | 22 | Native `<textarea>` | 1 file: loans/[id]/loan-crud-buttons.tsx |
| dialog.tsx | 106 | @radix-ui/react-dialog (Root/Trigger/Portal/Close/Overlay/Content-with-built-in-close-X/Header/Footer/Title/Description) | 6 files including document-uploader.tsx |
| alert-dialog.tsx | 116 | The same @radix-ui/react-dialog primitive (not a dedicated @radix-ui/react-alert-dialog package, which is not a dependency) | 5 files: loan-crud-buttons.tsx, loan-actions-client.tsx, followup-client.tsx, customer-crud-buttons.tsx, staff-client.tsx — i.e. the same set as label.tsx (input.tsx's 4 files plus loan-crud-buttons.tsx), not the same set as input.tsx itself |
| data-table.tsx | 314 | @tanstack/react-table — client-side search box, sortable headers, full pagination, skeleton loading rows, empty state | 4 files: admin/staff/staff-table.tsx, customers/customers-table.tsx, followups/followups-table.tsx, loans/loans-table.tsx |
| skeleton.tsx | 40 | 4 shape variants (text/circular/rectangular/card) | 6 files: 5 route-level loading.tsx skeletons plus ui/data-table.tsx's own loading-row state |

`button.tsx` declares `asChild?: boolean` on `ButtonProps` (a shadcn/ui-style convention for Radix `Slot`-based polymorphic rendering) but never reads or acts on it — it flows straight into `...props` and would be spread onto the native `<button>`. @radix-ui/react-slot is a declared and installed dependency (web/package.json; confirmed present at version 1.3.0 in web/package-lock.json) but has zero import sites anywhere in web/src (confirmed by search) — `asChild` is vestigial. Three other Radix packages are likewise declared and genuinely installed but never imported: @radix-ui/react-dropdown-menu (2.1.19), @radix-ui/react-tabs (1.1.16), @radix-ui/react-tooltip (1.2.11) — no Tabs/DropdownMenu/Tooltip component exists anywhere in ui/.

### 4.3 Two form-building conventions coexist

Convention A — ui/ primitives, used in exactly 5 files: admin/staff/staff-client.tsx, customers/[id]/customer-crud-buttons.tsx, followups/followup-client.tsx, loans/[id]/loan-actions-client.tsx, loans/[id]/loan-crud-buttons.tsx. All five are dialog-triggered CRUD action modals embedded inside list/detail views (edit/delete/status-change/record-payment forms).

Convention B — raw native `<input>`/`<select>`/`<textarea>` tags styled directly with the global `input-field`/`input-label` CSS utility classes (defined in web/src/app/globals.css, lines 320–366), used in 9 files: admin/settings/settings-client.tsx, customers/[id]/kyc-actions.tsx, customers/customers-list-client.tsx, customers/new/page.tsx, loans/loans-list-client.tsx, loans/new/page.tsx, onboarding/onboarding-wizard-client.tsx, profile/profile-client.tsx, (auth)/login/page.tsx. These are the large, full-page "create/configure" forms (entity-creation pages, the login form, the onboarding wizard, settings, profile).

These two conventions are **visually identical, not divergent** — confirmed by reading ui/input.tsx and ui/select.tsx directly: both apply the literal string `"input-field"` as the first class in their internal `cn(...)` call, i.e. the design-system component is a thin `forwardRef` wrapper around the same CSS utility class that Convention-B forms apply by hand. The actual gap is code-reuse/componentization (9 files hand-roll the native tag instead of importing the 20–24-line wrapper component that already exists), not a design or branding inconsistency.

### 4.4 Global CSS utility classes (web/src/app/globals.css)

`.btn-primary` / `.btn-secondary` / `.btn-danger` (gradient/solid buttons with light+dark variants), `.glass-card` / `.glass-card-hover` (16px-radius bordered card with hover lift), `.kpi-card` (dashboard metric tile with a hover sheen animation), `.data-table` (plain-CSS table styling; shares its name with, and is in fact also applied inside, the React `ui/data-table.tsx` component's own rendered `<table>` (ui/data-table.tsx, line 100) — and is additionally applied by hand to raw `<table>` markup in dashboard-client.tsx, customer-detail-client.tsx, and loan-detail-client.tsx), `.input-field` / `.input-label` (form controls, §4.3), `.badge-active` / `-overdue` / `-closed` / `-pending` / `-verified` / `-rejected` (status pills, each with a `html.dark` override), `.modal-backdrop` / `.dialog-overlay` (blurred-overlay rules with `html.dark` overrides, defined at lines 528–540 — but **dead CSS**: a repo-wide search finds no className reference to either name anywhere outside this definition; the Radix dialogs' actual overlays, ui/dialog.tsx's `DialogOverlay` and ui/alert-dialog.tsx's `AlertDialogOverlay`, are instead styled with an inline Tailwind string, `bg-black/40 backdrop-blur-md data-[state=open]:animate-fadeIn data-[state=closed]:animate-fadeOut`). A `@media (max-width: 768px)` block reduces `.kpi-card` padding (web/src/app/globals.css, lines 544–548) — the only raw CSS media query in the file; all other responsiveness is Tailwind breakpoint classes (§11).

## 5. Component Inventory

### 5.1 App-shell / top-level components (web/src/components/, non-ui, non-marketing)

| File | Lines | "use client" | Purpose | Key libraries |
|---|---|---|---|---|
| sidebar.tsx | 370 | yes | (app) navigation shell: desktop-fixed `w-64` sidebar + mobile slide-in drawer, both rendered from one internal `NavContent` sub-component; theme-toggle pill; sign-out via `authClient.signOut()` | next/navigation, lucide-react (16 icons), auth-client.ts |
| page-header.tsx | 31 | no | Generic title/description/action-slot header; imported by 16 files under web/src/app/(app)/** (confirmed by search) — the most widely reused feature component after the ui/ primitives | none beyond React |
| theme-provider.tsx | 55 | yes | §4.1 | none beyond React |
| dashboard-charts.tsx | 404 | yes | Tab-switching analytics card: gradient AreaChart (disbursed vs. collected) + two donut PieCharts (collateral by metal, loan status), custom tooltip subcomponents, an inline `formatINR` (Cr/L/k suffixes) | recharts, framer-motion |
| live-market-ticker.tsx | 140 | yes | Sticky ticker: 24K gold + fine silver ₹/g spot rates, "safety haircut" badge, manual refresh button; rendered inside the (app) layout alongside Sidebar; its `useGetMarketRatesQuery` call sets `pollingInterval: 15 * 60 * 1000` (15 minutes) | RTK Query (marketRatesApi) |
| document-uploader.tsx | 733 | yes | See §5.4 | axiosClient, ui/dialog.tsx |

sidebar.tsx imports the lucide-react `Scale` icon (line 17) but never references it in JSX — confirmed by grep; a genuine unused import.

### 5.2 Marketing components (web/src/components/marketing/, 6 files)

| File | Lines | "use client" | Notes |
|---|---|---|---|
| navbar.tsx | 174 | yes | Sticky header, auth-aware CTA; its "Live Calculator" link points to `/#calculator`, and landing-hero.tsx's "Test Real-Time Simulator" button links to the same `#calculator` fragment — but `id="calculator"` exists nowhere in web/src except inside interactive-ltv-calculator.tsx (line 89), the dead/unreached component documented below. universal-asset-calculator.tsx — the calculator actually rendered on the homepage — carries no `id="calculator"` anywhere on itself or on its wrapping `<div>` in page.tsx. Net effect: both anchor links are broken on the live site; they target a DOM id that is never rendered anywhere in the running app. |
| landing-hero.tsx | 142 | yes | Marked `"use client"` but contains no hooks, event handlers, or browser-only APIs — purely static JSX; unlike its equally-static siblings (features-section.tsx, footer.tsx), which carry no directive, this appears to be an unnecessary client-bundle inclusion |
| features-section.tsx | 102 | no | Static 3-card grid; imports 8 lucide-react icons of which 3 are never referenced in JSX — `ShieldAlert`, `Database`, `Server` (confirmed by grep: each identifier appears exactly once in the file, on its own import line) — the 5 actually rendered are `Layers`, `Lock`, `Scale`, `RefreshCw`, and `CheckCircle2` |
| footer.tsx | 136 | no | Static footer; its rendered copy reads "Powered by Next.js 15 · Supabase RLS · Prisma Decimal", conflicting with the package.json pin (§2) |
| universal-asset-calculator.tsx | 293 | yes | The calculator actually embedded on the homepage: 5 asset categories × 9 currencies, hardcoded per-currency spot-rate/LTV constants in the component itself (not sourced from any shared config or backend endpoint); imports `WORLDWIDE_JURISDICTIONS` from web/src/lib/config/jurisdictions.ts but never references it in the file body (unused import) |
| interactive-ltv-calculator.tsx | 321 | yes | **Dead code** — a repo-wide search finds only its own definition; not imported or rendered anywhere. Its hardcoded gold/silver LTV tiers (≤₹250,000→85%, ₹250,001–500,000→80%, >₹500,000→75%) duplicate, in native floating point, the `DEFAULT_LTV_SLABS` computed authoritatively with `decimal.js`-backed `Prisma.Decimal` math in web/src/lib/services/valuation.ts. It also contains the app's only `id="calculator"` element (line 89) — see navbar.tsx above; the site's "Live Calculator"/"Test Real-Time Simulator" anchor links target this never-rendered id. |

### 5.3 Feature-page composition pattern ((app) route group)

Every (app) domain (customers, loans, followups, staff, settings) follows the same three-layer file split:

1. **`<domain>-list-client.tsx` / `<domain>-client.tsx`** — the page-level Client Component; calls the domain's `useGetXQuery` RTK Query hook and renders a PageHeader plus the table/detail component. Examples: customers-list-client.tsx (104 lines), loans-list-client.tsx (180), followups-client.tsx (85, itself importing followup-client.tsx for the "new" modal).
2. **`<domain>-table.tsx`** — column definitions + `<DataTable>` (ui/data-table.tsx) instantiation. Examples: customers-table.tsx (209), loans-table.tsx (224), followups-table.tsx (175), staff-table.tsx (186).
3. **`<domain>-actions.tsx` / `<domain>-crud-buttons.tsx`** — the create/edit/delete/status-change modals, built on the ui/ primitives (§4.2, Convention A). Examples: customer-crud-buttons.tsx (`CustomerCrudButtons`, 269 lines), kyc-actions.tsx (`AddKycForm`, `VerifyKycButtons`, 193 lines), loan-crud-buttons.tsx (`LoanCrudButtons`, 189 lines), followup-client.tsx (`NewFollowUpModal`, `FollowUpStatusButton`, `DeleteFollowUpButton`, 252 lines).

Detail pages (customers/[id], loans/[id]) add one more layer: an `async` Server Component (page.tsx) that awaits the Promise-based `params`, calls `requireSession()` again, computes `isAdmin` from `session.user.role`, and passes `{ id, isAdmin }` into a `*-detail-client.tsx` (customer-detail-client.tsx 348 lines, composing AddKycForm/VerifyKycButtons/CustomerCrudButtons; loan-detail-client.tsx 428 lines, composing the components in loan-actions-client.tsx and loan-crud-buttons.tsx).

Two admin domains split one step further because a thin page-level wrapper imports components physically defined inside a differently-named "client" file: settings-page-client.tsx (28 lines) imports `SettingsForm` from settings-client.tsx (495 lines); staff-management-client.tsx (37 lines) imports `AddStaffModal` from staff-client.tsx (739 lines), and staff-table.tsx separately imports `StaffActionsMenu` from the same staff-client.tsx. This is a genuine (if confusingly named) split, not dead code — verified by tracing every import.

### 5.4 Size and duplication findings (confirmed)

- **web/src/app/(app)/loans/new/page.tsx — 869 lines**, the largest .tsx file anywhere in web/src and 2.8× its closest analog (customers/new/page.tsx, 312 lines). One function component fuses customer typeahead search (lines 56–94), a market-rate fetch synced into local state via `useEffect` (lines 96–174 — this is a single `useGetMarketRatesQuery()` call with no arguments and no `pollingInterval`, i.e. one-shot fetch + tag-invalidation refresh, not live polling; true interval polling exists only in web/src/components/live-market-ticker.tsx, which this page does not use), dynamic collateral-item CRUD with metal-purity presets (lines 117–231, overlapping the previous range and also sweeping in unrelated loan-term state such as `tenureMonths`/`interestRateMonthly`), a pure valuation calculator `computeTotals` (lines 233–254), and the submit handler (lines 264–295). No `useCustomerSearch`/`useLiveSpotRates`/`useLoanItems` hook exists anywhere in web/src to extract this into.
- **web/src/app/(app)/admin/staff/staff-client.tsx — 739 lines**, ~4× its sibling staff-table.tsx (186 lines). Contains `EditStaffUserModal` (lines 182–329) and `EditModalContent` (lines 608–739) as near-verbatim duplicates of the same edit-staff form (identical `useState` hooks, identical `handleSubmit` calling `useUpdateStaffUserMutation`, identical "You cannot demote your own active admin account" copy) — their `DialogTitle` text has already drifted ("Edit Staff Details & Role" vs. "Edit Staff Account & Permissions"). `EditStaffUserModal` has zero importers anywhere in the repo (confirmed by search) — it is dead code sitting beside the live `EditModalContent`, reachable only via `StaffActionsMenu` → staff-table.tsx.
- **web/src/components/document-uploader.tsx — 733 lines**, the largest file in web/src/components (next is dashboard-charts.tsx at 404). One `DocumentUploader` function inlines at least 8 responsibilities: localStorage persistence, file-size validation, upload orchestration (POST to `/storage/upload` via axiosClient, i.e. backend/'s storage module — backend/src/modules/storage/storage.controller.ts), category tagging, drag-and-drop, clipboard-copy, document removal, and an image/PDF/generic preview modal. It has 4 real call sites, not the "loans/new, customers/new, KYC" 3 implied by its own default label: loans/new/page.tsx (twice — item-photo capture and collateral upload), customers/new/page.tsx (once, KYC), and profile/profile-client.tsx (once, staff document/avatar upload). **Confirmed live bug**: its upload error handler calls `axios.isAxiosError(err)` (in the catch block of the upload function) but the file's only axios-related import is `axiosClient` from web/src/lib/axiosClient.ts — the bare identifier `axios` is never imported or declared anywhere in the file. Any real upload failure (network error or non-2xx response) throws `ReferenceError: axios is not defined` inside the catch block instead of surfacing the intended "Upload Failed" message.
- **web/src/app/(app)/loans/[id]/loan-actions-client.tsx — 562 lines**, exports 5 unrelated components (`RecordPaymentModal`, `CloseLoanButton`, `ReleaseItemsButton`, `PawnTicketPrintButton`, `ItemPhotoPreview`) in one file, even though the same folder already keeps CRUD buttons separate in loan-crud-buttons.tsx — a precedented split that wasn't applied here.
- **web/src/app/(app)/dashboard/dashboard-client.tsx — 585 lines**, a single `DashboardClient` function (line 44 to end of file) inlining all JSX (KPI cards, secondary metrics grid, overdue-loans table, recent-disbursals list) with no subcomponent decomposition beyond two formatting helpers and the pre-existing external `DashboardCharts` import.

## 6. Hooks

There is no dedicated hooks/ directory anywhere in web/src (confirmed by directory listing). Hand-written custom hooks total exactly 4, across 2 files:

| Hook | File | Purpose |
|---|---|---|
| `useTheme()` | web/src/components/theme-provider.tsx | Read `{ theme, toggleTheme }` from ThemeContext |
| `useAppDispatch` | web/src/lib/redux/hooks.ts | `useDispatch.withTypes<AppDispatch>()` |
| `useAppSelector` | web/src/lib/redux/hooks.ts | `useSelector.withTypes<RootState>()` |
| `useAppStore` | web/src/lib/redux/hooks.ts | `useStore.withTypes<AppStore>()` |

Every other "hook" consumed in web/src is either a React/Next.js built-in (`useState`, `useEffect`, `useRef`, `useRouter`, `usePathname`, `useSearchParams`) or an RTK Query hook auto-generated by `api.injectEndpoints(...)` (e.g. `useGetLoansQuery`, `useCreateCustomerMutation`) — these are not hand-written functions but generated exports (§7, §8). No `react-hook-form` or `zodResolver` import exists anywhere in web/src (confirmed by search).

## 7. State Management — Redux Toolkit + RTK Query

web/src/lib/redux/store.ts's `makeStore()` builds a store whose only reducer key is `[api.reducerPath]: api.reducer` — the single RTK Query slice from web/src/lib/redux/api/baseApi.ts. Middleware is `getDefaultMiddleware().concat(api.middleware)`. **There is no traditional `createSlice`-based UI-state reducer anywhere in the app** — Redux exists exclusively to host RTK Query's server-state cache; modals/filters/wizard-step state are all local `useState`/`useContext` elsewhere.

web/src/lib/redux/provider.tsx is a `"use client"` `ReduxProvider` that builds one store instance per mounted tree via `useState(() => makeStore())` — the standard Next.js-App-Router-safe pattern (no module-level singleton that could leak across server-rendered requests).

web/src/lib/redux/api/baseApi.ts defines `createApi({ reducerPath: "api", baseQuery: hybridAxiosBaseQuery, tagTypes: [...], endpoints: () => ({}) })` — it declares zero endpoints itself; all 10 sibling `*Api.ts` files call `api.injectEndpoints(...)`. Declared `tagTypes`: `Loan`, `LoanList`, `Customer`, `CustomerList`, `Dashboard`, `Staff`, `Settings`, `FollowUp`, `Report`, `MarketRate`, `Profile` — 11 total.

`hybridAxiosBaseQuery` (web/src/lib/redux/api/baseApi.ts, lines 32–80) is a custom `BaseQueryFn` that branches per-call:
- If the endpoint's `query()` returns an object with `url` set → performs a real HTTP request through web/src/lib/axiosClient.ts (an axios instance), mapping any thrown `AxiosError` to `{ status, message }`.
- Else, if it returns `{ action, args }` (`action` being an imported Next.js Server Action function reference, `args` a positional-argument array) → calls `await action(...args)` **in-process, with no network hop at all**, and treats any resolved `{ success: false, error: string }` shape as an RTK Query error via the `isActionError` type guard.

`web/src/lib/redux/api/organizationsApi.ts` uses tag `{ type: "StaffList", id: "LIST" }` (4 call sites) — `"StaffList"` is **not** in baseApi.ts's declared `tagTypes` array (only `"Staff"` is, correctly used by staffApi.ts). This looks like a copy-paste slip from staffApi.ts. **Unknown**: whether this actually produces a TypeScript compiler error (not verified by running `tsc`).

## 8. API Layer — backend/ (NestJS) vs. web/ Server Actions

### 8.1 Full endpoint inventory (40 endpoints across 10 slices)

"Target" = `url:` (real HTTP call to axiosClient's base URL, i.e. backend/) or `action:` (in-process call into a Next.js Server Action, no backend/ involvement).

| Slice (file) | Endpoints (hook names abbreviated) | Target | Backing Server Action file / backend controller |
|---|---|---|---|
| customersApi.ts (8) | getCustomerById, getCustomers, createCustomer, updateCustomerDetails, deleteCustomer, addKycDocument, verifyKycDocument | action | customers/[id]/actions.ts, customers/actions.ts, customers/new/actions.ts |
| | searchCustomers | url `/customers/search` GET | backend/src/modules/customers/customers.controller.ts (`@Get('search')`, class-guarded by JwtAuthGuard) |
| dashboardApi.ts (1) | getDashboardData | action | dashboard/actions.ts — no backend dashboard module exists |
| followupsApi.ts (4) | getFollowUps, createFollowUp, updateFollowUpStatus, deleteFollowUp | action | followups/actions.ts — no backend followups module exists |
| loansApi.ts (8) | getLoanById, getLoans, createLoan, recordPayment, closeLoan, releaseItems, updateLoanNotes, deleteLoan | action | loans/[id]/actions.ts, loans/actions.ts, loans/new/actions.ts — no backend loans/payments module exists; this domain is 100% web/-resident |
| marketRatesApi.ts (2) | getMarketRates | url `/market-rates` GET | backend/src/modules/market-rates/market-rates.controller.ts |
| | refreshMarketRates | url `/cron/update-rates` POST | backend/src/modules/cron/cron.controller.ts |
| organizationsApi.ts (6) | getOrganizationPolicy, updateOrganizationPolicy, getTeamMembers, inviteTeamMember, updateTeamMemberRole, removeTeamMember | url (all 6) | backend/src/modules/organizations/organizations.controller.ts — see §8.4, **unused by any web/ UI** |
| profileApi.ts (2) | updateProfileName, updateProfileAvatar | action | profile/actions.ts |
| reportsApi.ts (1) | getReportsData | action | reports/actions.ts |
| settingsApi.ts (3) | getSettings, saveSettings, fetchLiveSpotRates | action | admin/settings/actions.ts |
| staffApi.ts (5) | getStaffList, createStaffUser, updateStaffStatus, updateStaffUser, deleteStaffUser | action | admin/staff/actions.ts |

Totals (independently re-tallied against each file): 40 endpoints; 9 target backend/ (customersApi ×1, marketRatesApi ×2, organizationsApi ×6); 31 are in-process Server Action calls. Of the 9 backend-targeting endpoints, only 3 have a confirmed UI caller: `searchCustomers` (via `useLazySearchCustomersQuery` in loans/new/page.tsx), and `getMarketRates`/`refreshMarketRates` (via live-market-ticker.tsx). The other 6 (all of organizationsApi.ts) are wired to a real, matching backend controller but have zero import sites anywhere in web/src's UI (confirmed by search for the slice name and every exported hook/type it defines).

Business domains with **no** backend/ counterpart at all — served entirely by web/'s own Server Actions + Prisma — include loans, payments, followups, dashboard, reports, settings, staff/admin, and profile. This confirms web/'s server-side business logic remains fully active, not legacy code shadowed by backend/.

### 8.2 axiosClient (web/src/lib/axiosClient.ts, 36 lines)

`API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api"` — always backend/'s NestJS API, never a route under web/src/app/api. `withCredentials: true`. A request interceptor reads `localStorage.getItem("access_token")` or `localStorage.getItem("better-auth.session_token")` and attaches it as `Authorization: Bearer` if present. **Confirmed dead**: a repo-wide search of every `localStorage.setItem` call in web/src finds exactly 3 sites (theme-provider.tsx → `"pawnify-theme"`, document-uploader.tsx → a per-widget draft cache, profile-client.tsx → `"pawnify_avatar_" + userId`) — none writes either of the two keys this interceptor reads, so the token-attachment branch is unreachable. In practice, any authenticated call from web/ to backend/ through axiosClient depends entirely on `withCredentials: true` forwarding the better-auth session cookie cross-origin. web/src/lib/auth.ts sets no `crossSubDomainCookies`/cookie-domain config, and backend/src/main.ts calls `app.enableCors()` with no options. **Unknown**: whether this cookie forwarding actually succeeds in any deployed environment — depends on deployment domain topology not present in this repo.

### 8.3 What backend/ actually authenticates against (backend/ fact, for contrast)

backend/'s `JwtAuthGuard` (backend/src/modules/auth/guards/jwt-auth.guard.ts) does not verify a self-signed JWT using backend/'s own `JWT_SECRET`. It extracts a token from an `Authorization: Bearer` header or, failing that, a cookie literally named `better-auth.session_token`, then (backend/src/modules/auth/auth.service.ts, backend/src/modules/auth/auth.repository.ts): first runs a raw SQL `SELECT … FROM "session" WHERE token=$1 AND "expiresAt">NOW()` (auth.repository.ts's `findSessionByToken`) via `SupabaseService.query()` (backend/src/database/supabase.service.ts) — a thin wrapper whose `query()` method runs that SQL on a plain `pg` `Pool` (`this.pool.query(sql, params)`, a `Pool` instantiated from the configured database URL) — directly against the same Postgres `session` table that web/'s better-auth Prisma adapter writes to (backend/prisma/schema.prisma models `user`/`session`/`account`/`verification` at the same structure as web/prisma/schema.prisma — the two schema files were found to list an identical set of models at identical line numbers); only if that misses does it fall back to verifying a genuine Supabase-issued JWT via `supabase.auth.getUser(token)`. A repo-wide search of backend/ for `JWT_SECRET` finds exactly one hit — its declaration in backend/.env.example — with zero usages in backend/src. **Conclusion**: backend/ trusts a live better-auth session token (read directly from the shared database via a raw `pg` Pool, not through Prisma or the Supabase client library) or, as an unreached fallback, a genuine Supabase Auth JWT — never an independently-signed token of its own, despite the guard's name.

### 8.4 organizationsApi.ts: unused on the frontend, and its backend controller has an authorization gap

organizationsApi.ts's 6 endpoints match backend/src/modules/organizations/organizations.controller.ts 1:1 but have zero callers anywhere in web/src's UI (confirmed by search for the slice, every hook it exports, `OrganizationPolicy`, and `TeamMember`). Separately, on the backend side: `OrganizationsController` is decorated only with `@UseGuards(RolesGuard)`, not `JwtAuthGuard`, and `JwtAuthGuard` is never registered globally in backend/src (only per-controller, on customers and storage, and per-route on auth). `RolesGuard.canActivate` (backend/src/modules/auth/guards/roles.guard.ts) reads `request.user`, which only `JwtAuthGuard` populates — so on this controller `request.user` is always `undefined`. As coded: `getPolicy`/`getMembers` (no `@Roles(...)`) hit `RolesGuard`'s no-required-roles early-return and execute with **no authentication check at all**; `updatePolicy`/`inviteMember`/`updateMemberRole`/`removeMember` (`@Roles('OWNER','ADMIN')`) always throw Unauthorized since `user` is always undefined. This is harmless today only because the frontend slice that would call these routes is unwired.

### 8.5 Adjacent finding: backend/'s market-rates service complexity, and an actively-duplicated implementation in web/

backend/src/modules/market-rates/market-rates.service.ts (205 lines, backend/ fact) is the largest `.service.ts` under backend/src/modules — roughly 3× the next largest (auth.service.ts, 67 lines) — mixing env-var defaults, a DB-cached settings read path, and a multi-provider external-HTTP fetch (goldprice.org, falling back to open.er-api.com + gold-api.com, then to cached DB values) with a troy-ounce-to-per-gram-INR unit conversion, all in one class. web/src/lib/services/market-rates.ts (215 lines, web/ fact) is a separate, parallel implementation with an overlapping field set, the same DB-settings-key scheme, and the same 31.1034768 troy-ounce conversion constant — the two have not been consolidated as part of the backend/ migration.

This duplication is not merely a dead leftover — both copies have live, independent UI triggers. web/'s read function (`getMarketRates`) is wrapped by the `"use server"` action `getMarketRatesAction` (web/src/lib/actions/market-rates-actions.ts), which does have zero import sites anywhere in web/src (confirmed by search) and is genuinely dead. But web/'s write/refresh function, `fetchAndSaveLiveMetalRates` (same file), is dynamically imported and called by `fetchLiveSpotRatesAction` (web/src/app/(app)/admin/settings/actions.ts, gated by `checkAuth()` plus an explicit `role !== "ADMIN"` check) — which backs `useFetchLiveSpotRatesMutation`, actively wired to a live "⚡ Fetch Spot Rate Now" button in settings-client.tsx (hook call at line 42, invocation at line 60, button label at line 171). So there are two separate, independently-triggerable "refresh live metal rates" features in the running app: live-market-ticker.tsx's "Refresh Spot" button calls backend/'s `/cron/update-rates` endpoint (§8.1, running backend's copy of this logic), while admin/settings's "Fetch Spot Rate Now" button runs web/'s own copy of essentially the same external-API-fetch logic — both hitting the same external APIs and writing the same `AppSetting` DB keys (`rate.gold.per_gram`, etc.) in what is structurally the same Postgres schema (§8.3). Two independent, live code paths can race to overwrite the same cached settings.

## 9. Forms and Validation

Zod (`^4.4.3`, web/package.json) schemas are the server-enforced source of truth, defined in web/src/lib/validation/:

| Schema | File | Key rules |
|---|---|---|
| `customerCreateSchema` | customer.ts | `fullName` 2–100 chars; `phone` regex `^[6-9]\d{9}$` (Indian mobile); `pincode` regex `^\d{6}$`; `email`/`dob`/`addressLine2`/`photoUrl` optional |
| `kycDocumentSchema` | customer.ts | `docType: z.enum(["AADHAAR","PAN","VOTER_ID","PASSPORT","DRIVING_LICENSE"])`, `.superRefine` applying a format regex per type (e.g. PAN `^[A-Z]{5}[0-9]{4}[A-Z]$`, Aadhaar `^\d{12}$`) |
| `loanItemSchema` | loan.ts | `metalType: z.enum(["GOLD","SILVER"])`; numeric coercions with `.gt(0)`/`.lte(100)` bounds; `.refine` enforcing `stoneWeightGrams < grossWeightGrams` |
| `createLoanSchema` | loan.ts | `tenureMonths` 1–12 ("RBI cap" per comment); `interestRateMonthly` ≤10%/month; `gracePeriodDays` ≤90, default 7 |
| `paymentSchema` | payment.ts | `mode: z.enum(["CASH","UPI","BANK_TRANSFER","CARD"])`; `amountPaid` > 0 |

`maskDocNumber()` (customer.ts) redacts all but the last 4 characters of a document number for every UI display surface.

**No form library is used** — no `react-hook-form`, no `zodResolver`, confirmed by repo-wide search. Every form is plain controlled React state: a single `useState(() => ({ field: "", … }))` object plus a `handleChange` reading `e.target.name`/`.value`, submitted via a `handleSubmit` that calls the corresponding RTK Query mutation hook (verified directly in customers/new/page.tsx, (auth)/login/page.tsx). Client-side pre-validation is minimal and ad hoc — e.g. customers/new/page.tsx re-implements the same Indian-mobile regex (`/^[6-9]\d{9}$/`) inline before calling `createCustomer(formData)`, duplicating (not importing) the check already in `customerCreateSchema`. Every Server Action re-validates with `schema.safeParse(formData)` before touching the database and returns `{ success: false, error: parsed.error.issues[0]?.message }` on failure (verified in customers/new/actions.ts) — this is the only validation path RTK Query's `hybridAxiosBaseQuery` treats as authoritative (§7).

**Confirmed schema-vs-frontend drift** (a third instance of the code/spec drift pattern .agents/lessons.md already documents two of — that file is at the repository root, not under web/): web/prisma/schema.prisma models KYC documents with **both** a fixed `KycDocType` enum (`AADHAAR | PAN | VOTER_ID | PASSPORT | DRIVING_LICENSE | CUSTOM`, schema.prisma line 50) **and** an optional `documentTypeId` foreign key to a configurable `DocumentType` model (schema.prisma line 147, matching the "configurable DocumentType model" described in .agents/schema.md as the target design). The frontend's `kycDocumentSchema` (web/src/lib/validation/customer.ts) validates only against the fixed 5-value enum and never references `documentTypeId` or `DocumentType` — a repo-wide search of web/src finds **zero** references to `DocumentType` anywhere outside the Prisma schema itself. The database is schema-ready for the configurable model; the frontend (and, by extension, every KYC form built on this schema) still hardcodes the India-specific fixed list.

## 10. Authentication

### 10.1 Library — confirmed better-auth, not Supabase Auth

web/src/lib/auth.ts instantiates `betterAuth({ database: prismaAdapter(prisma, { provider: "postgresql" }), … })` — a full server-side better-auth instance backed directly by web/'s own Prisma client (web/src/lib/db.ts) against Postgres, with no dependency on backend/. Configuration: `emailAndPassword.enabled: true`; `session: { expiresIn: 86400 (24h), updateAge: 3600 (1h) }`; `trustedOrigins` includes `NEXT_PUBLIC_APP_URL`, a hardcoded `https://pawnify-three.vercel.app`, and `VERCEL_URL` if set. Custom `user.additionalFields`: `role` (`input: false`, default `"STAFF"` — never settable from a client sign-up payload) and `isActive` (`input: false`, default `true`) — staff accounts can only be provisioned via the admin-gated `createStaffUserAction`; `phone` (`input: true`).

web/src/app/api/auth/[...all]/route.ts mounts it via `toNextJsHandler(auth)` (better-auth/next-js), the canonical catch-all integration (§3.5). A repo-wide search for `.auth.signInWithPassword`/`.signUp`/`.signIn`/`.getUser`/`.getSession`/`.onAuthStateChange`/`.admin` across web/src returns zero matches — Supabase Auth (GoTrue) is never used for sign-in anywhere in web/.

### 10.2 Server-side session helpers (web/src/lib/auth/session.ts)

| Function | Behavior |
|---|---|
| `getSession()` | `auth.api.getSession({ headers: await headers() })` — reads the incoming request's cookies in-process via better-auth's own session lookup; no network call |
| `requireSession()` | Wraps `getSession()`; `redirect("/login")` if no session; `redirect("/login?error=unauthorized_role")` if `!user.role \|\| !user.isActive` |
| `requireAdmin()` | Wraps `requireSession()`; `redirect("/login?error=unauthorized_admin")` if `role !== "ADMIN"`. **Zero call sites anywhere in web/src** (confirmed by search) — dead code, superseded in practice by the duplicated inline check in admin/settings/page.tsx and admin/staff/page.tsx (§3.4) |
| `checkAuth()` | Non-redirecting variant for Server Actions; returns `{ authenticated: false, error }` instead of redirecting |
| `checkAdmin()` | Non-redirecting ADMIN check; wraps `checkAuth()` |

Every `"use server"` action backing an `action:`-targeted RTK Query endpoint (§8.1) opens by calling `checkAuth()` or `checkAdmin()` (verified in customers/new/actions.ts).

### 10.3 Client-side (web/src/lib/auth-client.ts)

`createAuthClient({ baseURL: typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL })` — always talks to the same Next.js app's own `/api/auth/*` routes, never backend/. Exports `signIn`, `signOut`, `signUp`, `useSession`. `authClient.signIn.email(...)` is called from (auth)/login/page.tsx (§3.3); `authClient.signOut()` is called from sidebar.tsx's `handleLogout` (followed by `router.push("/login"); router.refresh();`).

### 10.4 backend/'s consumption of this session (backend/ fact, restated from §8.3 for completeness)

backend/'s `JwtAuthGuard` authenticates by reading a better-auth session token (bearer header or `better-auth.session_token` cookie) and looking it up directly against the shared Postgres `session` table via raw SQL — not by verifying anything with its own `JWT_SECRET` (unused in code) — falling back to a genuine Supabase JWT only if no session row matches (a path never exercised by web/, since web/ never performs a Supabase Auth sign-in). See §8.3 for full detail and file citations.

## 11. Responsive and Mobile Behavior

No component-level responsive variants exist beyond Tailwind utility breakpoints (no separate mobile-only component files, no matchMedia/useMediaQuery hook found anywhere in web/src). Patterns observed directly in source:

- **Primary app-shell breakpoint is `lg` (1024px)**, not `md`. web/src/components/sidebar.tsx: a `lg:hidden` fixed hamburger button (top-left) toggles a `lg:hidden fixed … w-72` slide-in drawer (`translate-x-0` / `-translate-x-full` via a `mobileOpen` boolean), rendered alongside a `hidden lg:block w-64 h-screen sticky` desktop sidebar — both instantiated from the same internal `NavContent` sub-component to avoid duplicating nav-item JSX. A `lg:hidden fixed inset-0 z-40` overlay closes the drawer on click-outside.
- The (app) layout's main content area applies `p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8` (web/src/app/(app)/layout.tsx) — extra top padding on mobile/tablet clears the fixed hamburger button; it disappears once the `lg:` desktop sidebar takes over.
- (auth)/login/page.tsx: a `hidden lg:flex lg:w-1/2` dark editorial panel is hidden entirely below `lg`, leaving a `w-full lg:w-1/2` form panel that expands to fill the viewport; a separate `lg:hidden` mobile brand header substitutes for the hidden panel's branding.
- Form grids collapse from 2 columns to 1 below `sm` (640px) throughout, e.g. `grid grid-cols-1 sm:grid-cols-2 gap-6` in customers/new/page.tsx.
- Card padding: `.glass-card p-6 sm:p-8` (customers/new/page.tsx) and the `.kpi-card` CSS-level `@media (max-width: 768px) { padding: 1rem; }` override (web/src/app/globals.css, §4.4) are the only two viewport-driven padding changes found.
- `web/src/app/layout.tsx` sets `viewport: { width: "device-width", initialScale: 1, maximumScale: 5, themeColor: [...] }` — pinch-zoom is capped at 5×, not disabled.
- A web app manifest exists (`manifest: "/site.webmanifest"`, referenced from web/src/app/layout.tsx) providing icons only; there is no service worker, no offline support, and no separate PWA/mobile-app shell found in web/src.

## 12. Consolidated Known-Issue Index

For quick scanning by future agents — all previously detailed in the relevant section above; file:line references repeated here for convenience.

| # | Issue | File(s) | Section |
|---|---|---|---|
| 1 | `next` pinned/installed at 9.3.3 (pre-App-Router) alongside React 19.2.4 and an App-Router/Server-Action/Promise-params codebase; contradicts ARCHITECTURE.md's "Next.js 16" claim (and web/README.md's "Next.js 15" claim) | web/package.json, web/package-lock.json, ARCHITECTURE.md (repo root), web/README.md | §2 |
| 2 | web/src/proxy.ts is shaped like Middleware but is not named middleware.ts; execution status Unknown | web/src/proxy.ts | §3.6 |
| 3 | vercel.json cron path `/api/cron/update-rates` has no matching route in web/; closest match is backend/'s `@Get`/`@Post('update-rates')` | web/vercel.json, backend/src/modules/cron/cron.controller.ts | §3.6 |
| 4 | admin/settings and admin/staff duplicate an ADMIN-redirect check instead of calling the existing (unused) `requireAdmin()` | admin/settings/page.tsx, admin/staff/page.tsx, lib/auth/session.ts | §3.4, §10.2 |
| 5 | /platform-admin's page has no role check beyond the shared (app) layout gate — any authenticated STAFF or ADMIN can view all-tenant billing/loan/branch data. Its mutation (`changeOrganizationPlanAction`) is narrower but not fully closed: it requires DB-role===ADMIN only when the undocumented `PLATFORM_ADMIN_EMAIL` env var is set; if that var is unset in a given deployment, the mutation is equally open to any authenticated STAFF | app/(app)/platform-admin/page.tsx, app/(app)/platform-admin/actions.ts | §3.4 |
| 6 | `EditStaffUserModal` is a dead-code near-duplicate of the live `EditModalContent`, with already-drifted copy | admin/staff/staff-client.tsx (lines 182–329, 608–739) | §5.4 |
| 7 | `document-uploader.tsx` references an unimported bare `axios` identifier in its upload catch block — ReferenceError on real upload failure | components/document-uploader.tsx | §5.4 |
| 8 | `interactive-ltv-calculator.tsx` is unreachable dead code, duplicating LTV tiers in floating point — and it is the sole owner of the `id="calculator"` DOM anchor that navbar.tsx's "Live Calculator" link and landing-hero.tsx's "Test Real-Time Simulator" button both target, making those two links broken on the live site | components/marketing/interactive-ltv-calculator.tsx, components/marketing/navbar.tsx, components/marketing/landing-hero.tsx, lib/services/valuation.ts | §5.2 |
| 9 | `organizationsApi.ts` tags `"StaffList"`, never declared in baseApi.ts's `tagTypes` | lib/redux/api/organizationsApi.ts, lib/redux/api/baseApi.ts | §7 |
| 10 | `organizationsApi.ts` has zero UI callers; its matching backend controller has an authorization gap (unauthenticated read, always-401 write) | lib/redux/api/organizationsApi.ts, backend/src/modules/organizations/organizations.controller.ts | §8.4 |
| 11 | axiosClient's token-injection interceptor reads localStorage keys that are never written anywhere | lib/axiosClient.ts | §8.2 |
| 12 | KYC form/validation hardcodes a fixed 5-value enum even though the DB schema already supports a configurable `DocumentType` model | lib/validation/customer.ts, prisma/schema.prisma | §9 |
| 13 | Backend and frontend each maintain a separate market-rates implementation, and unlike a mere inert leftover, both have live, independently-triggerable UI callers that write the same AppSetting keys — live-market-ticker.tsx's refresh button hits backend/'s endpoint while admin/settings's "Fetch Spot Rate Now" button runs web/'s own copy of the same fetch logic | lib/services/market-rates.ts, lib/actions/market-rates-actions.ts, app/(app)/admin/settings/actions.ts, app/(app)/admin/settings/settings-client.tsx, components/live-market-ticker.tsx, backend/src/modules/market-rates/market-rates.service.ts | §8.5 |
| 14 | Several unused imports (`Scale` in sidebar.tsx; `ShieldAlert`/`Database`/`Server` in features-section.tsx; `WORLDWIDE_JURISDICTIONS` in universal-asset-calculator.tsx; `asChild` prop never implemented in ui/button.tsx) | components/sidebar.tsx, components/marketing/features-section.tsx, components/marketing/universal-asset-calculator.tsx, components/ui/button.tsx | §4.2, §5.1, §5.2 |
| 15 | `.modal-backdrop` / `.dialog-overlay` CSS classes are defined (with `html.dark` overrides) but never applied anywhere in the codebase — the Radix dialog primitives use an inline Tailwind string instead | app/globals.css (lines 528–540), components/ui/dialog.tsx, components/ui/alert-dialog.tsx | §4.4 |