import React from "react";
import { checkAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-client";
import { redirect } from "next/navigation";

export const metadata = {
  title: "System & LTV Settings | Pawnify Admin",
};

export default async function SettingsPage() {
  const auth = await checkAuth();
  if (!auth.authenticated || auth.user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const allSettings = await prisma.appSetting.findMany();
  const settingsMap: Record<string, string> = {};
  for (const s of allSettings) {
    settingsMap[s.key] = s.value;
  }

  const initialSettings = {
    ltv_tier1_max: settingsMap["ltv.tier1.percent"] || "85.0",
    ltv_tier2_max: settingsMap["ltv.tier2.percent"] || "80.0",
    ltv_tier3_max: settingsMap["ltv.tier3.percent"] || "75.0",
    default_interest_monthly: settingsMap["interest.default.monthly"] || "1.5",
    default_grace_days: settingsMap["grace.period.days"] || "7",
    pan_required_threshold: settingsMap["pan.threshold"] || "50000",
  };

  return (
    <div>
      <PageHeader
        title="System Parameters & RBI LTV Configuration"
        description="Configure regulatory tiered LTV caps, default monthly simple interest rates, grace periods, and KYC thresholds."
      />

      <SettingsForm initialSettings={initialSettings} />
    </div>
  );
}
