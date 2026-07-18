"use server";

import { revalidatePath } from "next/cache";
import { checkAuth } from "@/lib/auth/session";
import { createCustomer } from "@/lib/services/customers";
import { customerCreateSchema } from "@/lib/validation/customer";
import { prisma } from "@/lib/db";

export async function createCustomerAction(formData: unknown) {
  const auth = await checkAuth();
  if (!auth.authenticated || !auth.user) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const parsed = customerCreateSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid customer data",
    };
  }

  try {
    const staff = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { organizationId: true },
    });
    let orgId = staff?.organizationId;
    if (!orgId) {
      const firstOrg = await prisma.organization.findFirst();
      if (!firstOrg) return { success: false, error: "No organization configured" };
      orgId = firstOrg.id;
    }

    const customer = await createCustomer(
      {
        organizationId: orgId,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email,
        dob: parsed.data.dob,
        addressLine1: parsed.data.addressLine1,
        addressLine2: parsed.data.addressLine2,
        city: parsed.data.city,
        state: parsed.data.state,
        pincode: parsed.data.pincode,
        photoUrl: parsed.data.photoUrl,
      },
      auth.user.id
    );

    revalidatePath("/customers");
    return { success: true, customerId: customer.id };
  } catch (err: unknown) {
    console.error("Failed to create customer:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create customer",
    };
  }
}
