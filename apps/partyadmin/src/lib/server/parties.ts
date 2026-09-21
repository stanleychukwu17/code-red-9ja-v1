import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";

export const getParties = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const response = await apiFetch(API_URL.parties);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch parties from API" };
    }
  },
);

export const getPublicParties = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const response = await apiFetch(`${API_URL.parties}/public`, {
        method: "GET", // The route is GET in router.go
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch public parties from API",
      };
    }
  },
);

export const getParty = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.partyById(id));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch party from API: " + (error as Error).message,
      };
    }
  });

export const getPartyWallet = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.partyWallet(id));
      return await response.json();
    } catch (error) {
      return { success: false, message: "Failed to fetch party wallet" };
    }
  });

export const createPartyWallet = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.partyWallet(id), {
        method: "POST",
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: "Failed to create party wallet" };
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
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to get upload URL: " + (error as Error).message,
      };
    }
  });

export const confirmFileUpload = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string | number; success: boolean }) => data)
  .handler(async ({ data: { id, success } }) => {
    try {
      const response = await apiFetch(
        `${API_URL.confirmUpload(id)}?success=${success}`,
        {
          method: "POST",
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to confirm file upload" };
    }
  });


export const getPartyWalletTransactions = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { partyID: string | number; limit?: number; offset?: number }) =>
      data,
  )
  .handler(async ({ data: { partyID, limit, offset } }) => {
    try {
      const url = API_URL.partyWalletTransactions(partyID, limit, offset);
      const response = await apiFetch(url);
      if (!response.ok) {
        const text = await response.text();
        console.error(
          `[getPartyWalletTransactions] ${response.status} ${response.statusText} — URL: ${url} — Body: ${text}`,
        );
        return { success: false, message: `HTTP ${response.status}: ${text}` };
      }
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch transactions: " + (error as Error).message,
      };
    }
  });

export const withdrawFromPartyWallet = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      partyID: string | number;
      amountKobo: number;
      transactionReference: string;
      bankAccountNumber: string;
      bankCode: string;
      narration: string;
    }) => data,
  )
  .handler(async ({ data: { partyID, ...body } }) => {
    try {
      const response = await apiFetch(
        API_URL.partyWalletWithdraw(partyID),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to process withdrawal: " + (error as Error).message,
      };
    }
  });

export const getPartySlotPrice = createServerFn({ method: "POST" })
  .inputValidator((partyID: string | number) => partyID)
  .handler(async ({ data: partyID }) => {
    try {
      const response = await apiFetch(API_URL.partySlotPrice(partyID));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch slot price: " + (error as Error).message,
      };
    }
  });

export const buyPartySlots = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { partyID: string | number; quantity: number }) => data,
  )
  .handler(async ({ data: { partyID, quantity } }) => {
    try {
      const response = await apiFetch(
        API_URL.partySlotsBuy(partyID),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to buy slots: " + (error as Error).message,
      };
    }
  });

export const depositPartyAllowance = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { partyID: string | number; amountKobo: number }) => data,
  )
  .handler(async ({ data: { partyID, amountKobo } }) => {
    try {
      const response = await apiFetch(
        API_URL.partyAgentPaymentDeposits(partyID),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount_kobo: amountKobo }),
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to deposit allowance: " + (error as Error).message,
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
      const response = await apiFetch(
        API_URL.partyAgentPaymentAllocations(partyID),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(allowances),
        },
      );
      const resData = await response.json();
      return resData;
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
      const response = await apiFetch(
        API_URL.partyAgentPaymentAllocations(partyId),
      );
      const resData = await response.json();
      return resData; // { success, data: { agent_payment_allocation_kobo: {...} } }
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch agent payment allocation",
      };
    }
  });

export const getPartyAgentTargets = createServerFn({ method: "GET" })
  .inputValidator((partyId: string | number) => partyId)
  .handler(async ({ data: partyId }) => {
    try {
      const response = await apiFetch(
        API_URL.partyAgentTargets(partyId),
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch agent targets: " + (error as Error).message,
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
      const response = await apiFetch(
        API_URL.partyAgentTargets(partyID),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(targets),
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to update agent targets: " + (error as Error).message,
      };
    }
  });

export const fundPartyWalletTest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { partyID: string | number; amountKobo: number }) => data,
  )
  .handler(async ({ data: { partyID, amountKobo } }) => {
    try {
      const response = await apiFetch(
        API_URL.partyWalletDepositTest(partyID),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount_kobo: amountKobo }),
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to simulate wallet funding: " + (error as Error).message,
      };
    }
  });

export const getPlans = createServerFn({ method: "GET" })
  .inputValidator((data: { type?: string; isActive?: boolean } | undefined) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.plans(data?.type, data?.isActive));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch plans: " + (error as Error).message,
      };
    }
  });

