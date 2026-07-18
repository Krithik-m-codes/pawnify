-- Pawnify - Load-Bearing Row-Level Security (RLS) Policies
-- Enforces tenant isolation ("organizationId") at the PostgreSQL layer.
-- Compatible with Supabase JWT claims (auth.uid()) and custom session variables.

-- ==========================================
-- 1. ENABLE ROW LEVEL SECURITY ON TENANT TABLES
-- ==========================================

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoanPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KycDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Loan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoanItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoanCharge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FollowUp" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. HELPER FUNCTION FOR CURRENT ORG CHECK
-- ==========================================

CREATE OR REPLACE FUNCTION current_user_organization_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_organization_id', true), ''),
    (SELECT "organizationId" FROM "user" WHERE id = auth.uid() LIMIT 1)
  );
$$;

-- ==========================================
-- 3. POLICIES FOR ORGANIZATION
-- ==========================================

CREATE POLICY "Users can view their own Organization"
ON "Organization"
FOR SELECT
USING (
  id = current_user_organization_id()
);

-- ==========================================
-- 4. POLICIES FOR TENANT DOMAIN TABLES
-- ==========================================

-- Branch
CREATE POLICY "Tenant isolation for Branch"
ON "Branch"
FOR ALL
USING ("organizationId" = current_user_organization_id())
WITH CHECK ("organizationId" = current_user_organization_id());

-- LoanPolicy
CREATE POLICY "Tenant isolation for LoanPolicy"
ON "LoanPolicy"
FOR ALL
USING ("organizationId" = current_user_organization_id())
WITH CHECK ("organizationId" = current_user_organization_id());

-- DocumentType
CREATE POLICY "Tenant isolation for DocumentType"
ON "DocumentType"
FOR ALL
USING ("organizationId" = current_user_organization_id())
WITH CHECK ("organizationId" = current_user_organization_id());

-- Customer
CREATE POLICY "Tenant isolation for Customer"
ON "Customer"
FOR ALL
USING ("organizationId" = current_user_organization_id())
WITH CHECK ("organizationId" = current_user_organization_id());

-- KycDocument
CREATE POLICY "Tenant isolation for KycDocument"
ON "KycDocument"
FOR ALL
USING ("organizationId" = current_user_organization_id())
WITH CHECK ("organizationId" = current_user_organization_id());

-- Loan
CREATE POLICY "Tenant isolation for Loan"
ON "Loan"
FOR ALL
USING ("organizationId" = current_user_organization_id())
WITH CHECK ("organizationId" = current_user_organization_id());

-- LoanItem
CREATE POLICY "Tenant isolation for LoanItem"
ON "LoanItem"
FOR ALL
USING ("organizationId" = current_user_organization_id())
WITH CHECK ("organizationId" = current_user_organization_id());

-- LoanCharge
CREATE POLICY "Tenant isolation for LoanCharge"
ON "LoanCharge"
FOR ALL
USING ("organizationId" = current_user_organization_id())
WITH CHECK ("organizationId" = current_user_organization_id());

-- Payment
CREATE POLICY "Tenant isolation for Payment"
ON "Payment"
FOR ALL
USING ("organizationId" = current_user_organization_id())
WITH CHECK ("organizationId" = current_user_organization_id());

-- LedgerEntry
CREATE POLICY "Tenant isolation for LedgerEntry"
ON "LedgerEntry"
FOR ALL
USING ("organizationId" = current_user_organization_id())
WITH CHECK ("organizationId" = current_user_organization_id());

-- FollowUp
CREATE POLICY "Tenant isolation for FollowUp"
ON "FollowUp"
FOR ALL
USING ("organizationId" = current_user_organization_id())
WITH CHECK ("organizationId" = current_user_organization_id());
