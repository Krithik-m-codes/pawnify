# Contributing to Pawnify

Thank you for contributing to **Pawnify**, the open-source institutional collateral & asset lending platform!

This is a two-project repository:

- **`backend/`** — NestJS API (new, partial — see `.agents/backend.md` for exactly what exists today)
- **`web/`** — Next.js application (mature — routing, UI, and most current business logic)

---

## Non-Negotiable Core Engineering Principles

Pawnify manages physical collateral and money. Every pull request MUST abide by our Non-Negotiable Operational Standards:

1. **Prisma Decimal Only — Zero JavaScript Floats**
   - Never use native JavaScript `Number`, floats, or unrounded arithmetic for money, interest rates, or precious metal weights.
   - Always use `Prisma.Decimal` and test calculations for arbitrary-precision accuracy.
2. **Atomic Waterfall Transactions**
   - Every payment or collateral release write must happen inside a single atomic database transaction (`prisma.$transaction`).
   - Partial updates or un-isolated mutations are considered data-integrity vulnerabilities.
3. **Load-Bearing Row-Level Security (RLS)**
   - Every operational model must include `organizationId` and be isolated by our PostgreSQL Row-Level Security policies (`backend/sql/rls_policies.sql`).
   - Always pass `organizationId` explicitly on entity creation, and thread tenant context through every read path — see `.agents/security.md` for the current, known gaps here before assuming this is fully enforced end-to-end.
4. **4-Decimal Micro-Weight & Worldwide Unit Compatibility**
   - Precious metal weights must support 4 decimal places across `GRAM`, `TROY_OUNCE`, and `TOLA`.

---

## Development Setup

Both projects are installed and run independently (there is no root `package.json` or workspace tool).

1. **Clone & install dependencies**
   ```bash
   git clone https://github.com/pawnify/pawnify.git
   cd pawnify
   cd backend && npm install && cd ..
   cd web && npm install && cd ..
   ```

2. **Configure environment**

   Each project has its own `.env.example` — copy both and fill in real values (a Supabase project is required; see each file's comments):
   ```bash
   cp backend/.env.example backend/.env
   cp web/.env.example web/.env
   ```

3. **Run a local database (self-hosted path)**
   ```bash
   cp .env.example .env      # root .env, only used by docker-compose
   docker compose up -d db
   ```

   Or point `DATABASE_URL`/`DIRECT_URL` in both `.env` files at your own Postgres/Supabase instance instead.

4. **Apply schema & generate clients**
   ```bash
   cd backend && npx prisma db push && cd ..
   cd web && npx prisma db push && npm run db:seed && cd ..
   ```

5. **Run both dev servers** (in separate terminals)
   ```bash
   cd backend && npm run dev     # http://localhost:3001
   cd web && npm run dev         # http://localhost:3000
   ```

6. **Before submitting any pull request**, run the checks for whichever project you touched:
   ```bash
   # backend/
   npm run build && npm test

   # web/
   npx tsc --noEmit && npm test
   ```
