"use server";

import { checkAuth } from "@/lib/auth/session";
import { getLoans, type LoanFilters } from "@/lib/services/loans";
import { serializeForClient } from "@/lib/serialize";

export async function getLoansListAction(filters: LoanFilters) {
  const auth = await checkAuth();
  if (!auth.authenticated) {
    throw new Error(auth.error);
  }
  return serializeForClient(await getLoans(filters));
}
