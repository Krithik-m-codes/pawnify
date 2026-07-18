import { api } from "./baseApi";
import { MarketRates } from "@/lib/services/market-rates";

export interface MarketRatesApiResponse {
  success: boolean;
  rates: MarketRates;
}

export const marketRatesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMarketRates: builder.query<MarketRates, void>({
      query: () => ({ url: "/market-rates", method: "GET" }),
      transformResponse: (response: MarketRatesApiResponse | MarketRates) => {
        if ("rates" in response && response.rates) {
          return response.rates;
        }
        return response as MarketRates;
      },
      providesTags: ["MarketRate"],
    }),
    refreshMarketRates: builder.mutation<MarketRatesApiResponse, void>({
      query: () => ({ url: "/cron/update-rates", method: "POST" }),
      invalidatesTags: ["MarketRate"],
    }),
  }),
});

export const { useGetMarketRatesQuery, useRefreshMarketRatesMutation } = marketRatesApi;
