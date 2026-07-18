# Pawnify Engineering Lessons & Architectural Guardrails

## Code vs. Spec Drift Findings (Phase 0 Audit)
1. **Weight Column Precision**: While `ARCHITECTURE.md` stated weight columns (`grossWeightGrams`, `fineWeightGrams`, etc.) use `Decimal(10, 4)` precision, `prisma/schema.prisma` actually implemented `@db.Decimal(8, 3)`. Ensure all future schema adjustments explicitly preserve or enhance required financial precision.
2. **PAN Enforcement Enforcement Gap**: While docs claimed server-side block for loans over ₹50,000 without PAN, `createLoan` in `src/lib/services/loans.ts` did not actually execute `checkPanRequired`. Mandatory ID enforcement must be enforced inside the transactional loan creation pipeline.

## Architectural Invariants
- **Never Float Math**: Always use `Prisma.Decimal` (`decimal.js`) for monetary amounts, interest calculations, rates, and weights.
- **Audit-Before-Apply**: Inspect existing code completely before modifying files. Avoid opportunistic refactoring outside the active task scope.
- **RLS Boundary**: Tenant isolation must be enforced at the database level via Postgres Row-Level Security, not solely in application layer WHERE clauses.
