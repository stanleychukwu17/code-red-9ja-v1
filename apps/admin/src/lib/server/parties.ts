import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export const getParties = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      return await apiFetchJson(API_URL.parties);
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch parties from API",
      };
    }
  },
);

export const getPartyById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.partyById(id));
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch party details",
      };
    }
  });

export const createParty = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      short_name: string;
      name: string;
      logo: string;
      logo_file_id?: number;
      display_order?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.parties, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to create party",
      };
    }
  });

export const updateParty = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string | number;
      short_name: string;
      name: string;
      logo: string;
      logo_file_id?: number;
      display_order?: number;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      return await apiFetchJson(API_URL.partyById(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to update party",
      };
    }
  });

export const deleteParty = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.partyById(id), {
        method: "DELETE",
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to delete party",
      };
    }
  });

export const getPresignedUploadURL = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      original_name: string;
      mime_type: string;
      file_size: number;
      folder?: string;
      is_public?: boolean;
      owner_id?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to get upload URL",
      };
    }
  });

export const confirmFileUpload = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string | number; success: boolean }) => data)
  .handler(async ({ data: { id, success } }) => {
    try {
      return await apiFetchJson(
        `${API_URL.confirmUpload(id)}?success=${success}`,
        {
          method: "POST",
        },
      );
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to confirm file upload",
      };
    }
  });

export const updatePartyStateAllowances = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      partyID: string | number;
      allowances: Record<string, Record<string, number>>;
    }) => data,
  )
  .handler(async ({ data: { partyID, allowances } }) => {
    try {
      return await apiFetchJson(
        API_URL.partyAgentPaymentAllocations(partyID),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(allowances),
        },
      );
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to update agent payment allocations: " +
          (error as Error).message,
      };
    }
  });

export const getPartyAgentPaymentAllocation = createServerFn({ method: "GET" })
  .inputValidator((partyId: string | number) => partyId)
  .handler(async ({ data: partyId }) => {
    try {
      return await apiFetchJson(
        API_URL.partyAgentPaymentAllocations(partyId),
      );
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch agent payment allocation",
      };
    }
  });

export const togglePartyVerification = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string | number; is_verified: boolean }) => data)
  .handler(async ({ data: { id, is_verified } }) => {
    try {
      return await apiFetchJson(API_URL.managePartyVerify(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_verified }),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to toggle party verification",
      };
    }
  });

export const getPartyAgentTargets = createServerFn({ method: "GET" })
  .inputValidator((partyId: string | number) => partyId)
  .handler(async ({ data: partyId }) => {
    try {
      return await apiFetchJson(API_URL.partyAgentTargets(partyId));
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch agent targets",
      };
    }
  });

export const updatePartyAgentTargets = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      partyID: string | number;
      targets: {
        polling_agent: number;
        ward_election_supervisor: number;
        lga_election_supervisor: number;
        state_election_supervisor: number;
      };
    }) => data,
  )
  .handler(async ({ data: { partyID, targets } }) => {
    try {
      return await apiFetchJson(API_URL.partyAgentTargets(partyID), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targets),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to update agent targets",
      };
    }
  });

export const getPartyMarketingCampaigns = createServerFn({ method: "GET" })
  .inputValidator((partyId: string | number) => partyId)
  .handler(async ({ data: partyId }) => {
    try {
      return await apiFetchJson(API_URL.partyMarketingCampaigns(partyId));
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch marketing campaigns",
      };
    }
  });

export const getAllPartyMarketingCampaigns = createServerFn({ method: "GET" })
  .inputValidator((args?: { partyId?: number; electionGroupId?: number; status?: string; limit?: number; cursor?: number }) => args)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.adminPartyMarketingCampaigns(data));
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch admin marketing campaigns",
      };
    }
  });

export const updatePartyMarketingCampaignStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; status: string }) => data)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.adminPartyMarketingCampaignStatus(data.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: data.status }),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to update campaign status",
      };
    }
  });

export const deletePartyMarketingCampaign = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.adminPartyMarketingCampaignDelete(data.id), {
        method: "DELETE",
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to delete marketing campaign",
      };
    }
  });

export const createPartyMarketingCampaign = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      partyId: string | number;
      electionGroupId: number;
      electionId: number;
      planId: number;
      states: any[];
      durationInDays: number;
      budget: number;
      budgetPerDay?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.partyMarketingCampaigns(data.partyId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          election_group_id: data.electionGroupId,
          election_id: data.electionId,
          plan_id: data.planId,
          states: data.states,
          duration_in_days: data.durationInDays,
          budget: data.budget,
          budget_per_day: data.budgetPerDay,
        }),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to create marketing campaign",
      };
    }
  });

export const getMarketingPlans = createServerFn({ method: "GET" })
  .inputValidator((data: { type?: string; is_active?: boolean } | undefined) => data)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.plans(data?.type, data?.is_active));
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch marketing plans",
      };
    }
  });
