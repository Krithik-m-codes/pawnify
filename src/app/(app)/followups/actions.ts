"use server";

import { revalidatePath } from "next/cache";
import { checkAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { FollowUpStatus } from "@prisma/client";

export async function createFollowUpAction(loanId: string, note: string, dueDateStr: string) {
  const auth = await checkAuth();
  if (!auth.authenticated || !auth.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!note.trim()) {
    return { success: false, error: "Note is required" };
  }

  try {
    await prisma.followUp.create({
      data: {
        loanId,
        note: note.trim(),
        dueDate: new Date(dueDateStr),
        status: "PENDING",
        assignedToId: auth.user.id,
      },
    });

    revalidatePath("/followups");
    revalidatePath(`/loans/${loanId}`);
    return { success: true };
  } catch (err: unknown) {
    console.error("Create follow-up error:", err);
    return { success: false, error: "Failed to create follow-up task" };
  }
}

export async function updateFollowUpStatusAction(id: string, status: FollowUpStatus) {
  const auth = await checkAuth();
  if (!auth.authenticated || !auth.user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const f = await prisma.followUp.update({
      where: { id },
      data: {
        status,
      },
    });

    revalidatePath("/followups");
    revalidatePath(`/loans/${f.loanId}`);
    return { success: true };
  } catch (err: unknown) {
    console.error("Update follow-up error:", err);
    return { success: false, error: "Failed to update follow-up status" };
  }
}
