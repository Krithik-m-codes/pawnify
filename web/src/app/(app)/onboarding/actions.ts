"use server";

import { prisma } from "@/lib/db";
import { WeightUnit, PurityExpression, DayCountConvention } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface SavePolicyInput {
  organizationId?: string;
  currencyCode: string;
  currencySymbol: string;
  weightUnit: WeightUnit;
  purityExpression: PurityExpression;
  dayCountConvention: DayCountConvention;
  gracePeriodDays: number;
  mandatoryIdThreshold: number;
  ltvTiers: Array<{ maxValue: number | null; ltvPercent: number }>;
}

export async function saveLoanPolicyAction(input: SavePolicyInput) {
  try {
    let orgId = input.organizationId;
    if (!orgId) {
      const firstOrg = await prisma.organization.findFirst();
      if (!firstOrg) {
        throw new Error("No organization found. Please run database seed or create an organization first.");
      }
      orgId = firstOrg.id;
    }

    const policy = await prisma.loanPolicy.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        currencyCode: input.currencyCode,
        currencySymbol: input.currencySymbol,
        weightUnit: input.weightUnit,
        purityExpression: input.purityExpression,
        dayCountConvention: input.dayCountConvention,
        gracePeriodDays: input.gracePeriodDays,
        mandatoryIdThreshold: input.mandatoryIdThreshold,
        ltvTiers: input.ltvTiers,
      },
      update: {
        currencyCode: input.currencyCode,
        currencySymbol: input.currencySymbol,
        weightUnit: input.weightUnit,
        purityExpression: input.purityExpression,
        dayCountConvention: input.dayCountConvention,
        gracePeriodDays: input.gracePeriodDays,
        mandatoryIdThreshold: input.mandatoryIdThreshold,
        ltvTiers: input.ltvTiers,
      },
    });

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");

    return { success: true, policyId: policy.id };
  } catch (err: unknown) {
    console.error("Error saving loan policy:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save loan policy",
    };
  }
}
