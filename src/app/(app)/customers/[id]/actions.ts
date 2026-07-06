"use server";

import { revalidatePath } from "next/cache";
import { checkAuth } from "@/lib/auth/session";
import { addKycDocument, updateKycStatus } from "@/lib/services/customers";
import { kycDocumentSchema } from "@/lib/validation/customer";
import { KycStatus } from "@prisma/client";

export async function addKycDocumentAction(customerId: string, formData: unknown) {
  const auth = await checkAuth();
  if (!auth.authenticated || !auth.user) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = kycDocumentSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid document data",
    };
  }

  try {
    const doc = await addKycDocument(
      customerId,
      parsed.data.docType,
      parsed.data.docNumber,
      parsed.data.fileUrl
    );

    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/customers");
    return { success: true, docId: doc.id };
  } catch (err: unknown) {
    console.error("Add KYC doc error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add document",
    };
  }
}

export async function verifyKycDocumentAction(docId: string, customerId: string, status: KycStatus) {
  const auth = await checkAuth();
  if (!auth.authenticated || !auth.user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await updateKycStatus(docId, status, auth.user.id);
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/customers");
    return { success: true };
  } catch (err: unknown) {
    console.error("Update KYC status error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update KYC status",
    };
  }
}
