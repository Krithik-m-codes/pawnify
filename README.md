<div align="center">

# 🏛️ PAWNIFY
### The Open-Source Institutional Collateral & Universal Asset-Backed Lending Platform

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1%20%E2%86%92%20MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?logo=prisma)](https://www.prisma.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Pawnify is a modern, enterprise-grade, multi-tenant software platform for **pawnbrokers, gold loan NBFCs, Lombard lenders, and asset finance institutions**. Run your entire loan book digitally—from KYC onboarding and live collateral appraisal to interest accrual and automated repayment waterfalls.

[Features](#-key-features) • [Universal Collateral](#-universal-multi-asset-support) • [India & Global Ready](#-india-ready--worldwide-jurisdictions) • [Quickstart](#-5-minute-quickstart) • [Architecture](#-system-architecture) • [Contributing](#-contributing)

</div>

---

## ✨ Why Pawnify?

Legacy pawn and collateral lending software is desktop-locked, opaque, and restricted to rigid single-jurisdiction workflows. **Pawnify** modernizes institutional lending with a transparent open-source foundation, institutional audit trails, and multi-tenant cloud capability:

- 🔒 **Multi-Tenant & Role-Based Security**: Built with organization-isolated PostgreSQL schemas and granular Better-Auth role controls (`OWNER`, `ADMIN`, `BRANCH_MANAGER`, `STAFF`).
- ⚖️ **Audit-Grade Financial Ledger**: Immutable loan lifecycle tracking with an **atomic repayment waterfall** enforcing the strict priority: *Fees → Accrued Interest → Principal Allocation*.
- 📈 **Live Valuation & Automated LTV Caps**: Real-time spot valuation per gram for precious metals, plus configurable Loan-to-Value (LTV) limits that protect your institution from downside collateral volatility.
- 🌍 **Built for Scale**: Deploy free self-hosted via Docker Compose, or operate commercially as a multi-tenant Cloud SaaS platform.

---

## 💎 Universal Multi-Asset Support

Pawnify is engineered to lend against **any physical asset or institutional collateral**—not just gold. Our built-in Universal Appraisal Registry supports:

| Asset Category | Badge | Appraisal Parameters | Default LTV Cap | Typical Collateral Examples |
| :--- | :--- | :--- | :--- | :--- |
| **Precious Metals & Bullion** | `BULLION & JEWELRY` | Metal Type, Karat / Fineness, Gross Weight, Stone Deductions | **80%** | Gold Bullion Bars, 22K Bridal Jewelry Suite, Silver Mint Bars |
| **Horology & Luxury Watches** | `HOROLOGY` | Brand & Manufacture, Reference Number, Serial Number, Box/Papers | **65%** | Rolex Submariner, Audemars Piguet Royal Oak, Patek Philippe Nautilus |
| **Fine Art & Collectibles** | `FINE ART` | Artist / Maker, Title & Creation Year, Provenance Documentation | **50%** | Authenticated Paintings, Rare Numismatic Coins, Sculptures |
| **Vehicles & Heavy Equipment** | `TITLED ASSETS` | Make/Model/Year, VIN / Chassis Number, Mileage, Clear Title Status | **55%** | Luxury & Exotic Automobiles, Yachts, Commercial Machinery |
| **Luxury Designer Goods** | `LUXURY GOODS` | Designer Brand, Date Stamp / Blind Stamp, Condition, Original Packaging | **60%** | Hermès Birkin Handbags, Chanel Classic Flap, Leica Camera Kits |
| **General Appraised Collateral** | `GENERAL ASSET` | Asset Description, Condition Classification, Secondary Market Liquidity | **50%** | Secured Warehouse Inventory, Musical Instrument Suites, Broadcast Gear |

---

## 🇮🇳 India-Ready & 🌐 Worldwide Jurisdictions

Pawnify comes out-of-the-box with customized institutional lending presets for Indian pawn brokers & Gold Loan NBFCs, while supporting over 12 global financial jurisdictions:

### India-First Compliance (`IN` Profile)
- **KYC & Identity Verification**: Integrated verification fields for **PAN Card**, **Aadhaar Card**, Voter ID, and Passport.
- **RBI Gold Loan LTV Alignment**: Ready for RBI-regulated LTV capping slabs (up to 75% / 80% / 85%) and PAN statutory reporting thresholds.
- **Localized Financial Currency**: Native ₹ INR formatting, Indian mobile number validation, and daily/monthly simple interest accrual.

### Worldwide Jurisdiction Presets
Switch instantly between **12+ global lending presets** tailored to local legal statutes and day-count conventions:
- **United States (`US`)**: Conforms to State Pawnbroker Statutes & UCC Article 9 secured lending rules (`ACTUAL_360`, USD `$`).
- **United Kingdom (`GB`)**: Compliant with FCA Consumer Credit Act & National Pawnbrokers Association guidelines (`ACTUAL_365`, GBP `£`).
- **European Union (`EU`)**: Tailored for European *Pfandhaus*, Lombard lending, and asset finance (`ACTUAL_360`, EUR `€`).
- **UAE / Dubai (`AE`)**: Designed for Gold Souk bullion lenders and DIFC horology financiers (`ACTUAL_360`, AED `د.إ`).
- **Singapore (`SG`), Switzerland (`CH`), Australia (`AU`), Canada (`CA`), Japan (`JP`), Saudi Arabia (`SA`)**, and custom locales.

---

## 🏗️ System Architecture

Pawnify follows a **modern full-stack monorepo** pattern designed for progressive enhancement and scale:

```
pawnify/
├── web/                   # Mature Next.js 16 App Router (UI, Route Handlers, Server Actions, RTK Query)
├── backend/               # NestJS 11 API (REST API, Swagger /docs, Cron tasks, Webhooks)
├── .agents/               # Comprehensive AI & Contributor Context Documentation
├── .github/               # CI/CD Workflows, PR Checklist & Issue Templates
├── docker-compose.yml     # One-command full stack Docker deployment
└── README.md              # Project overview & documentation hub
```

For an in-depth breakdown of request flows, Server Action / REST API hybrid dispatching, and Row-Level Security (RLS), see [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`.agents/architecture.md`](.agents/architecture.md).

---

## 🚀 5-Minute Quickstart

### Option 1: Self-Hosted Docker Compose (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Krithik-m-codes/pawnify.git
   cd pawnify
   ```

2. **Configure your environment**:
   ```bash
   cp .env.example .env
   # Open .env and add your PostgreSQL / Supabase connection details and session secrets
   ```

3. **Launch the stack**:
   ```bash
   docker compose up --build
   ```
   - **Web Application**: http://localhost:3000
   - **NestJS API & Swagger Documentation**: http://localhost:3001/docs

---

### Option 2: Local Development Setup

1. **Install dependencies**:
   ```bash
   cd backend && npm install && cp .env.example .env
   cd ../web && npm install && cp .env.example .env
   ```

2. **Run database migrations**:
   ```bash
   cd web && npx prisma db push
   ```

3. **Start development servers (in separate terminals)**:
   ```bash
   # Terminal 1: NestJS API Server
   cd backend && npm run dev

   # Terminal 2: Next.js Frontend Server
   cd web && npm run dev
   ```

---

## 📚 Comprehensive Documentation Suite

Every module, route, business rule, and financial calculation is meticulously documented under [`.agents/`](.agents/):

| Documentation File | Description |
| :--- | :--- |
| [`AGENTS.md`](AGENTS.md) | Complete orientation guide for developers and AI coding agents |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | High-level system design, financial math formulas, and security boundaries |
| [`.agents/architecture.md`](.agents/architecture.md) | Detailed layer architecture, auth flow, and database access patterns |
| [`.agents/backend.md`](.agents/backend.md) | NestJS API overview: modules, controllers, guards, and DTOs |
| [`.agents/frontend.md`](.agents/frontend.md) | Next.js app overview: Server Actions, RTK Query, and UI components |
| [`.agents/database.md`](.agents/database.md) | Complete PostgreSQL schema, ERD, and Row-Level Security policies |
| [`.agents/business-rules.md`](.agents/business-rules.md) | Exhaustive reference for LTV caps, interest calculation, and waterfalls |
| [`.agents/security.md`](.agents/security.md) | Authentication best practices, secrets management, and RLS enforcement |
| [`.agents/deployment.md`](.agents/deployment.md) | Production Docker deployment, reverse proxies, and environment variables |

---

## 🤝 Contributing

We welcome community contributions from developers, pawn broking operators, and financial technologists worldwide!

1. Check out our [`CONTRIBUTING.md`](CONTRIBUTING.md) guide for setup instructions and code style standards.
2. Review our [Code of Conduct](CODE_OF_CONDUCT.md) and [Security Policy](SECURITY.md).
3. Open a feature request or bug report using our structured [.github templates](.github/ISSUE_TEMPLATE).

---

## 📄 License

Licensed under the **Business Source License 1.1** ([`LICENSE`](LICENSE)).
- Free to install, self-host, and modify for your **internal business operations** (running your own pawn shop or lending institution).
- Converts automatically to the **MIT License** on **July 1, 2029**.
- Commercial hosted cloud / SaaS offerings require a separate commercial agreement with Licensor.

---

<div align="center">
Built with ❤️ for Indian Pawn Brokers & Asset Lenders Worldwide.
</div>
