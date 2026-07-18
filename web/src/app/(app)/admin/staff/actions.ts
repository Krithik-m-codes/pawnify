"use server";

import { revalidatePath } from "next/cache";
import { checkAuth, checkAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { serializeForClient } from "@/lib/serialize";

export async function getStaffListAction() {
  const adminAuth = await checkAdmin();
  if (!adminAuth.authenticated) {
    throw new Error(adminAuth.error);
  }

  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          loansHandled: true,
          paymentsCollected: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formattedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    _count: {
      loansHandled: u._count.loansHandled,
      paymentsCollected: u._count.paymentsCollected,
    },
    createdAt: u.createdAt,
    isSelf: u.id === adminAuth.user.id,
  }));

  return serializeForClient(formattedUsers);
}

export async function createStaffUserAction(formData: unknown) {
  const adminAuth = await checkAuth();
  if (!adminAuth.authenticated || adminAuth.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const data = formData as {
    name: string;
    email: string;
    password: string;
    role: "ADMIN" | "STAFF";
  };
  if (!data.name || !data.email || !data.password) {
    return { success: false, error: "All fields are required" };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return { success: false, error: "A user with this email already exists" };
    }

    // role/isActive are input:false on the user schema (see lib/auth.ts) so signUpEmail
    // always creates a STAFF account regardless of body; promote to ADMIN afterward
    // via a direct write, gated on the adminAuth check above.
    await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
    });

    if (data.role === "ADMIN") {
      await prisma.user.update({
        where: { email: data.email },
        data: { role: "ADMIN" },
      });
    }

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (err: unknown) {
    console.error("Create staff error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create staff member",
    };
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

export async function updateStaffUserAction(
  userId: string,
  data: { name: string; email: string; role: "ADMIN" | "STAFF"; isActive: boolean }
) {
  const adminAuth = await checkAuth();
  if (!adminAuth.authenticated || adminAuth.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  if (userId === adminAuth.user?.id && data.role !== "ADMIN") {
    return {
      success: false,
      error: "You cannot demote your own active admin account to STAFF role.",
    };
  }
  if (userId === adminAuth.user?.id && !data.isActive) {
    return { success: false, error: "You cannot deactivate your own admin account." };
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { email: data.email, id: { not: userId } },
    });
    if (existing) {
      return {
        success: false,
        error: "Another user account is already registered with this email address.",
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (err: unknown) {
    console.error("Update staff details error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update staff account details",
    };
  }
}

export async function deleteStaffUserAction(userId: string) {
  const adminAuth = await checkAuth();
  if (!adminAuth.authenticated || adminAuth.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  if (userId === adminAuth.user.id) {
    return { success: false, error: "You cannot delete your own active admin account" };
  }

  try {
    const handledLoans = await prisma.loan.count({ where: { handledById: userId } });
    if (handledLoans > 0) {
      return {
        success: false,
        error:
          "Cannot delete user who has processed historical loans. Please deactivate their account instead.",
      };
    }

    await prisma.session.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (err: unknown) {
    console.error("Delete staff error:", err);
    return { success: false, error: "Failed to delete staff account" };
  }
}
