import { api } from "./baseApi";
import { getDashboardDataAction } from "@/app/(app)/dashboard/actions";

export type DashboardData = Awaited<ReturnType<typeof getDashboardDataAction>>;

export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardData: builder.query<DashboardData, void>({
      query: () => ({ action: getDashboardDataAction, args: [] }),
      providesTags: ["Dashboard"],
    }),
  }),
});

export const { useGetDashboardDataQuery } = dashboardApi;
