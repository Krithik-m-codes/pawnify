"use client";

import React, { useState, useTransition } from "react";
import { changeOrganizationPlanAction } from "./actions";

interface PlanSelectorClientProps {
  organizationId: string;
  currentPlan: string;
}

export function PlanSelectorClient({ organizationId, currentPlan }: PlanSelectorClientProps) {
  const [selected, setSelected] = useState(currentPlan || "self_hosted");
  const [isPending, startTransition] = useTransition();

  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelected(val);

    const planArg = val === "self_hosted" ? null : val;
    startTransition(async () => {
      await changeOrganizationPlanAction(organizationId, planArg);
    });
  };

  return (
    <select
      value={selected}
      disabled={isPending}
      onChange={handlePlanChange}
      className="text-xs font-semibold rounded-xl border border-(--border-primary) bg-(--bg-primary) px-3 py-1.5 cursor-pointer text-(--text-primary) transition-all"
    >
      <option value="self_hosted">Self-Hosted OSS (Unlimited)</option>
      <option value="starter">Cloud Starter ($49/mo)</option>
      <option value="growth">Cloud Growth ($149/mo)</option>
      <option value="enterprise">Cloud Enterprise ($399/mo)</option>
    </select>
  );
}
