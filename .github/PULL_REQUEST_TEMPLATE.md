## Summary of Changes
<!-- Provide a clear summary of the changes made. State whether this touches web/, backend/, or both. -->

## Related Issues / Context
<!-- Link any relevant issues, e.g., Closes #123 -->

## Architectural & Security Verification
<!-- Before submitting, please verify the load-bearing requirements detailed in AGENTS.md -->
- [ ] **Tenant Scoping (RLS / `organizationId`)**: If modifying database queries, explicitly verified `organizationId` filtering or Row-Level Security session scoping.
- [ ] **Financial Math & Precision (`Decimal`)**: If modifying loan, interest, or payment calculations, strictly used `Prisma.Decimal` without floating-point drift.
- [ ] **Authentication & Session (`better-auth`)**: Verified compatibility with `better-auth` session token handling.
- [ ] **Subsystem Isolation**: If touching `backend/` or `web/`, verified clean API/contract boundaries.

## Verification / Steps to Test
<!-- Describe how reviewers can verify these changes locally or across automated tests. -->
- `npm test` across modified subsystems (`web/` or `backend/`) passes.
- `npm run build` completes with zero errors.
- Manual verification summary:
