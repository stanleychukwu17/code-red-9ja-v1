import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";

export const startPracticeTest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { electionGroupId?: number; role?: string }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.practiceTests, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          election_group_id: data.electionGroupId ?? 0,
          role: data.role ?? "pollingagent",
        }),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to start practice test: " + (error as Error).message,
      };
    }
  });

export const appendPracticeTestTask = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      practiceTestId: number;
      taskId: number;
      score: number;
      failedAttempts: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(
        API_URL.appendPracticeTestTask(data.practiceTestId),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task_id: data.taskId,
            score: data.score,
            failed_attempts: data.failedAttempts,
          }),
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to append task: " + (error as Error).message,
      };
    }
  });

export const completePracticeTest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { practiceTestId: number; finalScore: number }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(
        API_URL.completePracticeTest(data.practiceTestId),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ final_score: data.finalScore }),
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to complete practice test: " + (error as Error).message,
      };
    }
  });

export const listPracticeTests = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      userId?: number;
      electionGroupId?: number;
      status?: string;
      limit?: number;
      cursor?: number;
    } | undefined) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.userId) params.append("user_id", String(data.userId));
      if (data?.electionGroupId)
        params.append("election_group_id", String(data.electionGroupId));
      if (data?.status) params.append("status", data.status);
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));

      const url = `${API_URL.practiceTests}${params.toString() ? `?${params.toString()}` : ""}`;
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
