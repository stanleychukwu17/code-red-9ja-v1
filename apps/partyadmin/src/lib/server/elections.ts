import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";

const getVal = (val: any) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && "String" in val && val.Valid)
    return val.String;
  return "";
};

export type ElectionFilters = {
  election_group_ids: number[];
  scopes: string[];
  statuses: string[];
  state_ids: number[];
  office_ids: number[];
  date_from?: string;
  date_to?: string;
};

export const getElections = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | {
            limit?: number;
            cursor?: string | number;
            partyShortName?: string;
            search?: string;
            election_group_ids?: number[];
            election_group_id?: number;
            scopes?: string[];
            statuses?: string[];
            state_ids?: number[];
            office_ids?: number[];
            date_from?: string;
            date_to?: string;
            orderBy?: string;
            order?: string;
          }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const limit = data?.limit || 20;
      const cursor = data?.cursor || "";

      const userDetailsCookie = getCookie("user_details");

      let resolvedPartyShortName = data?.partyShortName || "";
      if (!resolvedPartyShortName && userDetailsCookie) {
        try {
          const user = JSON.parse(userDetailsCookie);
          resolvedPartyShortName = user?.party?.short_name || "";
        } catch (e) {}
      }

      const params = new URLSearchParams();
      if (limit) params.append("limit", String(limit));
      if (cursor) params.append("cursor", String(cursor));
      if (data?.search) params.append("search", data.search);
      if (data?.election_group_ids?.length) {
        params.append("election_group_ids", data.election_group_ids.join(","));
      } else if (data?.election_group_id) {
        params.append("election_group_ids", String(data.election_group_id));
        params.append("election_group_id", String(data.election_group_id));
      }
      if (data?.scopes?.length) params.append("scopes", data.scopes.join(","));
      if (data?.statuses?.length) params.append("statuses", data.statuses.join(","));
      if (data?.state_ids?.length) params.append("state_ids", data.state_ids.join(","));
      if (data?.office_ids?.length) params.append("office_ids", data.office_ids.join(","));
      if (data?.date_from) params.append("date_from", data.date_from);
      if (data?.date_to) params.append("date_to", data.date_to);
      if (data?.orderBy) params.append("orderBy", data.orderBy);
      if (data?.order) params.append("order", data.order);

      const qs = params.toString();
      const response = await apiFetch(
        `${API_URL.elections}${qs ? `?${qs}` : ""}`,
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
              const candResp = await apiFetch(candidatesUrl);
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
                    const runningMateId = partyCand.running_mate_id?.Int64 ?? (typeof partyCand.running_mate_id === "number" ? partyCand.running_mate_id : undefined);
                    const runningMateFirstName = getVal(partyCand.running_mate_first_name);
                    const runningMateLastName = getVal(partyCand.running_mate_last_name);
                    const runningMateName = `${runningMateFirstName} ${runningMateLastName}`.trim();
                    return {
                      ...election,
                      candidate: {
                        id: partyCand.candidate_id,
                        name: `${getVal(partyCand.first_name)} ${getVal(partyCand.last_name)}`.trim(),
                        avatar: getVal(partyCand.avatar),
                      },
                      runningMate: runningMateId ? {
                        id: runningMateId,
                        name: runningMateName,
                        avatar: getVal(partyCand.running_mate_avatar),
                      } : undefined,
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
    (data: { electionId: number; candidateId: number; partyId: number; slot?: "candidate" | "running_mate" }) =>
      data,
  )
  .handler(async ({ data: { electionId, candidateId, partyId, slot = "candidate" } }) => {
    try {
      const response = await apiFetch(
        `${API_URL.elections}/${electionId}/field-candidate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidate_id: candidateId,
            party_id: partyId,
            slot,
          }),
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to field candidate: " + (error as Error).message,
      };
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

      const response = await apiFetch(
        `${API_URL.elections}/${data.electionId}/candidates?limit=${limit}&cursor=${cursor}`,
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
      if (data.cursor !== undefined)
        params.append("cursor", data.cursor.toString());

      const response = await apiFetch(
        `${API_URL.pollingUnitUpdates}?${params.toString()}`,
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
      if (data.cursor !== undefined)
        params.append("cursor", data.cursor.toString());

      const response = await apiFetch(
        `${API_URL.pollingUnitFinalResults}?${params.toString()}`,
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
      const response = await apiFetch(
        `${API_URL.electionGroups}/${groupId}/elections`,
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

export const getElectionStats = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      electionGroupId: number;
      partyId: number;
      stateId?: number;
      senatorialDistrictId?: number;
      federalConstituencyId?: number;
      stateAssemblyConstituencyId?: number;
      lgaId?: number;
      wardId?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      let url = "";
      if (data.wardId) {
        url = API_URL.electionStats.singleWardStats(
          data.electionGroupId,
          data.wardId,
          data.partyId,
        );
      } else if (data.lgaId) {
        url = API_URL.electionStats.singleLGAStats(
          data.electionGroupId,
          data.lgaId,
          data.partyId,
        );
      } else if (data.stateId) {
        url = API_URL.electionStats.singleStateStats(
          data.electionGroupId,
          data.stateId,
          data.partyId,
        );
      } else {
        url = API_URL.electionStats.singleGlobalStats(
          data.electionGroupId,
          data.partyId,
        );
      }

      const response = await apiFetch(url);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch election stats: " + (error as Error).message,
      };
    }
  });
