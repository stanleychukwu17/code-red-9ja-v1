import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";

const getVal = (val: any) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && "String" in val && val.Valid)
    return val.String;
  return "";
};

export const getElections = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | { limit?: number; cursor?: string | number; partyShortName?: string }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const limit = data?.limit || 20;
      const cursor = data?.cursor || "";

      const { getCookie } = await import("@tanstack/react-start/server");
      const accessToken = getCookie("access_token");
      const refreshToken = getCookie("refresh_token");
      const userDetailsCookie = getCookie("user_details");

      let resolvedPartyShortName = data?.partyShortName || "";
      if (!resolvedPartyShortName && userDetailsCookie) {
        try {
          const user = JSON.parse(userDetailsCookie);
          resolvedPartyShortName = user?.party?.short_name || "";
        } catch (e) {}
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
        headers["Cookie"] =
          `accessToken=${accessToken}; refreshToken=${refreshToken || ""}`;
      }

      const response = await fetch(
        `${API_URL.elections}?limit=${limit}&cursor=${cursor}`,
      );
      const resData = await response.json();

      if (
        resData.success &&
        Array.isArray(resData.data?.elections) &&
        resolvedPartyShortName
      ) {
        const elections = resData.data.elections;
        const electionsWithCandidate = await Promise.all(
          elections.map(async (election: any) => {
            try {
              const candidatesUrl = `${API_URL.elections}/${election.id}/candidates`;
              const candResp = await fetch(candidatesUrl, { headers });
              if (candResp.ok) {
                const candData = await candResp.json();
                if (
                  candData.success &&
                  Array.isArray(candData.data?.candidates)
                ) {
                  const partyCand = candData.data.candidates.find(
                    (c: any) =>
                      getVal(c.party_short_name).toLowerCase() ===
                      resolvedPartyShortName.toLowerCase(),
                  );
                  if (partyCand) {
                    return {
                      ...election,
                      candidate: {
                        id: partyCand.candidate_id,
                        name: `${getVal(partyCand.first_name)} ${getVal(partyCand.last_name)}`.trim(),
                        avatar: getVal(partyCand.avatar),
                      },
                    };
                  }
                }
              }
            } catch (err) {
              console.error(
                `Failed to fetch candidates for election ${election.id}:`,
                err,
              );
            }
            return election;
          }),
        );
        resData.data.elections = electionsWithCandidate;
      }

      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch elections from API" };
    }
  });

export const fieldPartyCandidate = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { electionId: number; candidateId: number }) => data,
  )
  .handler(async ({ data: { electionId, candidateId } }) => {
    try {
      const { getCookie } = await import("@tanstack/react-start/server");
      const accessToken = getCookie("access_token");
      const refreshToken = getCookie("refresh_token");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
        headers["Cookie"] =
          `accessToken=${accessToken}; refreshToken=${refreshToken || ""}`;
      }

      const response = await fetch(
        `${API_URL.elections}/${electionId}/field-candidate`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ candidate_id: candidateId }),
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to field candidate: " + (error as Error).message };
    }
  });
