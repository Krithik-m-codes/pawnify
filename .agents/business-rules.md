# Pawnify Business Rules

## Scope, Subsystems, and Method

Pawnify is a multi-tenant pawn/asset-backed lending platform. The repository is mid-migration between two independent npm projects with no shared tooling (no turbo/nx/pnpm-workspace):

- **web/** — mature Next.js App Router application (Prisma ORM, PostgreSQL/Supabase, better-auth, Redux Toolkit Query). Owns essentially all business logic currently in production use: loans, payments, customers/KYC, valuation, interest, billing quotas, follow-ups, staff management, settings, dashboard. The source tree is written throughout for the Next.js App Router — route groups such as `src/app/(app)/...`, the `page.tsx`/`layout.tsx`/`actions.ts` file conventions used across every feature area, and next-env.d.ts's reference to generated `.next/types/routes.d.ts` typed routes — and `devDependencies.eslint-config-next` is pinned to `^16.2.10`. However, `dependencies.next` is pinned to `^9.3.3` (web/package.json), and web/package-lock.json's resolved `node_modules/next` entry plus web/node_modules/next/package.json both confirm that version `9.3.3` — a pre-App-Router release from 2020 ("zeit/next.js") — is what actually resolves and is installed. This is a real inconsistency in the committed dependency graph, confirmed by direct inspection, not a stale doc claim; which Next.js major version the application is actually meant to run on is **Unknown** from source alone.
- **backend/** — new, partial NestJS API. Exactly 8 module directories exist (auth, cron, customers, health, market-rates, organizations, storage, webhooks) — one more than the "7 modules" framing commonly used to describe it (backend/src/modules, backend/src/app.module.ts). It does not replace web/'s business logic; it is thin, additive, parallel surface area against the same database (backend/prisma/schema.prisma and web/prisma/schema.prisma are byte-identical, confirmed via diff).

The two subsystems are not actually wired together by docker-compose.yml. Its only application service (`app`) builds from `context: .` (repository root) with `dockerfile: Dockerfile` and mounts `./sql/rls_policies.sql` at container init — but no root-level Dockerfile and no root-level sql/ directory exist anywhere in the repository (only web/Dockerfile and backend/sql/rls_policies.sql do), and the `app` service's environment variables (`NEXT_PUBLIC_DEMO_MODE`, `APP_URL`) are web/-specific, with no backend/ service defined at all (docker-compose.yml). As committed, docker-compose.yml does not resolve to a working build and never runs backend/ — the two subsystems are joined only by convention (a shared, byte-identical Prisma schema) and by the one-way, currently-unused RTK Query bridge described in §1.6.

Every rule below is tagged **[web]**, **[backend]**, or **[both]** to state explicitly which subsystem enforces it, per source file. Facts were verified by direct reading of the cited files in this session; the backend-cannot-start claim in §11.1 was additionally verified by directly building and executing the code in this session, not merely reading it. A smaller number of granular details (exact backend module route lists, some test-assertion numbers) are carried from prior structured recon and cited the same way — nothing here is invented. Where the pre-restructure notes in .agents/*.md conflict with current code, current code is stated as authoritative and the conflict is flagged inline (per project convention). Where a rule cannot be confirmed from source, it is marked **Unknown**.

---

## 1. Multi-Tenancy Rules

### 1.1 Tenancy data model **[both]**
`Organization` is the tenant root; `Branch`, `Customer`, `Loan`, `LoanItem`, `LoanCharge`, `Payment`, `LedgerEntry`, `FollowUp`, `KycDocument`, `DocumentType`, and `LoanPolicy` all carry a direct `organizationId` foreign key, and `user` carries `organizationId`/`branchId` (web/prisma/schema.prisma, identical in backend/prisma/schema.prisma).

### 1.2 Intended enforcement mechanism (Postgres RLS) is defined but not wired into the live query path **[web]**
- `backend/sql/rls_policies.sql` enables `ROW LEVEL SECURITY` (not `FORCE ROW LEVEL SECURITY`) on 12 tenant tables and defines `current_user_organization_id()`, which resolves to `current_setting('app.current_organization_id', true)` if set, else falls back to `(SELECT organizationId FROM user WHERE id = auth.uid())` (backend/sql/rls_policies.sql).
- Two intended entry points exist to make that function resolve correctly: `createTenantSupabaseClient` (a Supabase client carrying a user JWT, so `auth.uid()` resolves via PostgREST) and `runWithTenantContext` (which runs `SELECT set_config('app.current_organization_id', $1, true)` inside a Prisma transaction) (web/src/lib/supabase/server.ts).
- A repository-wide search found **zero call sites** for `createTenantSupabaseClient`, `createAdminSupabaseClient`, or `runWithTenantContext` anywhere else in web/src. Both intended entry points into the RLS session-variable mechanism are unused/dead code.
- The actual database connection used by every service file (web/src/lib/db.ts) is a plain `pg.Pool` wrapped by `PrismaPg`, constructed once from a static `DATABASE_URL` connection string, with no per-request `SET`/`set_config` call anywhere in that file (web/src/lib/db.ts).
- Net effect: for any query issued through the shared `prisma` client — i.e., all service-layer queries reviewed — `current_user_organization_id()` cannot resolve to a meaningful value via either of its two designed paths. Whether RLS is additionally bypassed outright (e.g., the `DATABASE_URL` role being the table owner/superuser, which Postgres exempts from `ENABLE ROW LEVEL SECURITY`) is **Unknown** — not verifiable from source. Either way, RLS is not the operative tenant-isolation mechanism for this code path today; isolation depends entirely on each query's own `WHERE organizationId = …` clause.

### 1.3 Write paths that correctly stamp `organizationId` **[web/both]**
- `createCustomer` propagates a caller-supplied `organizationId` onto the `Customer` row and any nested `KycDocument` rows (web/src/lib/services/customers.ts).
- `createLoan` propagates `organizationId` onto the `Loan`, every `LoanItem`, the optional `LoanCharge`, and the `DISBURSEMENT` `LedgerEntry` (web/src/lib/services/loans.ts).
- `recordPayment` propagates `loan.organizationId` (read from the fetched loan, not re-verified) onto the created `Payment` and `PAYMENT` `LedgerEntry` (web/src/lib/services/payments.ts).
- `checkCanCreateLoan`/`checkCanCreateBranch` (web/src/lib/services/billing.ts) and `getLtvSlabs`/`checkPanRequired` (web/src/lib/services/valuation.ts; web/src/lib/services/customers.ts) all filter by an explicit `organizationId` parameter when one is supplied.
- backend's `updateMemberRole` and `removeTeamMember` correctly scope their `updateMany` by `{ id: userId, organizationId }` (backend/src/modules/organizations/organizations.repository.ts). Note `removeTeamMember` is a soft-remove (`organizationId: null, isActive: false`), not a row deletion.

### 1.4 Read/lookup paths with no `organizationId` scoping at all **[web]**
The following functions run their Prisma queries with no `organizationId` filter anywhere in the `where` clause, confirmed by direct reading:
- `getLoanById`, `getLoans`, `closeLoan`, `releaseItems` — all look up a `Loan` by bare `id` only (web/src/lib/services/loans.ts).
- `getCustomers`, `getCustomerById`, `searchCustomers`, `updateKycStatus` — all query `Customer`/`KycDocument` with no organization filter (web/src/lib/services/customers.ts).
- `previewPaymentAllocation`, and `recordPayment`'s own loan lookup — fetch the `Loan` by bare `id` before allocating a payment against it (web/src/lib/services/payments.ts).
- `getDashboardStats` and `getDashboardChartData` — every query (`loan.findMany`, `loan.aggregate`, `customer.count`, `payment.aggregate`, `payment.findMany`, `followUp.count`) runs with no organization filter; KPIs (AUM, overdue amount, LTV average, disbursed/collected trends, gold-vs-silver breakdown) are computed across **every organization in the deployment**, not the caller's own (web/src/lib/services/dashboard.ts). Some of these queries (e.g. `recentLoans`, the chart-data `loan.findMany`/`payment.findMany`) have no `where` clause at all.
- `getFollowUpsAction`'s two queries (`followUp.findMany`, and the `loan.findMany` used to build the "assign to an active loan" dropdown) have no organization filter (web/src/app/(app)/followups/actions.ts).
- `getStaffListAction` (`prisma.user.findMany()`) and every other function in the staff-management action file query/mutate `user` rows by bare `id` with no `organizationId` check (web/src/app/(app)/admin/staff/actions.ts).
- At the Server Action layer, `checkAuth()`/`checkAdmin()` (web/src/lib/auth/session.ts) verify only that a session exists, has a role, and `isActive === true` — they never compare a record's `organizationId` to the caller's. This is structural: `SessionUser` (the type returned by `getSession`/`checkAuth`) exposes only `id, name, email, role, phone, isActive` — it has **no `organizationId` field at all** — so no action built on it can perform an org-membership check without an extra, currently-absent query (web/src/lib/auth/session.ts).
- `createLoanAction` derives the new loan's `organizationId` from the **submitted customer record's** organization (`cust.organizationId`, looked up by `customerId` with no ownership check), not from the caller's own session (web/src/app/(app)/loans/new/actions.ts).
- `saveLoanPolicyAction` (the onboarding LoanPolicy writer) has **no authentication check of any kind** — no `checkAuth`/`checkAdmin` call — and when no `organizationId` is supplied, silently targets `prisma.organization.findFirst()`, i.e. an arbitrary organization (web/src/app/(app)/onboarding/actions.ts).
- No `middleware.ts` exists anywhere in web/ (neither web/middleware.ts nor web/src/middleware.ts) that could impose a higher-level org-scoping check outside these individual functions.

**Rule as actually enforced today: in every one of the above web/ code paths, no organization-boundary rule is implemented** — any authenticated user (any role, any organization) can read or mutate any loan, customer, KYC document, follow-up, or staff account in the deployment by ID, and dashboard/list views are computed globally rather than per-tenant. This directly conflicts with the pre-restructure notes' "Load-Bearing RLS" / tenant-CRUD-via-Supabase-client description (.agents/context.md; .agents/lessons.md) — current code does not implement that description for this code path.

### 1.5 backend/ tenant-isolation defects **[backend]**
- `CustomersRepository.searchCustomers` runs `customer.findMany` with no `organizationId` filter — any authenticated caller (any organization) can search customers across every tenant via `GET /api/customers/search` (backend/src/modules/customers/customers.repository.ts; route prefix confirmed via backend/src/main.ts's `app.setGlobalPrefix(apiPrefix)`, default `api`). `AuthUserDto`, the type of `request.user`, has no `organizationId` field either (backend/src/modules/auth/dto/auth-user.dto.ts), so this cannot currently be fixed by simply reading the caller's own org off the request.
- `OrganizationsController` applies only `@UseGuards(RolesGuard)` — it never applies `JwtAuthGuard` (backend/src/modules/organizations/organizations.controller.ts). `RolesGuard.canActivate` returns `true` immediately whenever a route carries no `@Roles()` metadata (backend/src/modules/auth/guards/roles.guard.ts), and `request.user` is populated **only** inside `JwtAuthGuard` (backend/src/modules/auth/guards/jwt-auth.guard.ts) — confirmed by a repository-wide search for `request.user =` assignments, which found exactly one call site. There is also no global `APP_GUARD`/`useGlobalGuards` registration anywhere in backend/src that could populate `request.user` ahead of `RolesGuard`. Consequence: `GET :orgId/policy` and `GET :orgId/members` (no `@Roles()`) are fully unauthenticated — any request, with no token, can read another organization's LTV/interest/grace-period policy and its staff roster (name, email, phone, role, isActive). The four `@Roles('OWNER','ADMIN')`-guarded write routes (policy update, invite, role change, remove) always throw 401 (`request.user` is always `undefined` for this controller), so they cannot currently be exercised by any caller.
- Even disregarding the guard bug, no code anywhere in `OrganizationsController`/`OrganizationsService`/`OrganizationsRepository` checks that the caller belongs to the `:orgId` in the URL — the raw path parameter is used directly (backend/src/modules/organizations/organizations.controller.ts; organizations.repository.ts).
- `addTeamMember` calls `user.upsert({ where: { email: dto.email }, update: { organizationId, role, branchId, isActive: true } })` (backend/src/modules/organizations/organizations.repository.ts). Since `user.email` is globally unique with no per-organization compound key (backend/prisma/schema.prisma), inviting an email that already belongs to a user in a **different** organization silently reassigns that user's `organizationId`/role/branch to the inviting org, with no ownership check or confirmation step.

### 1.6 Confirmed-unused bridge between subsystems **[both]**
`web/src/lib/redux/api/organizationsApi.ts` is an RTK Query slice whose endpoints (`getOrganizationPolicy`, `updateOrganizationPolicy`, `getTeamMembers`, `inviteTeamMember`, `updateTeamMemberRole`, `removeTeamMember`) target exactly backend/'s organizations routes (`/organizations/:orgId/policy`, `/organizations/:orgId/members`, etc. — confirmed to match backend/src/modules/organizations/organizations.controller.ts's route params one-for-one). A repository-wide search for each of its six exported hooks (`useGetOrganizationPolicyQuery`, etc.) found no caller anywhere else in web/src — this is the one place web/ is wired to consume backend/'s API, and it is currently unused by any page or component.

---

## 2. Loan Creation & Mandatory-ID/KYC Rules **[web]**

### 2.1 Creation-time gate order (`createLoan`, web/src/lib/services/loans.ts)
1. **Billing quota** — `checkCanCreateLoan(organizationId)` throws before any transaction opens if the plan's active-loan quota is already met (see §7).
2. **Mandatory primary-ID check** — `checkPanRequired` is evaluated; if `required && !hasPan`, throws "Mandatory Identity Document required: Total customer loan exposure reaches/exceeds threshold (…)" before the transaction opens.
3. Inside one `runSerializable` Serializable-isolation transaction (web/src/lib/db.ts):
   - Every submitted item's valuation is **recomputed server-side** via `computeItemValuation` — client-submitted `assessedValue`/`netWeight`/`fineWeight` are never trusted (source comment cites "Non-Negotiable #5").
   - Assessed values are summed; tiered LTV is resolved (`getLtvSlabs`) and the eligible amount computed; `principalAmount > eligibleAmount` throws, and `principalAmount <= 0` throws "Principal amount must be positive."
   - `dueDate = addMonths(loanDate, tenureMonths)`.
   - Loan number is generated (§2.4), the `Loan` + `LoanItem` rows are created, an optional `PROCESSING_FEE` `LoanCharge` is created if `processingFee > 0`, and a `DISBURSEMENT` `LedgerEntry` is written.

The Zod-layer bounds on `tenureMonths` (1–12), `interestRateMonthly` (>0–≤10), and `gracePeriodDays` (0–90) (web/src/lib/validation/loan.ts, see §3.4) are **not re-checked inside `createLoan` itself** — they are enforced only by the calling Server Action's `createLoanSchema.safeParse` (web/src/app/(app)/loans/new/actions.ts). Any other caller of `createLoan` that bypasses that Server Action would not have these bounds enforced. That same Server Action also derives the loan's `organizationId` from the submitted customer's own record (§1.4), not from the caller's session.

### 2.2 Mandatory primary-ID (PAN) threshold (`checkPanRequired`, web/src/lib/services/customers.ts)
- Defaults: threshold `50000`, primary-doc-name list `["PAN"]`.
- If `organizationId` is supplied: the org's `LoanPolicy.mandatoryIdThreshold` overrides the threshold (a non-null `Decimal(12,2)` column defaulting to `0`, documented "0 = disabled" — web/prisma/schema.prisma), and any `DocumentType` rows with `isPrimaryId: true` for that org **replace** (not merge with) the default name list.
- Without `organizationId`, the threshold instead comes from a global `AppSetting` key `pan.threshold`.
- `totalAmount` = sum of the customer's ACTIVE-loan `principalAmount` + the proposed new principal. **`required = threshold > 0 && totalAmount >= threshold`** — this final boolean, not the earlier truthy check on the always-truthy `Decimal` object (`if (policy && policy.mandatoryIdThreshold)`), is what actually implements "0 = disabled."
- `hasPan` is true if any KYC document has `docType === "PAN"`, OR a linked custom `DocumentType` has `isPrimaryId: true`, OR the primary-doc-name list includes the document's `docNumber` uppercased, OR includes `docType.toString()`. The third condition compares a document **number** against a list of document **type** names and is unlikely to ever match in practice — a probable bug, not a functioning fourth match path.
- `createLoan` throws if `required && !hasPan`; the same function is also called read-only from customer-detail UI purely to display PAN status.

### 2.3 KYC document format validation (`kycDocumentSchema`, web/src/lib/validation/customer.ts)
Restricted to 5 of the Prisma `KycDocType` enum's 6 values (`AADHAAR, PAN, VOTER_ID, PASSPORT, DRIVING_LICENSE` — the file's header comment calls these schemas collectively "the source of truth for validation"). Per-type `docNumber` regex, enforced via `superRefine`:
- `PAN`: `^[A-Z]{5}[0-9]{4}[A-Z]$` (e.g. ABCDE1234F)
- `AADHAAR`: exactly 12 digits
- `VOTER_ID`: `^[A-Z]{3}\d{7}$`
- `PASSPORT`: `^[A-Z]\d{7}$` (Indian passport format specifically)
- `DRIVING_LICENSE`: no regex, minimum length 10

The 6th Prisma enum value, `CUSTOM` (web/prisma/schema.prisma) — presumably meant to pair with the per-organization `DocumentType` model — **cannot pass this schema**, since `docType` is a closed 5-value `z.enum`. `customerCreateSchema` additionally requires an Indian mobile phone (`^[6-9]\d{9}$`) and a 6-digit pincode (web/src/lib/validation/customer.ts). `maskDocNumber` returns a document number unchanged if ≤4 characters, else masks all but the last 4 with `•`.

### 2.4 Loan numbering
`generateLoanNumber` (inside `createLoan`'s transaction) produces `PL-{4-digit year}-{6-digit zero-padded sequence}`, where the sequence is `(count of that org's loans whose loanNumber starts with PL-{year}) + 1` (web/src/lib/services/loans.ts). This count-then-format scheme has no unique-sequence column backing it — collision avoidance depends entirely on `createLoan` running inside `runSerializable`'s Serializable isolation (web/src/lib/db.ts), which causes Postgres to abort one of two concurrent conflicting transactions (`P2034`) for retry rather than allow a duplicate. (A `Loan` unique constraint on `[organizationId, loanNumber]` also exists at the schema level as a backstop — web/prisma/schema.prisma.)

---

## 3. LTV & Valuation Rules **[web]** (web/src/lib/services/valuation.ts)

### 3.1 Item valuation pipeline
- `computeNetWeight(gross, stone) = gross − stone`; throws "Net weight cannot be negative: stone weight exceeds gross weight" if negative (tolerates net weight of exactly 0, i.e. `stone === gross`).
- `computeFineWeight(net, purityPercent) = net × purityPercent / 100`.
- `computeAssessedValue(fine, ratePerGram) = round(fine × ratePerGram, 2)` — rate is documented as always being for pure (999) metal.
- `computeItemValuation` chains all three, converting weights to grams first via `convertToGrams`.
Corroborated by web/src/__tests__/valuation.test.ts (net-weight, fine-weight, and assessed-value unit assertions match these formulas exactly).

### 3.2 Weight-unit and purity conversions exist but are unreachable from loan creation
- `convertToGrams(weight, unit)`: `TROY_OUNCE` × `31.1034768`; `TOLA` × `11.6638038` ("Standard South Asian / Middle Eastern 3/8 oz tola"); `GRAM` (default) passes through — all rounded to 4 decimal places.
- `normalizePurityPercent(value, expression)`: `KARAT` → `value/24 × 100`; `MILLESIMAL_FINENESS` → `value/10`; `PERCENTAGE` (default) passes through.
- Neither `LoanItemInput` (web/src/lib/services/loans.ts) nor `loanItemSchema` (web/src/lib/validation/loan.ts) carries a `weightUnit` or purity-expression field — `createLoan` always calls `computeItemValuation` with the `GRAM` default, and `normalizePurityPercent` has **no call site anywhere in web/src**, including inside `computeItemValuation` itself (which consumes `purityPercent` as an already-normalized raw value). Troy-ounce/tola conversion and karat/fineness normalization are only reachable by calling the exported functions directly (as web/src/__tests__/jurisdiction.test.ts does, passing `weightUnit` straight into `computeItemValuation`) — not through the loan-creation path. Whether any UI form pre-converts these client-side before submission is **Unknown**.

### 3.3 Tiered LTV resolution and eligible-amount cap
`getLtvSlabs(organizationId?)` resolves in priority order:
1. Org's `LoanPolicy.ltvTiers` JSON array, if non-empty (a tier's `maxValue: null` or the string `"Infinity"` marks the open-ended top tier).
2. Else, if all five `AppSetting` keys `ltv.tier1.max`, `ltv.tier1.percent`, `ltv.tier2.max`, `ltv.tier2.percent`, `ltv.tier3.percent` are present and non-empty, a 3-tier table is built from them (a partially-configured set falls through entirely to the default rather than partial-applying).
3. Else `DEFAULT_LTV_SLABS`: assessed value ≤ 250,000 → 85% LTV; ≤ 500,000 → 80%; above (Infinity ceiling) → 75%.

`getLtvPercent` returns the first slab (in array order) whose `maxValue >= assessedValue` — it depends on tiers being supplied in ascending order and does not sort them itself. `computeEligibleAmount = totalAssessedValue × ltvPercent / 100`, rounded to 2 decimal places. `createLoan` throws if `principalAmount > eligibleAmount`. Corroborated by web/src/__tests__/valuation.test.ts (200,000→85%/170,000; 400,000→80%/320,000; 1,000,000→75%/750,000) and web/src/__tests__/jurisdiction.test.ts (despite its filename, this file tests `computeItemValuation`'s troy-ounce/tola conversions and interest.ts's day-count branching, not the jurisdiction config registry — see §10.4 for the file that actually does).

### 3.4 Loan/item numeric caps at the Zod validation layer (web/src/lib/validation/loan.ts)
`loanItemSchema`: `metalType` restricted to `GOLD`/`SILVER` only (matches the Prisma `MetalType` enum, which has no other values); `purityPercent` >0–≤100; `grossWeightGrams` >0; `stoneWeightGrams` ≥0 (default 0), and cross-field-refined to be strictly less than `grossWeightGrams` (stricter than `computeNetWeight`, which tolerates equality). `createLoanSchema`: `tenureMonths` integer 1–12 ("RBI cap" in the error message, referencing the Reserve Bank of India's gold-loan tenure ceiling); `interestRateMonthly` >0–≤10 ("cannot exceed 10% per month"); `gracePeriodDays` integer 0–90, default 7. The 10%/90-day bounds are independently re-checked (not reused) with identical numeric limits in the admin settings action (web/src/app/(app)/admin/settings/actions.ts), so the two enforcement points currently agree but are not unified.

---

## 4. Interest Accrual Rules (Day-Count Conventions) **[web]** (web/src/lib/services/interest.ts)

### 4.1 Formulas
- `computeDailyInterest(principalOutstanding, monthlyRate, dayCountConvention="ACTUAL_365")`: `annualRate = monthlyRate × 12`; `divisor = 360 if convention === "ACTUAL_360" else 365`; `dailyInterest = principalOutstanding × annualRate / divisor / 100`.
- `computeMonthlyInterest(principalOutstanding, monthlyRate) = principalOutstanding × monthlyRate / 100` (a separate, day-count-independent display figure).
- `computeAccruedInterest(loan, asOfDate, conventionOverride?)`: `days = differenceInCalendarDays(asOfDate, loan.lastSettledDate)` (date-fns); returns `0` if `days <= 0`; else `dailyInterest × days`, rounded to 2 decimal places.
- `computeInterestSummary` bundles accrued/daily/monthly interest plus `daysSinceSettled` for display.

Corroborated by web/src/__tests__/interest.test.ts (`computeMonthlyInterest(100000, 1.5) = "1500"`; `computeDailyInterest(100000, 1.5).toFixed(4) = "49.3151"`; 365-day accrual on a 100000/1.5%-monthly loan = exactly `"18000"`) and web/src/__tests__/jurisdiction.test.ts (30-day accrual on a fixed 10000-principal/1.5%-monthly loan: `"147.95"` under ACTUAL_365 vs `"150.00"` under ACTUAL_360, computed from the same `loan` object for both conventions within that one test).

### 4.2 `THIRTY_360` is declared (schema + UI) but not functionally distinguished
The Prisma `DayCountConvention` enum has three values (`ACTUAL_365`, `ACTUAL_360`, `THIRTY_360` — web/prisma/schema.prisma), and the onboarding wizard offers all three, including `<option value="THIRTY_360">30 / 360 (Fixed Month)</option>` (web/src/app/(app)/onboarding/onboarding-wizard-client.tsx). But `computeDailyInterest`'s divisor is a **two-way** ternary (`=== "ACTUAL_360" ? 360 : 365`) — any value other than the literal string `"ACTUAL_360"`, including `"THIRTY_360"`, falls through to the 365 divisor, identical to `ACTUAL_365`. Days elapsed is always computed via `differenceInCalendarDays` (true calendar days) regardless of convention — there is no 30-day-per-month counting logic anywhere in the file. **An organization that selects "30 / 360 (Fixed Month)" during onboarding receives `ACTUAL_365` behavior at accrual time.** No test in the suite exercises `THIRTY_360`.

### 4.3 `dayCountConvention` is captured per-organization but never read back at accrual time
`LoanPolicy.dayCountConvention` defaults to `ACTUAL_365` (web/prisma/schema.prisma) and is set by the onboarding wizard, but the `Loan` model itself has **no `dayCountConvention` column**, and neither `getLoanById` (which calls `computeInterestSummary`) nor `payments.ts`'s `previewPaymentAllocation`/`recordPayment` (which call `computeAccruedInterest`) ever supply a `dayCountConvention` or `conventionOverride` argument — confirmed by direct inspection of both call sites (web/src/lib/services/loans.ts; web/src/lib/services/payments.ts). Every actual interest computation in the reviewed services resolves to the `ACTUAL_365` fallback baked into interest.ts, regardless of the organization's configured `LoanPolicy.dayCountConvention`.

---

## 5. Repayment Waterfall Allocation Order **[web]** (web/src/lib/services/payments.ts)

### 5.1 Order and mechanics
`recordPayment(loanId, amountPaid, mode, collectedById, notes?, asOfDate?)` requires `amountPaid > 0` and `loan.status === "ACTIVE"`, then allocates inside one `runSerializable` Serializable-isolation transaction, in fixed order:
1. **Outstanding charges, oldest-first** (`orderBy: createdAt asc`, `isSettled: false`) — each capped at `min(remaining, charge.amount)`; a charge is marked `isSettled: true` only when fully paid.
2. **Accrued interest** (via `computeAccruedInterest` as of `asOfDate`) — capped at `min(remaining, accruedInterest)`.
3. **Principal** — capped at `min(remaining, principalOutstanding)`.

`previewPaymentAllocation` runs the identical read-only computation (same order, same `ACTIVE`-status gate) without persisting, used to preview a payment before confirmation.

### 5.2 Overpayment rejection
If more than `0.01` remains unallocated after all three steps, the transaction throws (`"Payment of ₹{amount} exceeds total outstanding of ₹{amount−remaining}. Reduce the payment amount."`) and nothing persists. Overpayment is rejected outright — never partially applied, never silently dropped.

### 5.3 Interest-clock advancement is prorated on a partial interest payment
`lastSettledDate` (the field `computeAccruedInterest` measures "days elapsed" from) advances fully to `asOfDate` only if `allocatedInterest === accruedInterest` (interest paid in full for the period). If `allocatedInterest < accruedInterest` and `daysElapsed > 0`, the clock instead advances by a proportional fraction: `paidDays = (allocatedInterest / accruedInterest) × daysElapsed`, specifically to avoid silently forgiving interest left unpaid because an earlier charge allocation consumed part of the payment.

### 5.4 Isolation and retry
`recordPayment` runs inside `runSerializable` (Serializable isolation, up to 3 retries only on Prisma error `P2034` — web/src/lib/db.ts), guarding against two concurrent payments on the same loan both reading a stale balance under Postgres's default Read Committed isolation.

### 5.5 Receipt numbering
`generateReceiptNumber` produces `REC-{YYYYMMDD}-{5-digit zero-padded sequence}`, where the sequence is `(count of that org's payments with createdAt on/after local midnight today) + 1` — the same count-then-format-inside-Serializable-transaction pattern as loan numbering (§2.4). The `{YYYYMMDD}` prefix itself, however, is derived from `today.toISOString().slice(0, 10)` — the **UTC** calendar date — while the sequence-reset cutoff is built via `new Date(today.getFullYear(), today.getMonth(), today.getDate())`, i.e. **local-timezone** midnight (web/src/lib/services/payments.ts). In any timezone east of UTC (e.g. IST, UTC+5:30), these two can disagree for several hours after local midnight: the embedded date prefix would still read as the prior UTC calendar day while the sequence has already reset for the new local day. Whether this manifests in a given deployment depends on the server process's configured timezone, which is **Unknown** from source alone.

### 5.6 Test-coverage caveat
web/src/__tests__/waterfall.test.ts asserts the charges→interest→principal order and rounding behavior, but its own comment states it "recreate[s] pure waterfall logic to test standalone atomic allocation rules" — it defines a **local, private copy** of the allocation function and imports nothing from web/src/lib/services/payments.ts. It therefore provides no direct regression protection for `recordPayment`'s actual overpayment-rejection branch, `isSettled` mutation, `LedgerEntry` creation, receipt generation, or the partial-interest-clock proration in §5.3 — all of those remain untested by any test file found.

---

## 6. Loan Closure & Item Release **[web]** (web/src/lib/services/loans.ts)

- `closeLoan(loanId, closedById)` requires, in order: loan exists; `status === "ACTIVE"` ("Loan is already closed" otherwise); `principalOutstanding` not `> 0` (strict zero, no tolerance — "Cannot close loan: ₹{X} principal still outstanding"); zero unsettled `LoanCharge` rows ("Cannot close loan: unsettled charges remain"); recomputed accrued interest not `> 0.01` (a small rounding tolerance, unlike principal's strict check — "Cannot close loan: ₹{X} interest still accrued"). On success: `status = "CLOSED"`, `closedAt = now`, `closedById` set, and a `CLOSURE` `LedgerEntry` (amount `0`) is written. Unlike `createLoan`/`recordPayment`, `closeLoan` uses a plain `prisma.$transaction` (default Read Committed isolation), **not** `runSerializable`.
- `releaseItems(loanId)` requires `status === "CLOSED"` ("Cannot release items: loan is not closed"), and throws "Items have already been released" only if **every** item already has `releasedAt` set (a loan with a mix of released/unreleased items does not trip this guard). Sets `releasedAt = now` on every item still `null`, and writes an `ITEM_RELEASE` `LedgerEntry` whose description states the loan's **total** item count (`loan.items.length`), not the count actually released in that call. Also uses a plain `prisma.$transaction`, not `runSerializable`.
- Loan status displayed to users (`ACTIVE`/`OVERDUE`/`CLOSED`) is **derived, never stored**: `deriveLoanDisplayStatus({status, dueDate, gracePeriodDays})` returns `CLOSED` if the stored `LoanStatus` is `CLOSED`; else computes `graceDueDate = dueDate + gracePeriodDays` and returns `OVERDUE` if today is after that date, else `ACTIVE`. The Prisma `LoanStatus` enum itself has only `ACTIVE`/`CLOSED` (web/prisma/schema.prisma) — `OVERDUE` exists purely as this in-application computation, by design (source comment: "avoids needing a scheduled job and can never drift out of sync with the calendar"). `getLoans` must fetch every DB-`ACTIVE` loan and filter/paginate in memory when the caller filters by `ACTIVE` or `OVERDUE` specifically, since the DB cannot express the grace-period comparison as a `WHERE` clause; `CLOSED` or unfiltered queries paginate at the database level.
- No code path in the reviewed services ever creates a `PENAL_CHARGE` or `OTHER` charge (the two other `ChargeType` enum values besides `PROCESSING_FEE`), and `OVERDUE` status triggers no additional charge and no interest-rate change — `interest.ts` applies the same rate whether or not a loan is overdue. Late/overdue penalization has **no enforcement point** in the reviewed code.

---

## 7. Billing & Quota Rules Per Plan Tier **[web]** (web/src/lib/services/billing.ts)

### 7.1 Plan table (`PLAN_QUOTAS`)

| Plan key | `billingPlan` value | Max active loans | Max branches | Price/mo (USD) |
|---|---|---|---|---|
| Self-Hosted Community | `null` / unrecognized | Infinity | Infinity | 0 |
| Cloud Starter | `"starter"` | 100 | 1 | 49 |
| Cloud Growth | `"growth"` | 1000 | 5 | 149 |
| Cloud Enterprise | `"enterprise"` | Infinity | Infinity | 399 |

`getPlanConfig(billingPlan)`: `null`/`undefined`/any string not matching a known key (after lowercasing) resolves to Self-Hosted Community (`PLAN_QUOTAS[key] || PLAN_QUOTAS.self_hosted`). Corroborated by web/src/__tests__/billing.test.ts, which asserts all four rows exactly (its own tests only ever pass exact lowercase plan strings or `null`/`undefined` — the typo/unrecognized-string fallback branch is not itself under test).

### 7.2 What is actually gated
- `checkCanCreateLoan(organizationId)` is called at the top of `createLoan`, before its transaction opens (§2.1) — it counts the org's `ACTIVE` loans and throws if the count already meets the plan's `maxActiveLoans` (unless the plan is unlimited).
- `checkCanCreateBranch(organizationId)` implements the identical pattern against `maxBranches`, but **has no caller anywhere in web/src** (confirmed by repository-wide search, matching only its own definition) — branch creation is not actually gated by plan quota despite the function existing and being fully implemented.
- `updateOrganizationPlan(organizationId, newPlan)` is a plain `organization.update` with no validation on `newPlan` beyond what the caller passes.

### 7.3 Two paths change an organization's billing plan, neither verifying organization ownership
- **Billing webhook (migrated from Stripe to Dodo Payments)** — `POST /api/webhooks/dodo-payments`, no `JwtAuthGuard`/`RolesGuard` (confirmed: `WebhooksController` applies no `@UseGuards`, as expected for a public third-party webhook receiver). The handler in webhooks.service.ts checks that `process.env.DODO_PAYMENTS_API_KEY`/`DODO_PAYMENTS_WEBHOOK_KEY` are set (throws `HttpStatus.NOT_IMPLEMENTED`/501 if not), and **is now cryptographically verified**: it constructs the official `dodopayments` SDK client and calls `client.webhooks.unwrap(rawBody.toString(), { headers })`, which performs genuine HMAC-SHA256 signature verification per the Standard Webhooks spec (via the SDK's `standardwebhooks` dependency) and throws on an invalid/missing signature — caught and turned into a real `401 Invalid webhook signature` response, verified working end-to-end via a live curl POST with no valid signature headers. On `subscription.active`/`subscription.renewed`, it reads `data.metadata.organizationId`/`planId` and calls `updateOrganizationPlan` (backend/src/modules/webhooks/webhooks.service.ts; backend/src/modules/webhooks/webhooks.repository.ts); on `subscription.cancelled`/`subscription.expired`/`subscription.failed`, the same with `planId` forced to `null`. Only a caller who can produce a valid Dodo Payments signature can reach this mutation now — the previous unauthenticated-forgery risk this row used to describe is fixed.
- **Platform-admin action** — `changeOrganizationPlanAction(organizationId, newPlan)` requires only that the caller be authenticated and, if `process.env.PLATFORM_ADMIN_EMAIL` is set and doesn't match the caller's email, that the caller's own `role === "ADMIN"` (re-queried from the DB by user ID). If `PLATFORM_ADMIN_EMAIL` is unset, no role check applies at all beyond authentication. It never checks that `organizationId` (the parameter) is the caller's own organization (web/src/app/(app)/platform-admin/actions.ts) — so **any** organization's ADMIN can change **any other** organization's billing plan by ID. `PLATFORM_ADMIN_EMAIL` does not appear in any `.env.example` found in the repository (confirmed by repository-wide search, one match total — the read site itself), so whether it is set in any real deployment is **Unknown**.

.agents/decisions.md (DEC-004) records "Implemented server-side quota enforcement … with Stripe webhook handler" as "RESOLVED & EXECUTED" — describing the old, pre-backend/-split, single-app Stripe integration. Current code confirms the quota-enforcement half; the "webhook handler" as it exists today (backend/'s webhooks module) has since been migrated off Stripe onto Dodo Payments and now performs real signature verification (see §7.3 above) — the historical note's implication of a secured handler is, as of this pass, actually true again, just via a different provider and a different verification mechanism than the note could have anticipated.

---

## 8. Follow-Up / Collections Rules **[web]** (web/prisma/schema.prisma; web/src/app/(app)/followups/actions.ts)

### 8.1 Model
`FollowUp` (organizationId, loanId, note, dueDate, status, assignedToId) with `FollowUpStatus` enum `PENDING | DONE | CANCELLED` (web/prisma/schema.prisma).

### 8.2 Actions and their scope
- `getFollowUpsAction(tab)`: lists `FollowUp` rows filtered only by `status` (`"DONE"` vs everything else treated as `"PENDING"`), joined to loan/customer/assignee display fields, ordered by `dueDate` ascending. Computes `isOverdueTask = tab === "PENDING" && dueDate < today` as a derived display flag. **No `organizationId` filter** (§1.4).
- `createFollowUpAction(loanId, note, dueDateStr)`: requires authentication (`checkAuth`) and a non-empty trimmed `note`; resolves `organizationId` from the target loan; always creates with `status: "PENDING"` and `assignedToId = auth.user.id` (the creator, not a chosen assignee).
- `updateFollowUpStatusAction(id, status)`: requires authentication only; accepts any `FollowUpStatus` value with **no state-machine restriction** — e.g. `DONE → PENDING` or `PENDING → CANCELLED` are equally permitted; there is no business rule constraining legal transitions.
- `deleteFollowUpAction(id)`: requires authentication only, no role check, no ownership/assignee check — any authenticated user can delete any organization's follow-up task.
- None of the four actions distinguishes by role (`ADMIN` vs `STAFF` vs any other `Role` value) — the only gate anywhere in this file is "is there a valid, active session" (all four call `checkAuth`, none calls `checkAdmin`).

### 8.3 Dashboard follow-up KPI
`pendingFollowUpsCount` counts `FollowUp` rows with `status: "PENDING"` due within `[today, today+7 days]` — globally, across all organizations, with no scoping (web/src/lib/services/dashboard.ts; see §1.4).

---

## 9. Staff & Role Permission Rules

### 9.1 Data model: a 5-value role enum **[both]**
`Role` enum: `PLATFORM_OPERATOR, OWNER, ADMIN, BRANCH_MANAGER, STAFF` (web/prisma/schema.prisma, shared with backend). better-auth's `user` schema marks `role` (default `"STAFF"`) and `isActive` (default `true`) as `input: false` — client sign-up payloads cannot set either field; the source comment states staff accounts are provisioned only via the admin-gated `createStaffUserAction` (web/src/lib/auth.ts).

### 9.2 Actually-enforced web permission model is binary, not 5-tier **[web]**
Every permission check found in the reviewed web/ code reduces to one of two forms:
- `checkAdmin()` (web/src/lib/auth/session.ts): authenticated **and** `role === "ADMIN"`, else denied.
- Inline `adminAuth.user?.role !== "ADMIN"` checks repeated in each staff action (web/src/app/(app)/admin/staff/actions.ts) and in `admin/settings/actions.ts` and `platform-admin/actions.ts`.

A repository-wide search confirms `OWNER`, `BRANCH_MANAGER`, and `PLATFORM_OPERATOR` are **never checked** in any web/ authorization path — they appear only inside `web/src/lib/redux/api/organizationsApi.ts`'s TypeScript types (an unused API slice, §1.6). Any user whose `role` is one of those three values is treated identically to `STAFF` (i.e., not-admin) by every gate in web/. **The enforced permission model in web/ today is a strict two-tier ADMIN/non-ADMIN split**, despite the underlying schema modeling five roles.

### 9.3 Staff-management guardrails within that binary model (web/src/app/(app)/admin/staff/actions.ts)
- `createStaffUserAction`: admin-only; creates the account via better-auth's `signUpEmail` (which always creates a `STAFF` account per §9.1), then, only if the requested role is `"ADMIN"`, issues a direct `prisma.user.update` to promote it.
- `updateStaffStatusAction`/`updateStaffUserAction`/`deleteStaffUserAction`: admin-only; each blocks the caller from acting on their **own** account in a self-lockout-preventing way — cannot deactivate own account, cannot demote own account away from `ADMIN`, cannot delete own account. `updateStaffUserAction` additionally rejects the update if another user already holds the target email address.
- `deleteStaffUserAction` additionally blocks deletion if the target user has any `handledById` loans on record ("Cannot delete user who has processed historical loans… deactivate instead"), otherwise cascades deletion of their `session`/`account` rows before deleting the `user` row.

### 9.4 Staff visibility/mutation is global, not tenant-scoped **[web]**
`getStaffListAction` runs `prisma.user.findMany()` with no `organizationId` filter — an `ADMIN` of one organization sees, and can mutate (`updateStaffStatusAction`, `updateStaffUserAction`, `deleteStaffUserAction`, all operating on a bare `userId`), **every** organization's staff in the deployment (web/src/app/(app)/admin/staff/actions.ts; see §1.4).

### 9.5 backend RBAC wiring **[backend]**
`RolesGuard` (backend/src/modules/auth/guards/roles.guard.ts) checks `requiredRoles.includes(user.role)` against whatever `@Roles(...)` decorator (backend/src/modules/auth/decorators/roles.decorator.ts) is present, but only `OrganizationsController` uses `@Roles()` in the reviewed modules, and only `TeamRole` (`OWNER, ADMIN, BRANCH_MANAGER, STAFF` — 4 of the Prisma `Role` enum's 5 values, omitting `PLATFORM_OPERATOR`) is modeled in its DTOs (backend/src/modules/organizations/dto/team-member.dto.ts). As detailed in §1.5, this guard chain is currently non-functional for `OrganizationsController` (two routes fully unauthenticated, four routes always 401) because `JwtAuthGuard` — the only place that populates `request.user` — is never applied to that controller.
`customers.controller.ts` and `storage.controller.ts` do correctly apply `JwtAuthGuard` at the class level (backend/src/modules/customers/customers.controller.ts; backend/src/modules/storage/storage.controller.ts). `health`, `market-rates`, and `webhooks` controllers apply no guard at all (confirmed: no `@UseGuards` anywhere in any of the three files — intentionally public for the first two; by webhook convention, but without compensating signature verification, for the third).

### 9.6 Authentication mechanism backing all of the above **[both]**
web/ authenticates via **better-auth** (`betterAuth()` with a Prisma adapter imported from `better-auth/adapters/prisma` — web/src/lib/auth.ts; client-side `createAuthClient` imported from `better-auth/react` — web/src/lib/auth-client.ts), issuing a `better-auth.session_token` cookie backed by the shared `session` table. (web/package.json separately declares a standalone `@better-auth/prisma-adapter` dependency that has zero import references anywhere in web/src — the code actually uses the subpath bundled inside the main `better-auth` package instead, leaving that declared dependency unused.) backend/'s `JwtAuthGuard` extracts a token from either an `Authorization: Bearer` header or that same `better-auth.session_token` cookie (backend/src/modules/auth/guards/jwt-auth.guard.ts), then `AuthService.validateToken` (backend/src/modules/auth/auth.service.ts) first looks the token up directly in the shared `session` table via a raw SQL query (backend/src/modules/auth/auth.repository.ts) — i.e. it validates a **better-auth session token**, not an independently signed token — and only if that lookup fails does it fall back to verifying the token as a **Supabase-issued JWT** via `supabase.auth.getUser(token)`. The `JWT_SECRET` environment variable documented in backend/.env.example is **never referenced anywhere in backend/src** (confirmed by repository-wide search) — backend does not use its own independently signed JWT scheme despite that variable's presence in the example env file.

---

## 10. Jurisdiction / Currency / Weight-Unit / Purity-Expression Configurability Rules

### 10.1 Per-organization configuration model: `LoanPolicy` **[both]**
Fields and defaults (web/prisma/schema.prisma): `currencyCode` (default `"USD"`, ISO 4217), `currencySymbol` (default `"$"`), `weightUnit` (`WeightUnit` enum `GRAM|TROY_OUNCE|TOLA`, default `GRAM`), `purityExpression` (`PurityExpression` enum `KARAT|MILLESIMAL_FINENESS|PERCENTAGE`, default `KARAT`), `dayCountConvention` (default `ACTUAL_365`), `gracePeriodDays` (default `7`), `mandatoryIdThreshold` (`Decimal(12,2)`, default `0` = disabled), `mandatoryIdDocTypeId`, `ltvTiers` (`Json`, ascending `[{maxValue, ltvPercent}]`). Populated by the onboarding wizard (web/src/app/(app)/onboarding/onboarding-wizard-client.tsx; web/src/app/(app)/onboarding/actions.ts), whose `saveLoanPolicyAction` has no authentication check at all (§1.4, §10.8).

### 10.2 Global fallback store: `AppSetting` **[web]**
A single key-value table with **no `organizationId` column at all** (web/prisma/schema.prisma) backs `market-rates.ts`, `settings.ts`, and the fallback branches of `valuation.ts`/`customers.ts`. Any value stored here (gold/silver rate, LTV tiers, PAN threshold, interest/grace defaults) is shared across **every** organization on a deployment, not organization-scoped.

### 10.3 The two stores are consulted inconsistently across services **[web]**
`getLtvSlabs` (valuation.ts) and `checkPanRequired` (customers.ts) both try org `LoanPolicy` first, then global `AppSetting`, then a hardcoded constant. But `getDefaultInterestRate`/`getDefaultGracePeriod` (web/src/lib/services/loans.ts) read **only** the global `AppSetting` keys (`interest.default.monthly`, `grace.period.days`) and never consult `LoanPolicy` at all — even though `LoanPolicy.gracePeriodDays` exists and goes unused by `getDefaultGracePeriod`. `createLoan`'s own persisted `gracePeriodDays` fallback (`input.gracePeriodDays ?? 7`) is a third, independent hardcoded literal that calls neither helper. A 7-day grace-period default is thus independently encoded in at least four places (the `Loan`/`LoanPolicy` Prisma column defaults, `loans.ts`'s inline fallback, and `market-rates.ts`'s `DEFAULT_RATES`) that happen to agree numerically but are not unified. `getMarketRates` (web/src/lib/services/market-rates.ts) additionally has a falsy-zero bug: every numeric field is read as `parseFloat(stored) || DEFAULT_RATES.field`, so a setting explicitly stored as `"0"` is silently replaced by the hardcoded default (JS treats `0` as falsy) for every field except `safetyMarginPercent` (whose default is itself `0`, so the bug happens to be a no-op for that one field only).

### 10.4 `WORLDWIDE_JURISDICTIONS` registry (web/src/lib/config/jurisdictions.ts) — 12 static profiles

| Code | Name | Currency | Default day-count |
|---|---|---|---|
| US | United States | USD $ | ACTUAL_360 |
| GB | United Kingdom | GBP £ | ACTUAL_365 |
| EU | Eurozone/EU | EUR € | ACTUAL_360 |
| AE | UAE/Dubai | AED | ACTUAL_360 |
| CH | Switzerland | CHF | ACTUAL_360 |
| SG | Singapore | SGD S$ | ACTUAL_365 |
| AU | Australia | AUD A$ | ACTUAL_365 |
| CA | Canada | CAD C$ | ACTUAL_365 |
| IN | India | INR ₹ | ACTUAL_365 |
| SA | Saudi Arabia | SAR | ACTUAL_360 |
| JP | Japan | JPY ¥ | ACTUAL_365 |
| GLOBAL | Global Custom/Multi-Currency (fallback) | USD $ | ACTUAL_365 |

Each entry also carries `region`, `locale`, a `kycDocuments` list, and a regulatory `description`. `getJurisdictionProfile(code)` upper-cases and looks up, falling back to `GLOBAL` if unrecognized/absent. `formatUniversalCurrency` uses 0 fraction digits for JPY, 2 otherwise. `getJurisdictionProfile` has **no application-code call site** (confirmed by repository-wide search: only its own test in web/src/__tests__/universal-assets.test.ts calls it) — only its own test exercises it; `WORLDWIDE_JURISDICTIONS` itself is consumed by the onboarding wizard and a public marketing-site calculator (web/src/components/marketing/universal-asset-calculator.tsx, rendered from web/src/app/page.tsx, outside the authenticated `(app)` route group). Corroborated by web/src/__tests__/universal-assets.test.ts (this is the file that actually tests the jurisdiction registry, despite web/src/__tests__/jurisdiction.test.ts's misleading name — see §3.3/§4.1).

### 10.5 `UNIVERSAL_ASSET_CATEGORIES` registry (web/src/lib/config/asset-categories.ts) — 6 categories, disconnected from actual loan underwriting

| Category | Default LTV % |
|---|---|
| Precious Metals & Bullion | 80 |
| Horology & Luxury Watches | 65 |
| Fine Art & Collectibles | 50 |
| Vehicles & Heavy Equipment | 55 |
| Luxury Designer Goods & Electronics | 60 |
| General Appraised Collateral | 50 |

`getAssetCategory(id)` falls back to `GENERAL_COLLATERAL` if unrecognized; it has no application-code call site either (only its own test calls it — the marketing calculator indexes `UNIVERSAL_ASSET_CATEGORIES` directly instead). The registry is consumed only by the public marketing-site calculator and its own test (web/src/__tests__/universal-assets.test.ts) — **not referenced anywhere in the actual loan-creation path**, which (per `loanItemSchema` and the Prisma `MetalType` enum) supports only `GOLD`/`SILVER` items. One of the 6 categories' `defaultLtvPercent` values coincidentally matches a tier actually used by `valuation.ts` (§3.3) — Precious Metals & Bullion's 80% equals `DEFAULT_LTV_SLABS`'s middle tier — but the other five (65/50/55/60/50%) do not correspond to any of the 85/80/75% tiers, and even the matching category is never actually consulted by the loan-creation path; this registry is marketing/presentation scaffolding, not enforced underwriting logic.

### 10.6 Configured-but-never-consumed `LoanPolicy` fields, summarized
As detailed in §3.2 and §4.3: `weightUnit` and `purityExpression` are captured at onboarding but never reach `computeItemValuation` via the loan-creation path; `dayCountConvention` is captured but never reaches any interest computation. All three exist as write-only configuration today.

### 10.7 Hardcoded India-specific defaults despite the multi-currency model **[web]**
- Ledger/error strings hardcode the ₹ glyph literally: `createLoan`'s disbursement description, `closeLoan`'s two guard errors, `recordPayment`'s overpayment message and `PAYMENT` ledger description (web/src/lib/services/loans.ts; web/src/lib/services/payments.ts).
- `formatDate`/`formatDateTime` hardcode the `en-IN` `Intl` locale with no override parameter; `formatCurrency`/`formatCurrencyExact` at least accept a currency code, using the runtime's default locale (`Intl.NumberFormat(undefined, ...)`) (web/src/lib/utils.ts).
- `fetchAndSaveLiveMetalRates` always fetches gold/silver spot prices and formats them in INR, on an `Asia/Kolkata` clock with an appended "IST" suffix, regardless of any organization's `LoanPolicy.currencyCode` (web/src/lib/services/market-rates.ts).
- `customerCreateSchema`'s phone/pincode regexes and `kycDocumentSchema`'s PAN/Aadhaar/Voter-ID/Passport regexes are all India-specific formats with no jurisdiction parameter (web/src/lib/validation/customer.ts, §2.3).
- `createLoanSchema`'s tenure-cap error message cites "RBI cap" specifically (web/src/lib/validation/loan.ts, §3.4).

Net: the multi-currency/multi-jurisdiction data model (`LoanPolicy`, the jurisdiction registry) exists as configuration scaffolding that the currently-enforced service code does not yet consult for these specific behaviors.

### 10.8 The onboarding policy-write path has no authentication **[web]**
`saveLoanPolicyAction` (web/src/app/(app)/onboarding/actions.ts) — the only write path for `LoanPolicy.weightUnit`/`purityExpression`/`dayCountConvention`/`ltvTiers`/etc. — has no `checkAuth`/`checkAdmin` call at all (§1.4). Any caller able to invoke this Server Action can overwrite any organization's loan policy, or (when no `organizationId` is supplied) whichever organization `prisma.organization.findFirst()` happens to return.

### 10.9 backend/'s organization-policy endpoint has an inconsistent response shape, and its flat per-tier update fields are dead code **[backend]**
`getOrganizationPolicy` (backend/src/modules/organizations/organizations.repository.ts) returns the raw `LoanPolicy` row if one exists, but a differently-shaped, hand-built object (with flat `ltvTier1Percent`/`ltvTier2Percent`/`ltvTier3Percent`/`ltvTier1Max`/`ltvTier2Max`/`safetyMarginPercent`/`defaultInterestMonthly` fields that do not exist as real DB columns) if none exists yet — and that synthetic fallback object *also* includes its own populated `ltvTiers: [...]` default array. `UpdateOrganizationPolicyDto` accepts `defaultInterestMonthly` and `safetyMarginPercent` (backend/src/modules/organizations/dto/organization-policy.dto.ts) but `upsertOrganizationPolicy`'s Prisma `create`/`update` payload never references either field — both are silently discarded on write.

The flat per-tier fields (`ltvTier1Max`/`ltvTier1Percent`/`ltvTier2Max`/`ltvTier2Percent`/`ltvTier3Percent`) that `upsertOrganizationPolicy` falls back to building an `ltvTiers` array from are **unreachable dead code in every case, not merely after an organization's first write**: the resolution chain is `dto.ltvTiers ?? existing.ltvTiers ?? [built from the flat fields]`, where `existing` is the result of this same repository's `getOrganizationPolicy`. Because *both* branches of `getOrganizationPolicy` — the real row and the no-policy-yet synthetic fallback — populate a non-null `ltvTiers` array, `existing.ltvTiers` is never `null`/`undefined`, and `??` only falls through on `null`/`undefined`. So a `PUT` supplying only the flat per-tier fields (without a full `ltvTiers` array) never changes the stored tiers, on the first write or any subsequent one — the flat fields have no effect regardless of write order. Separately, `ltvTiers` array elements are validated only as `@IsArray()` — no `@ValidateNested`/`@Type`, so malformed tier objects pass validation and are persisted as-is; the global `ValidationPipe`'s `forbidNonWhitelisted: true` (backend/src/main.ts) strips/rejects unrecognized top-level DTO properties but does not validate the shape of elements inside an `@IsArray()`-only field.

---

## 11. Cross-Cutting Notes

### 11.1 backend/ cannot currently start — confirmed by direct execution, not just static reading **[backend]**
`PrismaService extends PrismaClient` with no constructor override (i.e. an implicit empty `super()`) (backend/src/database/prisma.service.ts). `backend/prisma/schema.prisma`'s `datasource db` block has no static `url` (identical to web/prisma/schema.prisma, confirmed byte-for-byte via diff). backend/package.json depends on `@prisma/client` `^7.8.0` but has **no `@prisma/adapter-pg` dependency** (confirmed absent; present only in web/package.json), and there is no `backend/prisma.config.ts`. Both backend/package.json and web/package.json additionally pin the `prisma` CLI/dev-tooling package to `^6.19.3` — one major version behind the `@prisma/client` `^7.8.0` runtime dependency, in both subsystems.

This was verified empirically in this session, not only inferred from the above: running `npm run build` (backend/package.json) compiles cleanly with no errors, but running the built output (`node dist/main.js`) crashes immediately with `PrismaClientInitializationError: \`PrismaClient\` needs to be constructed with a non-empty, valid \`PrismaClientOptions\``, thrown synchronously from `new PrismaService` (backend/src/database/prisma.service.ts) during NestJS's `InstanceLoader` provider-instantiation phase — i.e. inside `NestFactory.create(AppModule)`, before `app.listen()` is ever reached (backend/src/main.ts has no try/catch around that call, and its final `bootstrap();` invocation has no `.catch()`, so the exception is unhandled). The process exits on its own with code 1 in roughly 1.3 seconds; no HTTP server ever binds to a port. Running `npm run test:e2e` fails the same way, one step earlier — inside `Test.createTestingModule({ imports: [AppModule] }).compile()` (backend/test/app.e2e-spec.ts) — with the identical `PrismaClientInitializationError`, before the test ever issues its HTTP request (the subsequent `afterEach`'s `app.close()` then also throws, since `app` was never assigned). Separately, and moot given the above: `AppModule` registers no `controllers`/`providers` array of its own, and no `AppController`/`AppService` exists anywhere in backend/src — so even if `PrismaService` could construct successfully, `app.e2e-spec.ts`'s `GET /` → `200 'Hello World!'` assertion has no root route to satisfy and would still fail, with a 404 instead of the expected response.

Every module reviewed here (customers, health, market-rates, organizations, webhooks all inject `PrismaService` directly; `cron` depends on `market-rates`) is affected identically, since `DatabaseModule` is `@Global()` and eagerly imported by `AppModule`, and NestJS instantiates all of a module's registered providers at bootstrap regardless of whether any given request path actually resolves them. This includes `auth`, even though `AuthRepository` itself depends on `SupabaseService` rather than `PrismaService` (backend/src/modules/auth/auth.repository.ts) — `PrismaService` is a sibling provider in the same `@Global()` `DatabaseModule`, so its constructor failure aborts the whole application before any route, including auth's, becomes reachable — consistent with the direct-execution result above, where the crash occurs during bootstrap before any request is served.

### 11.2 Licensing: the LICENSE file matches the historical notes; package.json metadata conflicts with both **[both]**
Correcting a specific error in an earlier pass of this document: a LICENSE file **does** exist at the repository root (LICENSE). It is the Business Source License 1.1 (Licensor "Pawnify Cloud Inc.", Licensed Work "Pawnify Institutional Collateral & Asset Lending Platform"), permitting self-hosting/internal use but prohibiting a competing hosted/SaaS offering without a commercial agreement, with a Change Date of `2029-07-01` after which it automatically converts to plain MIT. This matches .agents/decisions.md's DEC-002 ("Pawnify is distributed under Business Source License 1.1 (`LICENSE`), converting automatically to MIT License on `2029-07-01`") essentially word-for-word — on this specific point, the historical note is accurate and not stale, and .agents/tasks.md's Phase 4 checklist item ("add `LICENSE` and `CONTRIBUTING.md`") is corroborated by both files' actual presence at the repository root.

The real inconsistency is elsewhere: both web/package.json and backend/package.json declare `"license": "MIT"` plainly, with no BSL reference or conversion date anywhere in either — i.e. the npm package metadata's license field does not match the terms of the repository's own LICENSE file (BSL-1.1-until-2029, not plain MIT today). Which of the two governs for a consumer relying on the published npm metadata alone (as opposed to the repository's LICENSE file) is **Unknown** from source.

### 11.3 Test-suite fidelity caveats relevant to the rules above **[web/backend]**
- web/src/__tests__/waterfall.test.ts does not import web/src/lib/services/payments.ts (§5.6) — the real waterfall implementation has no direct test coverage despite the suite's name.
- web/src/__tests__/rls-isolation.test.ts imports only `describe/it/expect` — it filters two literal in-memory JavaScript arrays with `.filter()`/`.find()` and touches no Prisma, Supabase, or real RLS policy (backend/sql/rls_policies.sql) at all. It validates that JavaScript's own array methods honor the predicates written into them, not that tenant isolation is enforced anywhere in the running system (§1.2–§1.4).
- web/src/__tests__/jurisdiction.test.ts tests `valuation.ts` unit conversions and `interest.ts` day-count branching (§3.3, §4.1), not web/src/lib/config/jurisdictions.ts; web/src/__tests__/universal-assets.test.ts is the file that actually tests the jurisdiction and asset-category registries (§10.4, §10.5). A future agent searching by filename alone would misattribute coverage.
- backend/ has zero `*.spec.ts` unit test files anywhere under backend/src (confirmed count: 0); its only test, backend/test/app.e2e-spec.ts, asserts `GET /` returns the unmodified NestJS-CLI-scaffold `"Hello World!"` and never exercises any of the 8 real modules' routes (backend/src/modules; backend/src/app.module.ts has no root controller producing that string). Running this suite in this session confirms it fails — not on the routing/404 mismatch, but earlier, at module compilation, with the same `PrismaClientInitializationError` described in §11.1.

### 11.4 Module-count and section-numbering cross-references
The framing "only 7 modules exist so far" undercounts backend/src/modules' actual 8 directories (auth, cron, customers, health, market-rates, organizations, storage, webhooks — backend/src/modules; backend/src/app.module.ts).

The "§Phase 4"/"§Phase 5"-style markers embedded in several web/ test `describe` block names (e.g. billing.test.ts's "§Phase 4"; jurisdiction.test.ts's and rls-isolation.test.ts's "§Phase 5") do correspond to the Phase 4/Phase 5 headings in .agents/tasks.md and .agents/decisions.md, confirmed by direct search of both files. The separate "§6.1"/"§6.2"/"§6.3"/"§6.4"-style markers found in service-file header comments and test names (valuation.ts's "§6.1 & §6.2"; interest.ts's "§6.3"; payments.ts's "§6.4"; loans.ts's "(§6.5)" for the closure/item-release split) do **not** correspond to anything in the five .agents/*.md files — none of the five contain a "6.1"/"6.2"/etc. string anywhere. They instead trace to ARCHITECTURE.md at the repository root ("§6.1 Item Valuation Algorithm", "§6.2 RBI-Compliant Tiered LTV Framework", "§6.3 On-Read Actual/365 Interest Formula", "§6.4 Atomic Repayment Waterfall Allocation") — a document outside the five files this project's convention treats as potentially-stale historical notes. loans.ts's own "(§6.5)" citation has no corresponding "§6.5" header anywhere in ARCHITECTURE.md's visible section numbering, so that specific cross-reference is unresolved. The current source files (not the historical planning notes, and not ARCHITECTURE.md) remain what this document treats as authoritative throughout.