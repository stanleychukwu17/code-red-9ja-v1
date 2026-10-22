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

const getId = (val: any): number | undefined => {
  if (!val) return undefined;
  if (typeof val === "number") return val;
  if (typeof val === "object" && val !== null) {
    if ("Int64" in val && val.Valid) return val.Int64;
    if ("Int32" in val && val.Valid) return val.Int32;
    if ("Int16" in val && val.Valid) return val.Int16;
  }
  return undefined;
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

export type GetElectionsProps = {
  limit?: number;
  cursor?: string | number;
  partyId?: number | string;
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
};

export const getElections = createServerFn({ method: "GET" })
  .inputValidator((data?: GetElectionsProps) => data)
  .handler(async ({ data }) => {
    try {
      const limit = data?.limit || 20;
      const cursor = data?.cursor || "";
      const userDetailsCookie = getCookie("user_details");

      let resolvedPartyId = data?.partyId;
      if (!resolvedPartyId && userDetailsCookie) {
        try {
          const user = JSON.parse(userDetailsCookie);
          if (user?.party_id) {
            resolvedPartyId = user.party_id;
          } else if (user?.party?.id) {
            resolvedPartyId = user.party.id;
          }
        } catch (e) { }
      }

      const params = new URLSearchParams();
      if (limit) params.append("limit", String(limit));
      if (cursor) params.append("cursor", String(cursor));
      if (resolvedPartyId) params.append("party_id", String(resolvedPartyId));
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

      const qs = params.toString();
      const response = await apiFetch(
        `${API_URL.elections}${qs ? `?${qs}` : ""}`,
      );
      const resData = await response.json();

      if (resData.success && Array.isArray(resData.data?.elections)) {
        resData.data.elections = resData.data.elections.map((election: any) => {
          const candidateId = getId(election.candidate_id);
          const runningMateId = getId(election.running_mate_id);

          const candidateFirstName = getVal(election.candidate_first_name);
          const candidateLastName = getVal(election.candidate_last_name);
          const candidateName = `${candidateFirstName} ${candidateLastName}`.trim();
          const candidateAvatar = getVal(election.candidate_avatar);

          const runningMateFirstName = getVal(election.running_mate_first_name);
          const runningMateLastName = getVal(election.running_mate_last_name);
          const runningMateName = `${runningMateFirstName} ${runningMateLastName}`.trim();
          const runningMateAvatar = getVal(election.running_mate_avatar);

          return {
            ...election,
            candidate: candidateId ? { id: candidateId, name: candidateName, avatar: candidateAvatar || undefined, } : undefined,
            runningMate: runningMateId ? { id: runningMateId, name: runningMateName, avatar: runningMateAvatar || undefined, } : undefined,
          };
        });
      }

      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch elections from API" };
    }
  });

export const getElectionById = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { electionId: number; electionGroupId?: number; scope?: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data.electionGroupId)
        params.append("election_group_id", String(data.electionGroupId));
      if (data.scope) params.append("scope", data.scope);
      const qs = params.toString();
      const response = await apiFetch(
        `${API_URL.elections}/${data.electionId}${qs ? `?${qs}` : ""}`,
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch election details: " + (error as Error).message,
      };
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

export const unfieldPartyCandidate = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { electionId: number; partyId: number; slot: "candidate" | "running_mate" }) =>
      data,
  )
  .handler(async ({ data: { electionId, partyId, slot } }) => {
    try {
      const response = await apiFetch(
        `${API_URL.elections}/${electionId}/unfield-candidate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
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
        message: "Failed to unfield candidate: " + (error as Error).message,
      };
    }
  });

export const getElectionCandidates = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      electionId: number;
      limit?: number;
      cursor?: string;
      electionGroupId?: number;
      scope?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const limit = data.limit || 20;
      const cursor = data.cursor || "";

      const params = new URLSearchParams();
      if (limit) params.append("limit", String(limit));
      if (cursor) params.append("cursor", String(cursor));
      if (data.electionGroupId)
        params.append("election_group_id", String(data.electionGroupId));
      if (data.scope) params.append("scope", data.scope);
      const qs = params.toString();

      const response = await apiFetch(
        `${API_URL.elections}/${data.electionId}/candidates?${qs}`,
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
