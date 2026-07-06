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
        } catch (e) { }
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

export const getElectionCandidates = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { electionId: number; limit?: number; cursor?: string }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const limit = data.limit || 20;
      const cursor = data.cursor || "";
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
        `${API_URL.elections}/${data.electionId}/candidates?limit=${limit}&cursor=${cursor}`,
        {
          headers,
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to fetch election candidates: " + (error as Error).message,
      };
    }
  });

export const getPollingUnitUpdates = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      electionGroupId?: number;
      stateId?: number;
      senatorialDistrictId?: number;
      federalConstituencyId?: number;
      stateAssemblyConstituencyId?: number;
      lgaId?: number;
      wardId?: number;
      isReport?: boolean;
      hasMedia?: boolean;
      limit?: number;
      cursor?: string | number;
    }) => data,
  )
  .handler(async ({ data }) => {
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

      const params = new URLSearchParams();
      if (data.electionGroupId)
        params.append("election_group_id", data.electionGroupId.toString());
      if (data.stateId) params.append("state_id", data.stateId.toString());
      if (data.senatorialDistrictId)
        params.append(
          "senatorial_district_id",
          data.senatorialDistrictId.toString(),
        );
      if (data.federalConstituencyId)
        params.append(
          "federal_constituency_id",
          data.federalConstituencyId.toString(),
        );
      if (data.stateAssemblyConstituencyId)
        params.append(
          "state_assembly_constituency_id",
          data.stateAssemblyConstituencyId.toString(),
        );
      if (data.lgaId) params.append("lga_id", data.lgaId.toString());
      if (data.wardId) params.append("ward_id", data.wardId.toString());
      if (data.isReport !== undefined)
        params.append("is_report", data.isReport.toString());
      if (data.hasMedia !== undefined)
        params.append("has_media", data.hasMedia.toString());
      if (data.limit) params.append("limit", data.limit.toString());
      if (data.cursor !== undefined) params.append("cursor", data.cursor.toString());

      const response = await fetch(
        `${API_URL.pollingUnitUpdates}?${params.toString()}`,
        {
          headers,
        },
      );

      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to fetch polling unit updates: " + (error as Error).message,
      };
    }
  });

export const getPollingUnitFinalResults = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      electionGroupId?: number;
      stateId?: number;
      senatorialDistrictId?: number;
      federalConstituencyId?: number;
      stateAssemblyConstituencyId?: number;
      lgaId?: number;
      wardId?: number;
      hasMedia?: boolean;
      limit?: number;
      cursor?: string | number;
    }) => data,
  )
  .handler(async ({ data }) => {
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

      const params = new URLSearchParams();
      if (data.electionGroupId)
        params.append("election_group_id", data.electionGroupId.toString());
      if (data.stateId) params.append("state_id", data.stateId.toString());
      if (data.senatorialDistrictId)
        params.append(
          "senatorial_district_id",
          data.senatorialDistrictId.toString(),
        );
      if (data.federalConstituencyId)
        params.append(
          "federal_constituency_id",
          data.federalConstituencyId.toString(),
        );
      if (data.stateAssemblyConstituencyId)
        params.append(
          "state_assembly_constituency_id",
          data.stateAssemblyConstituencyId.toString(),
        );
      if (data.lgaId) params.append("lga_id", data.lgaId.toString());
      if (data.wardId) params.append("ward_id", data.wardId.toString());
      if (data.hasMedia !== undefined)
        params.append("has_media", data.hasMedia.toString());
      if (data.limit) params.append("limit", data.limit.toString());
      if (data.cursor !== undefined) params.append("cursor", data.cursor.toString());

      const response = await fetch(
        `${API_URL.pollingUnitFinalResults}?${params.toString()}`,
        {
          headers,
        },
      );

      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to fetch polling unit final results: " +
          (error as Error).message,
      };
    }
  });

export const getElectionsByGroup = createServerFn({ method: "GET" })
  .inputValidator((groupId: string | number) => groupId)
  .handler(async ({ data: groupId }) => {
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
        `${API_URL.electionGroups}/${groupId}/elections`,
        {
          headers,
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch group elections: " + (error as Error).message,
      };
    }
  });
