"use server";

import { revalidatePath } from "next/cache";
import { checkAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { updateOrganizationPlan } from "@/lib/services/billing";

export async function changeOrganizationPlanAction(
  organizationId: string,
  newPlan: string | null
) {
  const auth = await checkAuth();
  if (!auth.authenticated || !auth.user) {
    return { success: false, error: "Unauthorized" };
  }

  // Ensure user is an admin or operator
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL;
  if (adminEmail && auth.user.email !== adminEmail) {
    // Check if user is organization ADMIN
    const userOrg = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { role: true },
    });
    if (userOrg?.role !== "ADMIN") {
      return { success: false, error: "Insufficient operator privileges" };
    }
  }

  try {
    await updateOrganizationPlan(organizationId, newPlan);
    revalidatePath("/platform-admin");
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to change organization plan:", err);
    return { success: false, error: "Failed to update billing plan" };
  }
}
