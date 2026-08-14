import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";

export const submitPracticeTest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      electionGroupId?: number;
      role?: string;
      finalScore: number;
      taskStats: {
        task_id: number;
        score: number;
        failed_attempts: number;
        completed: boolean;
      }[];
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.practiceTests, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          election_group_id: data.electionGroupId ?? 0,
          role: data.role ?? "polling_agent",
          final_score: data.finalScore,
          task_stats: data.taskStats,
        }),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to submit practice test: " + (error as Error).message,
      };
    }
  });

export const listPracticeTests = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | {
            userId?: number;
            electionGroupId?: number;
            status?: string;
            limit?: number;
            cursor?: number;
          }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const url = API_URL.listPracticeTests(
        data?.userId,
        data?.electionGroupId,
        data?.status,
        data?.limit,
        data?.cursor,
      );
      const response = await apiFetch(url);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to list practice tests: " + (error as Error).message,
      };
    }
  });

export interface PotentialPayoutData {
  payout?: {
    assignment_id: number;
    task_type: string;
    potential_payout_kobo: number;
    is_eligible: boolean;
    reason: string;
  };
}

export interface PotentialPayoutResponse {
  success: boolean;
  message?: string;
  data?: PotentialPayoutData;
}

export const getPotentialPayout = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      assignmentId: number;
      taskType: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const url = API_URL.agentEarnings.potentialPayout(
        data.assignmentId,
        data.taskType,
      );
      const response = await apiFetch(url);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch potential payout: " + (error as Error).message,
      };
    }
  });

export const getEstimatePayout = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      taskType: string;
      role?: string;
      electionGroupId?: number;
      partyId?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const url = API_URL.agentEarnings.estimatePayout(
        data.taskType,
        data.role,
        data.electionGroupId,
        data.partyId,
      );
      const response = await apiFetch(url);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to estimate potential payout: " + (error as Error).message,
      };
    }
  });

/**
 * @deprecated Use getPotentialPayout from agent earnings instead.
 */
export interface PayoutPreviewData {
  potential_window_payout_kobo: number;
  potential_test_payout_kobo: number;
  quota_remaining: number;
  tests_taken_in_window: number;
  readiness_budget_kobo: number;
  active_window_days_before_election: number;
}

/**
 * @deprecated Use PotentialPayoutResponse instead.
 */
export interface PayoutPreviewResponse {
  success: boolean;
  message?: string;
  data?: PayoutPreviewData;
}

/**
 * @deprecated Use getPotentialPayout from agent earnings instead.
 */
export const getPracticeTestPayoutPreview = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      electionGroupId: number;
      role?: string;
      electionDate?: string;
      partyId?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const url = API_URL.practiceTestPayoutPreview(
        data.electionGroupId,
        data.role,
        data.electionDate,
        data.partyId,
      );
      const response = await apiFetch(url);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch payout preview: " + (error as Error).message,
      };
    }
  });
