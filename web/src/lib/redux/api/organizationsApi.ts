import { api } from "./baseApi";

export interface OrganizationPolicy {
  organizationId: string;
  currencyCode: string;
  currencySymbol: string;
  gracePeriodDays: number;
  mandatoryIdThreshold: number;
  safetyMarginPercent: number;
  ltvTier1Percent: number;
  ltvTier2Percent: number;
  ltvTier3Percent: number;
  ltvTier1Max: number;
  ltvTier2Max: number;
  defaultInterestMonthly: number;
  ltvTiers?: Array<{ maxValue: number | null; ltvPercent: number }>;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "BRANCH_MANAGER" | "STAFF";
  phone?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export const organizationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getOrganizationPolicy: builder.query<OrganizationPolicy, string>({
      query: (orgId) => ({
        url: `/organizations/${orgId}/policy`,
        method: "GET",
      }),
      providesTags: (_result, _err, orgId) => [{ type: "Settings", id: orgId }],
    }),

    updateOrganizationPolicy: builder.mutation<
      OrganizationPolicy,
      { orgId: string; data: Partial<OrganizationPolicy> }
    >({
      query: ({ orgId, data }) => ({
        url: `/organizations/${orgId}/policy`,
        method: "PUT",
        data,
      }),
      invalidatesTags: (_result, _err, { orgId }) => [
        { type: "Settings", id: orgId },
        "Settings",
      ],
    }),

    getTeamMembers: builder.query<TeamMember[], string>({
      query: (orgId) => ({
        url: `/organizations/${orgId}/members`,
        method: "GET",
      }),
      providesTags: [{ type: "StaffList", id: "LIST" }],
    }),

    inviteTeamMember: builder.mutation<
      TeamMember,
      {
        orgId: string;
        email: string;
        name: string;
        role: "OWNER" | "ADMIN" | "BRANCH_MANAGER" | "STAFF";
        branchId?: string;
      }
    >({
      query: ({ orgId, ...data }) => ({
        url: `/organizations/${orgId}/members/invite`,
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "StaffList", id: "LIST" }],
    }),

    updateTeamMemberRole: builder.mutation<
      TeamMember,
      { orgId: string; userId: string; role: string }
    >({
      query: ({ orgId, userId, role }) => ({
        url: `/organizations/${orgId}/members/${userId}/role`,
        method: "PATCH",
        data: { role },
      }),
      invalidatesTags: [{ type: "StaffList", id: "LIST" }],
    }),

    removeTeamMember: builder.mutation<
      { success: boolean },
      { orgId: string; userId: string }
    >({
      query: ({ orgId, userId }) => ({
        url: `/organizations/${orgId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "StaffList", id: "LIST" }],
    }),
  }),
});

export const {
  useGetOrganizationPolicyQuery,
  useUpdateOrganizationPolicyMutation,
  useGetTeamMembersQuery,
  useInviteTeamMemberMutation,
  useUpdateTeamMemberRoleMutation,
  useRemoveTeamMemberMutation,
} = organizationsApi;
