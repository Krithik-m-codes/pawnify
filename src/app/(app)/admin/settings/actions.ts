"use server";

import { revalidatePath } from "next/cache";
import { checkAuth } from "@/lib/auth/session";
import { updateSetting } from "@/lib/services/settings";

export async function saveSettingsAction(formData: FormData) {
  const adminAuth = await checkAuth();
  if (!adminAuth.authenticated || adminAuth.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    const keysMap: Record<string, string> = {
      ltv_tier1_max: "ltv.tier1.percent",
      ltv_tier2_max: "ltv.tier2.percent",
      ltv_tier3_max: "ltv.tier3.percent",
      default_interest_monthly: "interest.default.monthly",
      default_grace_days: "grace.period.days",
      pan_required_threshold: "pan.threshold",
    };

    for (const [formKey, dbKey] of Object.entries(keysMap)) {
      const val = formData.get(formKey);
      if (val !== null && val !== undefined) {
        await updateSetting(dbKey, val.toString());
      }
    }

    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    console.error("Save settings error:", err);
    return { success: false, error: "Failed to save system settings" };
  }
}
