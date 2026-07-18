"use server";

import { checkAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";

export async function getReportsDataAction() {
  const auth = await checkAuth();
  if (!auth.authenticated) {
    throw new Error(auth.error);
  }

  const allLoans = await prisma.loan.findMany({
    include: { items: { select: { metalType: true, assessedValue: true } } },
  });

  const allPayments = await prisma.payment.findMany();
  const allCharges = await prisma.loanCharge.findMany();

  // Aggregations
  let activeCount = 0;
  let overdueCount = 0;
  let closedCount = 0;
  let totalActiveAUM = 0;

  let goldLoansCount = 0;
  let silverLoansCount = 0;
  let goldAssessedValue = 0;
  let silverAssessedValue = 0;

  let ltv85Count = 0;
  let ltv80Count = 0;
  let ltv75Count = 0;

  const today = new Date();

  for (const loan of allLoans) {
    const principal = parseFloat(loan.principalOutstanding.toString());
    const assessed = parseFloat(loan.totalAssessedValue.toString());
    const ltv = parseFloat(loan.ltvPercent.toString());

    if (loan.status === "CLOSED") {
      closedCount++;
    } else {
      totalActiveAUM += principal;
      const graceDueDate = new Date(loan.dueDate);
      graceDueDate.setDate(graceDueDate.getDate() + loan.gracePeriodDays);
      if (today > graceDueDate) overdueCount++;
      else activeCount++;
    }

    if (ltv >= 85) ltv85Count++;
    else if (ltv >= 80) ltv80Count++;
    else ltv75Count++;

    const isGold = loan.items.some((i) => i.metalType === "GOLD");
    const isSilver = loan.items.some((i) => i.metalType === "SILVER");

    if (isGold) {
      goldLoansCount++;
      goldAssessedValue += assessed;
    }
    if (isSilver && !isGold) {
      silverLoansCount++;
      silverAssessedValue += assessed;
    }
  }

  let totalCollected = 0;
  let interestCollected = 0;
  let principalCollected = 0;
  let chargesCollected = 0;

  for (const p of allPayments) {
    totalCollected += parseFloat(p.amountPaid.toString());
    interestCollected += parseFloat(p.allocatedInterest.toString());
    principalCollected += parseFloat(p.allocatedPrincipal.toString());
    chargesCollected += parseFloat(p.allocatedCharges.toString());
  }

  const totalDisbursed = allLoans.reduce(
    (sum, l) => sum + parseFloat(l.principalAmount.toString()),
    0
  );

  return serializeForClient({
    totalLoansCount: allLoans.length,
    totalPaymentsCount: allPayments.length,
    totalChargesCount: allCharges.length,
    activeCount,
    overdueCount,
    closedCount,
    totalActiveAUM,
    goldLoansCount,
    silverLoansCount,
    goldAssessedValue,
    silverAssessedValue,
    ltv85Count,
    ltv80Count,
    ltv75Count,
    totalCollected,
    interestCollected,
    principalCollected,
    chargesCollected,
    totalDisbursed,
  });
}
