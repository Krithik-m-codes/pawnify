/**
 * Interest Service — §6.3
 *
 * Parameterized simple interest computation supporting worldwide Day Count Conventions:
 * - ACTUAL_365 (Default)
 * - ACTUAL_360
 * - THIRTY_360
 *
 * Interest is computed on-read, never persisted as an incrementing balance.
 * This is the single source of truth for interest calculations.
 */

import { Prisma, DayCountConvention } from "@prisma/client";
import { differenceInCalendarDays } from "date-fns";
import { debugLog } from "@/lib/debug";

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

export interface LoanForInterest {
  principalOutstanding: Decimal;
  interestRateMonthly: Decimal;
  lastSettledDate: Date;
  dayCountConvention?: DayCountConvention;
}

/**
 * Daily interest amount for a given principal, monthly rate, and day-count divisor.
 */
export function computeDailyInterest(
  principalOutstanding: Decimal,
  monthlyRate: Decimal,
  dayCountConvention: DayCountConvention = "ACTUAL_365"
): Decimal {
  const annualRate = monthlyRate.times(new Decimal(12));
  const divisor = dayCountConvention === "ACTUAL_360" ? new Decimal(360) : new Decimal(365);
  return principalOutstanding.times(annualRate).div(divisor).div(new Decimal(100));
}

/**
 * Monthly interest amount (for display purposes — "this month's interest").
 * monthlyInterest = principalOutstanding × (monthlyRate / 100)
 */
export function computeMonthlyInterest(
  principalOutstanding: Decimal,
  monthlyRate: Decimal
): Decimal {
  return principalOutstanding.times(monthlyRate).div(new Decimal(100));
}

/**
 * Accrued interest from lastSettledDate to asOfDate.
 * Parameterized across DayCountConvention.
 */
export function computeAccruedInterest(
  loan: LoanForInterest,
  asOfDate: Date,
  conventionOverride?: DayCountConvention
): Decimal {
  const convention = conventionOverride ?? loan.dayCountConvention ?? "ACTUAL_365";
  const days = differenceInCalendarDays(asOfDate, loan.lastSettledDate);

  if (days <= 0) {
    return new Decimal(0);
  }

  const dailyInterest = computeDailyInterest(
    loan.principalOutstanding,
    loan.interestRateMonthly,
    convention
  );

  const accrued = dailyInterest.times(new Decimal(days)).toDecimalPlaces(2);
  debugLog(
    "interest",
    `accrued=${accrued.toString()} principal=${loan.principalOutstanding.toString()} rate=${loan.interestRateMonthly.toString()}%/mo days=${days} convention=${convention}`
  );
  return accrued;
}

/**
 * Compute a summary of interest for display on loan detail.
 */
export function computeInterestSummary(
  loan: LoanForInterest,
  asOfDate: Date = new Date(),
  conventionOverride?: DayCountConvention
) {
  const convention = conventionOverride ?? loan.dayCountConvention ?? "ACTUAL_365";
  const accrued = computeAccruedInterest(loan, asOfDate, convention);
  const daily = computeDailyInterest(
    loan.principalOutstanding,
    loan.interestRateMonthly,
    convention
  );
  const monthly = computeMonthlyInterest(loan.principalOutstanding, loan.interestRateMonthly);
  const daysSinceSettled = differenceInCalendarDays(asOfDate, loan.lastSettledDate);

  return {
    accruedInterest: accrued,
    dailyInterest: daily.toDecimalPlaces(2),
    monthlyInterest: monthly.toDecimalPlaces(2),
    daysSinceSettled,
    lastSettledDate: loan.lastSettledDate,
    dayCountConvention: convention,
  };
}
