"use server";

import { revalidatePath } from "next/cache";
import { checkAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function createStaffUserAction(formData: unknown) {
  const adminAuth = await checkAuth();
  if (!adminAuth.authenticated || adminAuth.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const data = formData as { name: string; email: string; password: string; role: "ADMIN" | "STAFF" };
  if (!data.name || !data.email || !data.password) {
    return { success: false, error: "All fields are required" };
  }

  try {
    // Check existing
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return { success: false, error: "A user with this email already exists" };
    }

    // Use Better Auth server API to create user with password
    await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role || "STAFF",
      },
    });

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (err: unknown) {
    console.error("Create staff error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create staff member" };
  }
}

export async function updateStaffStatusAction(userId: string, isActive: boolean) {
  const adminAuth = await checkAuth();
  if (!adminAuth.authenticated || adminAuth.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  if (userId === adminAuth.user.id) {
    return { success: false, error: "You cannot deactivate your own admin account" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (err: unknown) {
    console.error("Update staff status error:", err);
    return { success: false, error: "Failed to update user status" };
  }
}
