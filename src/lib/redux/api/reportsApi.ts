import { api } from "./baseApi";
import { getReportsDataAction } from "@/app/(app)/reports/actions";

export type ReportsData = Awaited<ReturnType<typeof getReportsDataAction>>;

export const reportsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getReportsData: builder.query<ReportsData, void>({
      query: () => ({ action: getReportsDataAction, args: [] }),
      providesTags: ["Report"],
    }),
  }),
});

export const { useGetReportsDataQuery } = reportsApi;
