import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetch } from "./fetch";

export type ElectionPayItem = {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar?: string;
  party_id?: number;
  party_code?: string;
  party_name?: string;
  role: string;
  role_type: string;
  base_payment_kobo: number;
  total_earned_kobo: number;
  earned_amount: string;
  earned_percentage: number;
  reason?: string;
  status: string;
  paid_at?: string;
  created_at?: string;
};

export type ReferralPayItem = {
  id: number;
  user_id: number;
  user_name: string;
  user_label: string;
  user_avatar?: string;
  party_id?: number;
  party_code?: string;
  party_name?: string;
  duties_completed: number;
  duties_completed_formatted: string;
  agent_referrals: number;
  total_referrals: number;
  earned_amount: string;
  earned_amount_num: number;
  status: string;
  paid_at?: string;
  created_at?: string;
};

export type AgentPaymentsOverview = {
  election_group_id: number;
  election_pay: {
    unpaid_total_kobo: number;
    paid_total_kobo: number;
    unpaid_count: number;
    paid_count: number;
    ineligible_count: number;
  };
  referral_pay: {
    unpaid_total: number;
    paid_total: number;
    unpaid_count: number;
    paid_count: number;
  };
};

export const getAgentPaymentsOverview = createServerFn({ method: "GET" })
  .inputValidator((electionGroupId?: number | string) => electionGroupId)
  .handler(async ({ data: electionGroupId }) => {
    try {
      const response = await apiFetch(API_URL.adminAgentPayments.overview(electionGroupId));
      return (await response.json()) as { success: boolean; data: AgentPaymentsOverview; message?: string };
    } catch (error) {
      return { success: false, data: null as any, message: (error as Error).message };
    }
  });

export const getElectionPayList = createServerFn({ method: "GET" })
  .inputValidator(
    (args: {
      electionGroupId?: number | string;
      status?: "unpaid" | "paid" | "ineligible";
      partyId?: number | string;
      role?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }) => args,
  )
  .handler(async ({ data: args }) => {
    try {
      const response = await apiFetch(API_URL.adminAgentPayments.electionPay(args));
      return (await response.json()) as {
        success: boolean;
        data: { items: ElectionPayItem[]; total: number; limit: number; offset: number };
        message?: string;
      };
    } catch (error) {
      return { success: false, data: { items: [], total: 0, limit: 50, offset: 0 }, message: (error as Error).message };
    }
  });

export const getReferralPayList = createServerFn({ method: "GET" })
  .inputValidator(
    (args: {
      electionGroupId?: number | string;
      status?: "unpaid" | "paid";
      partyId?: number | string;
      search?: string;
      limit?: number;
      offset?: number;
    }) => args,
  )
  .handler(async ({ data: args }) => {
    try {
      const response = await apiFetch(API_URL.adminAgentPayments.referralPay(args));
      return (await response.json()) as {
        success: boolean;
        data: { items: ReferralPayItem[]; total: number; limit: number; offset: number };
        message?: string;
      };
    } catch (error) {
      return { success: false, data: { items: [], total: 0, limit: 50, offset: 0 }, message: (error as Error).message };
    }
  });

export const payElectionAgent = createServerFn({ method: "POST" })
  .inputValidator((id: number | string) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.adminAgentPayments.payElection(id), {
        method: "POST",
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  });

export const payReferralAgent = createServerFn({ method: "POST" })
  .inputValidator((id: number | string) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.adminAgentPayments.payReferral(id), {
        method: "POST",
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  });

export const payAllAgentPayments = createServerFn({ method: "POST" })
  .inputValidator(
    (body: { type: "election" | "referral"; election_group_id?: number | string; ids?: number[] }) => body,
  )
  .handler(async ({ data: body }) => {
    try {
      const response = await apiFetch(API_URL.adminAgentPayments.payAll, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  });
