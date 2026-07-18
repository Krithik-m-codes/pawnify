import { createApi } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { AxiosRequestConfig, AxiosError } from "axios";
import { axiosClient } from "@/lib/axiosClient";

export type BaseQueryArgs = {
  url?: string;
  method?: AxiosRequestConfig["method"];
  data?: AxiosRequestConfig["data"];
  params?: AxiosRequestConfig["params"];
  headers?: AxiosRequestConfig["headers"];
  // Backward compatibility for server actions if needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action?: (...args: any[]) => Promise<unknown>;
  args?: unknown[];
};

interface ActionErrorShape {
  success: false;
  error: string;
}

function isActionError(data: unknown): data is ActionErrorShape {
  return (
    typeof data === "object" &&
    data !== null &&
    "success" in data &&
    (data as { success: unknown }).success === false
  );
}

const hybridAxiosBaseQuery: BaseQueryFn<BaseQueryArgs, unknown, { message: string; status?: number }> = async ({
  url,
  method = "GET",
  data,
  params,
  headers,
  action,
  args = [],
}) => {
  if (url) {
    try {
      const result = await axiosClient({
        url,
        method,
        data,
        params,
        headers,
      });
      return { data: result.data };
    } catch (axiosError) {
      const err = axiosError as AxiosError<{ message?: string; error?: string }>;
      return {
        error: {
          status: err.response?.status,
          message:
            err.response?.data?.error ||
            err.response?.data?.message ||
            err.message ||
            "Axios request failed",
        },
      };
    }
  }

  try {
    if (!action) {
      return { error: { message: "No url or action provided to baseQuery" } };
    }
    const res = await action(...args);
    if (isActionError(res)) {
      return { error: { message: res.error } };
    }
    return { data: res };
  } catch (err) {
    return {
      error: { message: err instanceof Error ? err.message : "Request failed" },
    };
  }
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: hybridAxiosBaseQuery,
  tagTypes: [
    "Loan",
    "LoanList",
    "Customer",
    "CustomerList",
    "Dashboard",
    "Staff",
    "StaffList",
    "Settings",
    "FollowUp",
    "Report",
    "MarketRate",
    "Profile",
  ],
  endpoints: () => ({}),
});
