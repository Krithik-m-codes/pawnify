/**
 * Billing & Plan Quota Enforcement Service — Phase 4
 *
 * Handles subscription limits for Cloud SaaS organizations while allowing
 * self-hosted open-source deployments (billingPlan = null) unlimited resource quotas.
 */

import { prisma } from "@/lib/db";

export interface PlanQuotaConfig {
  id: string | null;
  name: string;
  maxActiveLoans: number;
  maxBranches: number;
  monthlyPriceUSD: number;
  description: string;
}

export const PLAN_QUOTAS: Record<string, PlanQuotaConfig> = {
  self_hosted: {
    id: null,
    name: "Self-Hosted Community",
    maxActiveLoans: Infinity,
    maxBranches: Infinity,
    monthlyPriceUSD: 0,
    description: "Free forever self-hosted deployment under BSL 1.1 / MIT.",
  },
  starter: {
    id: "starter",
    name: "Cloud Starter",
    maxActiveLoans: 100,
    maxBranches: 1,
    monthlyPriceUSD: 49,
    description: "Ideal for single-branch boutique pawnbrokers.",
  },
  growth: {
    id: "growth",
    name: "Cloud Growth",
    maxActiveLoans: 1000,
    maxBranches: 5,
    monthlyPriceUSD: 149,
    description: "Designed for expanding multi-branch asset lenders.",
  },
  enterprise: {
    id: "enterprise",
    name: "Cloud Enterprise",
    maxActiveLoans: Infinity,
    maxBranches: Infinity,
    monthlyPriceUSD: 399,
    description: "Unlimited scale with dedicated institutional SLA.",
  },
};

/**
 * Get plan configuration for a given billing plan code.
 * If plan is null or unrecognised, defaults to self_hosted (unlimited).
 */
export function getPlanConfig(billingPlan: string | null | undefined): PlanQuotaConfig {
  if (!billingPlan) {
    return PLAN_QUOTAS.self_hosted;
  }
  const key = billingPlan.toLowerCase();
  return PLAN_QUOTAS[key] || PLAN_QUOTAS.self_hosted;
}

/**
 * Verify that an organization can create a new active loan under its plan quota.
 */
export async function checkCanCreateLoan(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { billingPlan: true, name: true },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  const plan = getPlanConfig(org.billingPlan);
  if (plan.maxActiveLoans === Infinity) {
    return;
  }

  const activeCount = await prisma.loan.count({
    where: {
      organizationId,
      status: "ACTIVE",
    },
  });

  if (activeCount >= plan.maxActiveLoans) {
    throw new Error(
      `Plan quota reached: Organization "${org.name}" is on the ${plan.name} plan (max ${plan.maxActiveLoans} active loans). Please upgrade to Growth or Enterprise to create more loans.`
    );
  }
}

/**
 * Verify that an organization can create a new branch under its plan quota.
 */
export async function checkCanCreateBranch(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { billingPlan: true, name: true },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  const plan = getPlanConfig(org.billingPlan);
  if (plan.maxBranches === Infinity) {
    return;
  }

  const branchCount = await prisma.branch.count({
    where: { organizationId },
  });

  if (branchCount >= plan.maxBranches) {
    throw new Error(
      `Plan quota reached: Organization "${org.name}" is on the ${plan.name} plan (max ${plan.maxBranches} branches). Please upgrade to add more branches.`
    );
  }
}

/**
 * Update an organization's subscription billing plan.
 */
export async function updateOrganizationPlan(
  organizationId: string,
  newPlan: string | null
) {
  return await prisma.organization.update({
    where: { id: organizationId },
    data: { billingPlan: newPlan },
  });
}