export const createMarketingCampaign = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      partyId: number;
      electionGroupId: number;
      electionId: number;
      planId: number;
      type: string;
      states: any[];
      durationInDays: number;
      budget: number;
      budgetPerDay?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(
        API_URL.partyMarketingCampaigns(data.partyId),
        {
          method: "POST",
          body: JSON.stringify({
            election_group_id: data.electionGroupId,
            election_id: data.electionId,
            plan_id: data.planId,
            type: data.type,
            states: JSON.stringify(data.states),
            duration_in_days: data.durationInDays,
            budget: data.budget,
            budget_per_day: data.budgetPerDay,
          }),
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to create marketing campaign: " + (error as Error).message,
      };
    }
  });

export const getPartyMarketingCampaigns = createServerFn({ method: "GET" })
  .inputValidator((partyId: number) => partyId)
  .handler(async ({ data: partyId }) => {
    try {
      const response = await apiFetch(
        API_URL.partyMarketingCampaigns(partyId),
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to fetch marketing campaigns: " + (error as Error).message,
      };
    }
  });

export interface PartyPositionItem {
  id: number;
  party_id?: number | null;
  name: string;
  code: string;
  position_type: "default" | "custom";
  description?: string;
  allowed_levels: string[];
  rank_order: number;
  max_occupants: number;
  created_at?: string;
}

export interface PartyOfficialItem {
  assignment_id: number;
  party_id: number;
  chapter_id: number;
  position_id: number;
  user_id: number;
  appointment_type: "substantive" | "acting" | "caretaker" | "interim";
  assignment_status: "active" | "suspended" | "vacated" | "past";
  tenure_start?: string;
  tenure_end?: string;
  assigned_at?: string;
  position_name: string;
  position_code: string;
  position_type: "default" | "custom";
  rank_order: number;
  max_occupants: number;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  username?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  chapter_type: "national" | "zonal" | "state" | "lga" | "ward";
  geo_name: string;
  display_title: string;
}

export const getPartyPositions = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { partyId: number | string; chapterType?: string }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(
        API_URL.partyPositions(data.partyId, data.chapterType),
      );
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch party positions: " + (error as Error).message,
      };
    }
  });

export const getPartyOfficials = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      partyId: number | string;
      chapterType?: string;
      stateId?: number;
      lgaId?: number;
      wardId?: number;
      status?: string;
      search?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(
        API_URL.partyOfficials(data.partyId, {
          chapter_type: data.chapterType,
          state_id: data.stateId,
          lga_id: data.lgaId,
          ward_id: data.wardId,
          status: data.status,
          search: data.search,
        }),
      );
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch party officials: " + (error as Error).message,
      };
    }
  });

export const getChapterOfficials = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      partyId: number | string;
      chapterId: number | string;
      status?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(
        API_URL.chapterOfficials(data.partyId, data.chapterId, data.status),
      );
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch chapter officials: " + (error as Error).message,
      };
    }
  });

export const assignPartyOfficial = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      partyId: number | string;
      chapterId: number | string;
      userId: number;
      positionId: number;
      appointmentType: string;
      tenureStart?: string;
      tenureEnd?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(
        API_URL.assignOfficial(data.partyId, data.chapterId),
        {
          method: "POST",
          body: JSON.stringify({
            user_id: data.userId,
            position_id: data.positionId,
            appointment_type: data.appointmentType,
            tenure_start: data.tenureStart,
            tenure_end: data.tenureEnd,
          }),
        },
      );
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: "Failed to assign party position: " + (error as Error).message,
      };
    }
  });

export const vacatePartyOfficial = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { partyId: number | string; assignmentId: number | string }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(
        API_URL.vacateOfficial(data.partyId, data.assignmentId),
        {
          method: "PATCH",
        },
      );
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: "Failed to vacate party position: " + (error as Error).message,
      };
    }
  });

export const resolvePartyChapter = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      partyId: number | string;
      chapterType: string;
      entityId?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(
        API_URL.resolveChapter(data.partyId, data.chapterType, data.entityId),
      );
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: "Failed to resolve chapter: " + (error as Error).message,
      };
    }
  });

export const createPartyCustomPosition = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      partyId: number | string;
      name: string;
      code?: string;
      description?: string;
      allowedLevels?: string[];
      rankOrder?: number;
      maxOccupants?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(
        API_URL.partyCustomPosition(data.partyId),
        {
          method: "POST",
          body: JSON.stringify({
            name: data.name,
            code: data.code,
            description: data.description,
            allowed_levels: data.allowedLevels,
            rank_order: data.rankOrder,
            max_occupants: data.maxOccupants,
          }),
        },
      );
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: "Failed to create custom position: " + (error as Error).message,
      };
    }
  });

