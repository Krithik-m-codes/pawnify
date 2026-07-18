# Pawnify Target Multi-Tenant Schema Blueprint

## Multi-Tenant Hierarchy
```
Organization (Tenant Root)
 ├─1:N─> Branch (Physical shop locations)
 ├─1:1─> LoanPolicy (Currency, weight unit, purity expression, LTV slabs, mandatory ID rule)
 ├─1:N─> DocumentType (Configurable KYC document definitions)
 ├─1:N─> User (Staff / Org Admins scoped to Organization & Branch)
 ├─1:N─> Customer (Borrowers scoped to Organization)
 │         ├─1:N─> KycDocument
 │         └─1:N─> Loan
 │                   ├─1:N─> LoanItem
 │                   ├─1:N─> LoanCharge
 │                   ├─1:N─> Payment
 │                   ├─1:N─> LedgerEntry
 │                   └─1:N─> FollowUp
```

## Proposed Core Enums & Tenant Models
```prisma
enum WeightUnit         { GRAM TROY_OUNCE TOLA }
enum PurityExpression   { KARAT MILLESIMAL_FINENESS PERCENTAGE }
enum DayCountConvention { ACTUAL_365 ACTUAL_360 THIRTY_360 }

model Organization {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  billingPlan   String?  // null in self-hosted deployments; "starter" | "growth" | "enterprise" | "trial" in cloud
  createdAt     DateTime @default(now())

  branches      Branch[]
  users         user[]
  customers     Customer[]
  loanPolicy    LoanPolicy?
  documentTypes DocumentType[]
}

model Branch {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  address        String?
  users          user[]
}

model LoanPolicy {
  id                   String             @id @default(cuid())
  organizationId       String             @unique
  organization         Organization       @relation(fields: [organizationId], references: [id])
  currencyCode         String             @default("USD")  // ISO 4217
  currencySymbol       String             @default("$")
  weightUnit           WeightUnit         @default(GRAM)
  purityExpression     PurityExpression   @default(KARAT)
  dayCountConvention   DayCountConvention @default(ACTUAL_365)
  gracePeriodDays      Int                @default(7)
  mandatoryIdThreshold Decimal            @db.Decimal(12, 2) @default(0)  // 0 = disabled
  mandatoryIdDocTypeId String?
  ltvTiers             Json               // [{ maxValue: number | null, ltvPercent: number }], ascending
}

model DocumentType {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String       // "Passport", "Aadhaar", "SSN", "Driver's License"
  isPrimaryId    Boolean      @default(false)
  maskingRule    String?      // e.g. "last4"
}
```
