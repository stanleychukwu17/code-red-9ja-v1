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
        pollingUnitAgent: number;
        wardElectionSupervisor: number;
        lgaElectionSupervisor: number;
        stateElectionSupervisor: number;
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
      states: string[];
      durationInDays: number;
      budget: number;
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
