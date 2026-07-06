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

import { prisma } from "@/lib/db";

export async function updateCustomerDetailsAction(
  customerId: string,
  data: {
    fullName: string;
    phone: string;
    email?: string;
    addressLine1: string;
    city: string;
    state: string;
    pincode: string;
  }
) {
  const auth = await checkAuth();
  if (!auth.authenticated || !auth.user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        addressLine1: data.addressLine1.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        pincode: data.pincode.trim(),
      },
    });

    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/customers");
    return { success: true };
  } catch (err: unknown) {
    console.error("Update customer error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update customer details",
    };
  }
}

export async function deleteCustomerAction(customerId: string) {
  const auth = await checkAuth();
  if (!auth.authenticated || !auth.user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const activeLoans = await prisma.loan.count({
      where: { customerId, status: "ACTIVE" },
    });

    if (activeLoans > 0) {
      return {
        success: false,
        error: "Cannot delete customer with active loans. Please close or settle loans first.",
      };
    }

    await prisma.kycDocument.deleteMany({ where: { customerId } });
    await prisma.loanItem.deleteMany({ where: { loan: { customerId } } });
    await prisma.payment.deleteMany({ where: { loan: { customerId } } });
    await prisma.loanCharge.deleteMany({ where: { loan: { customerId } } });
    await prisma.ledgerEntry.deleteMany({ where: { loan: { customerId } } });
    await prisma.followUp.deleteMany({ where: { loan: { customerId } } });
    await prisma.loan.deleteMany({ where: { customerId } });
    await prisma.customer.delete({ where: { id: customerId } });

    revalidatePath("/customers");
    return { success: true };
  } catch (err: unknown) {
    console.error("Delete customer error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete customer",
    };
  }
}

