import { describe, it, expect } from "vitest";
import { computeItemValuation } from "@/lib/services/valuation";
import { computeAccruedInterest } from "@/lib/services/interest";
import { Prisma } from "@prisma/client";

const Decimal = Prisma.Decimal;

describe("Worldwide Jurisdiction Unit Conversions & Valuation (§Phase 5)", () => {
  it("converts Troy Ounce (oz t) accurately using 31.1034768 grams equivalence", () => {
    // 1 Troy Ounce of 24K Gold (100% pure) at $80/gram valuation rate
    const result = computeItemValuation({
      grossWeightGrams: 1,
      stoneWeightGrams: 0,
      purityPercent: 100,
      valuationRatePerGram: 80,
      weightUnit: "TROY_OUNCE",
    });

    // 1 oz t -> 31.1035 grams
    // 31.1035 * 80 = 2488.28
    expect(result.netWeightGrams.toFixed(4)).toBe("31.1035");
    expect(result.assessedValue.toFixed(2)).toBe("2488.28");
  });

  it("converts Tola accurately using 11.6638038 grams equivalence", () => {
    // 10 Tolas of 22K Gold (91.6667%) at ₹7000/gram
    const result = computeItemValuation({
      grossWeightGrams: 10,
      stoneWeightGrams: 0,
      purityPercent: 91.6667,
      valuationRatePerGram: 7000,
      weightUnit: "TOLA",
    });

    // 10 Tola -> 116.6380 grams
    expect(result.netWeightGrams.toFixed(4)).toBe("116.6380");
    // Assessed value = fineWeight * 7000
    expect(result.assessedValue.toNumber()).toBeGreaterThan(700000);
  });

  it("handles Millesimal Fineness (999 Fine Silver = 99.9%) correctly", () => {
    const result = computeItemValuation({
      grossWeightGrams: 100,
      stoneWeightGrams: 0,
      purityPercent: 99.9,
      valuationRatePerGram: 90,
    });

    expect(result.fineWeightGrams.toFixed(4)).toBe("99.9000");
    expect(result.assessedValue.toString()).toBe("8991");
  });
});

describe("Worldwide Day Count Conventions (§Phase 5)", () => {
  it("computes different accrued interest between ACTUAL_365 and ACTUAL_360", () => {
    const loan = {
      principalOutstanding: new Decimal(10000),
      interestRateMonthly: new Decimal(1.5), // 1.5% monthly -> 18% annual
      lastSettledDate: new Date("2026-01-01T00:00:00Z"),
    };

    const asOfDate = new Date("2026-01-31T00:00:00Z"); // 30 calendar days

    const interest365 = computeAccruedInterest(
      loan,
      asOfDate,
      "ACTUAL_365"
    );

    const interest360 = computeAccruedInterest(
      loan,
      asOfDate,
      "ACTUAL_360"
    );

    // ACTUAL_365: 10000 * 0.18 * (30/365) = 147.95
    expect(interest365.toFixed(2)).toBe("147.95");

    // ACTUAL_360: 10000 * 0.18 * (30/360) = 150.00
    expect(interest360.toFixed(2)).toBe("150.00");
  });
});
