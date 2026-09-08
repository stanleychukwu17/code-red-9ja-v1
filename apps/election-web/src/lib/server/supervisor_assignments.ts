import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetchJson } from "./fetch";

export const getSupervisorAssignments = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | { user_id?: string | number; election_group_id?: string | number }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const user_id = data?.user_id;
      const election_group_id = data?.election_group_id;
      const params = new URLSearchParams();
      if (user_id) params.append("user_id", String(user_id));
      if (election_group_id)
        params.append("election_group_id", String(election_group_id));
      const qs = params.toString();
      const url = `${API_URL.supervisorAssignments}${qs ? `?${qs}` : ""}`;
      return await apiFetchJson(url);
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch supervisor assignments",
      };
    }
  });
