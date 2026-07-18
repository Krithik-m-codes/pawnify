# Security Policy

Pawnify is an institutional-grade collateral and asset-backed lending platform. Protecting financial records, customer KYC documentation, and multi-tenant isolation boundaries (`Row-Level Security`) is our highest priority.

## Reporting a Vulnerability

**Do NOT report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

If you believe you have discovered a potential security vulnerability in Pawnify (`web`, `backend`, database RLS policies, or authentication flow), please report it responsibly by contacting the maintainers directly via private security disclosure:

1. **GitHub Security Advisory**: Use the **[Private Vulnerability Reporting](https://github.com/libresource/pawnify/security/advisories/new)** feature on this repository if enabled.
2. **Direct Email**: Send a detailed report to **security@pawnify.com** (or the lead maintainer's email listed in package records).

### What to Include in Your Report
- **Type of Vulnerability**: e.g., Tenant Isolation Bypass (RLS failure), Authentication/Authorization bypass, SQL/Prisma injection, Cross-Site Scripting (XSS), or Floating-Point Financial Calculation Manipulation.
- **Affected Subsystem**: Specify if the issue occurs in `web/` (Next.js/better-auth), `backend/` (NestJS API), or Postgres `sql/rls_policies.sql`.
- **Steps to Reproduce**: Detailed reproduction steps, proof-of-concept scripts, or HTTP requests demonstrating the flaw.
- **Potential Impact**: An assessment of what data or financial calculations could be compromised.

## Our Response Commitment
- **Initial Response**: We aim to acknowledge receipt of private vulnerability reports within **48 hours**.
- **Triage & Assessment**: We will assess the severity and provide an estimated timeline for resolution within **5 business days**.
- **Resolution & Disclosure**: Once a fix is verified and deployed, we will coordinate public disclosure and credit the researcher appropriately.

## Key Security Architectural Pillars
- **Row-Level Security (RLS)**: Tenant data isolation relies on PostgreSQL RLS (`app.current_organization_id`). Queries bypassing or failing to arm tenant context are treated as critical security risks.
- **Arbitrary-Precision Currency Math**: Monetary and precious metal weights must strictly use `Prisma.Decimal`. Any float approximation causing ledger drift is treated as a high-priority integrity bug.
- **Single Source of Identity**: `better-auth` is our sole identity provider (`web/src/lib/auth.ts`). `backend/` validates tokens against shared session tables (`auth.repository.ts`) or genuine Supabase JWTs without issuing independent credentials.
