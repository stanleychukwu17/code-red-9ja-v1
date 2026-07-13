import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { API_URL } from "#/lib/config";

function getAuthHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const accessToken = getCookie("access_token");
  const refreshToken = getCookie("refresh_token");

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
    headers["Cookie"] = `accessToken=${accessToken}; refreshToken=${refreshToken || ""}`;
  }

  return headers;
}

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
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch supervisor assignments: " + (error as Error).message,
      };
    }
  });
