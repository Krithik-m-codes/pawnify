"use server";

import { checkAuth } from "@/lib/auth/session";
import { getDashboardStats, getDashboardChartData } from "@/lib/services/dashboard";
import { serializeForClient } from "@/lib/serialize";

export async function getDashboardDataAction() {
  const auth = await checkAuth();
  if (!auth.authenticated) {
    throw new Error(auth.error);
  }

  const [stats, chartData] = await Promise.all([getDashboardStats(), getDashboardChartData()]);

  return serializeForClient({ stats, chartData });
}
