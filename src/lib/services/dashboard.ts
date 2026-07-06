/**
 * Dashboard Service — KPI aggregations and quick-access queries.
 * "Overdue" is derived at query time, never stored.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deriveLoanDisplayStatus } from "./loans";

const Decimal = Prisma.Decimal;

export async function getDashboardStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);

  // Fetch all active loans for status derivation
  const activeLoans = await prisma.loan.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      principalOutstanding: true,
      dueDate: true,
      gracePeriodDays: true,
      status: true,
    },
  });

  // Derive overdue vs active
  let activeCount = 0;
  let overdueCount = 0;
  let totalAUM = new Decimal(0);
  let overdueAmount = new Decimal(0);
  let dueIn7Days = 0;
  let dueIn30Days = 0;

  for (const loan of activeLoans) {
    const displayStatus = deriveLoanDisplayStatus(loan);
    totalAUM = totalAUM.plus(loan.principalOutstanding);

    if (displayStatus === "OVERDUE") {
      overdueCount++;
      overdueAmount = overdueAmount.plus(loan.principalOutstanding);
    } else {
      activeCount++;
    }

    // Check upcoming due dates
    if (loan.dueDate >= today && loan.dueDate <= in7Days) {
      dueIn7Days++;
    }
    if (loan.dueDate >= today && loan.dueDate <= in30Days) {
      dueIn30Days++;
    }
  }

  // Disbursed today / this week
  const [disbursedToday, disbursedWeek] = await Promise.all([
    prisma.loan.aggregate({
      where: { loanDate: { gte: today } },
      _sum: { principalAmount: true },
      _count: true,
    }),
    prisma.loan.aggregate({
      where: { loanDate: { gte: weekAgo } },
      _sum: { principalAmount: true },
      _count: true,
    }),
  ]);

  // Recent loans
  const recentLoans = await prisma.loan.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { fullName: true, phone: true } },
    },
  });

  // Overdue loans for attention
  const overdueLoans = activeLoans
    .filter((l) => deriveLoanDisplayStatus(l) === "OVERDUE")
    .slice(0, 10);

  const overdueLoansDetailed = overdueLoans.length > 0
    ? await prisma.loan.findMany({
        where: { id: { in: overdueLoans.map((l) => l.id) } },
        include: {
          customer: { select: { fullName: true, phone: true } },
        },
        orderBy: { dueDate: "asc" },
      })
    : [];

  // Closed loans count
  const closedCount = await prisma.loan.count({
    where: { status: "CLOSED" },
  });

  // Total customers
  const customerCount = await prisma.customer.count();

  // Collections today
  const collectionsToday = await prisma.payment.aggregate({
    where: { paymentDate: { gte: today } },
    _sum: { amountPaid: true },
    _count: true,
  });

  return {
    activeCount,
    overdueCount,
    closedCount,
    totalAUM: totalAUM.toString(),
    overdueAmount: overdueAmount.toString(),
    dueIn7Days,
    dueIn30Days,
    disbursedToday: {
      count: disbursedToday._count,
      amount: disbursedToday._sum.principalAmount?.toString() ?? "0",
    },
    disbursedWeek: {
      count: disbursedWeek._count,
      amount: disbursedWeek._sum.principalAmount?.toString() ?? "0",
    },
    collectionsToday: {
      count: collectionsToday._count,
      amount: collectionsToday._sum.amountPaid?.toString() ?? "0",
    },
    recentLoans: recentLoans.map((l) => ({
      ...l,
      displayStatus: deriveLoanDisplayStatus(l),
    })),
    overdueLoans: overdueLoansDetailed.map((l) => ({
      ...l,
      displayStatus: "OVERDUE" as const,
    })),
    customerCount,
  };
}

export async function getDashboardChartData() {
  const allLoans = await prisma.loan.findMany({
    include: {
      items: { select: { metalType: true, assessedValue: true } },
    },
  });
  const allPayments = await prisma.payment.findMany();

  // 1. Metal Breakdown
  let goldCount = 0;
  let silverCount = 0;
  let goldValue = new Decimal(0);
  let silverValue = new Decimal(0);

  for (const loan of allLoans) {
    for (const item of loan.items) {
      if (item.metalType === "GOLD") {
        goldCount++;
        goldValue = goldValue.plus(item.assessedValue);
      } else {
        silverCount++;
        silverValue = silverValue.plus(item.assessedValue);
      }
    }
  }

  // 2. Status Breakdown
  let activeVal = new Decimal(0);
  let overdueVal = new Decimal(0);
  let closedVal = new Decimal(0);
  let activeCnt = 0;
  let overdueCnt = 0;
  let closedCnt = 0;

  for (const loan of allLoans) {
    const st = deriveLoanDisplayStatus(loan);
    if (st === "OVERDUE") {
      overdueCnt++;
      overdueVal = overdueVal.plus(loan.principalOutstanding);
    } else if (st === "CLOSED" || loan.status === "CLOSED") {
      closedCnt++;
      closedVal = closedVal.plus(loan.principalAmount);
    } else {
      activeCnt++;
      activeVal = activeVal.plus(loan.principalOutstanding);
    }
  }

  // 3. Monthly Disbursed vs Collected (Last 6 Months)
  const monthlyData: Record<string, { month: string; disbursed: number; collected: number }> = {};
  const now = new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
    monthlyData[key] = { month: key, disbursed: 0, collected: 0 };
  }

  for (const loan of allLoans) {
    const d = new Date(loan.loanDate);
    const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
    if (monthlyData[key]) {
      monthlyData[key].disbursed += Number(loan.principalAmount);
    }
  }

  for (const pay of allPayments) {
    const d = new Date(pay.paymentDate);
    const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
    if (monthlyData[key]) {
      monthlyData[key].collected += Number(pay.amountPaid);
    }
  }

  return {
    metalBreakdown: [
      { name: "Gold Loans", count: goldCount, value: Number(goldValue), fill: "#16a34a" },
      { name: "Silver Loans", count: silverCount, value: Number(silverValue), fill: "#86efac" },
    ],
    statusBreakdown: [
      { name: "Active", count: activeCnt, value: Number(activeVal), fill: "#22c55e" },
      { name: "Overdue", count: overdueCnt, value: Number(overdueVal), fill: "#f43f5e" },
      { name: "Closed", count: closedCnt, value: Number(closedVal), fill: "#94a3b8" },
    ],
    monthlyTrend: Object.values(monthlyData),
  };
}

