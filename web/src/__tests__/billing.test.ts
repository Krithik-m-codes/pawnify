import { describe, it, expect } from "vitest";
import { getPlanConfig, PLAN_QUOTAS } from "@/lib/services/billing";

describe("SaaS & Self-Hosted Billing Plan Quotas (§Phase 4)", () => {
  it("defaults to Self-Hosted Community plan with UNLIMITED resource limits when plan is null or undefined", () => {
    const nullPlan = getPlanConfig(null);
    const undefinedPlan = getPlanConfig(undefined);

    expect(nullPlan.name).toBe("Self-Hosted Community");
    expect(nullPlan.maxActiveLoans).toBe(Infinity);
    expect(nullPlan.maxBranches).toBe(Infinity);
    expect(nullPlan.monthlyPriceUSD).toBe(0);

    expect(undefinedPlan).toEqual(nullPlan);
  });

  it("returns Starter plan quotas (100 loans, 1 branch) for 'starter'", () => {
    const starter = getPlanConfig("starter");
    expect(starter.name).toBe("Cloud Starter");
    expect(starter.maxActiveLoans).toBe(100);
    expect(starter.maxBranches).toBe(1);
    expect(starter.monthlyPriceUSD).toBe(49);
  });

  it("returns Growth plan quotas (1,000 loans, 5 branches) for 'growth'", () => {
    const growth = getPlanConfig("growth");
    expect(growth.name).toBe("Cloud Growth");
    expect(growth.maxActiveLoans).toBe(1000);
    expect(growth.maxBranches).toBe(5);
    expect(growth.monthlyPriceUSD).toBe(149);
  });

  it("returns Enterprise plan quotas (unlimited loans & branches) for 'enterprise'", () => {
    const enterprise = getPlanConfig("enterprise");
    expect(enterprise.name).toBe("Cloud Enterprise");
    expect(enterprise.maxActiveLoans).toBe(Infinity);
    expect(enterprise.maxBranches).toBe(Infinity);
    expect(enterprise.monthlyPriceUSD).toBe(399);
  });
});
