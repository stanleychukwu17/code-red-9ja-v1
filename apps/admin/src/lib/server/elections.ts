import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export const getElections = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | {
            election_group_id?: number;
            limit?: number;
            cursor?: string | number;
            orderBy?: string;
            order?: string;
          }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.election_group_id) params.append("election_group_id", String(data.election_group_id));
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));
      if (data?.orderBy) params.append("orderBy", data.orderBy);
      if (data?.order) params.append("order", data.order);
      const qs = params.toString();
      return await apiFetchJson(
        `${API_URL.elections}${qs ? `?${qs}` : ""}`,
      );
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch elections from API" };
    }
  });

export const getElectionById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.electionById(id));
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch election details" };
    }
  });

export const createElection = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      candidates_count: number;
      election_date: string;
      election_group_id: number;
      office_id: number;
      state_id?: number | null;
      senatorial_district_id?: number | null;
      federal_constituency_id?: number | null;
      state_constituency_id?: number | null;
      lga_id?: number | null;
      ward_id?: number | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.elections, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to create election",
      };
    }
  });

export const updateElection = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string | number;
      name: string;
      candidates_count: number;
      election_date: string;
      election_group_id: number;
      office_id: number;
      state_id?: number | null;
      senatorial_district_id?: number | null;
      federal_constituency_id?: number | null;
      state_constituency_id?: number | null;
      lga_id?: number | null;
      ward_id?: number | null;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      return await apiFetchJson(API_URL.electionById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to update election",
      };
    }
  });

export const deleteElection = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.electionById(id), {
        method: "DELETE",
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to delete election",
      };
    }
  });

export const createNationwideElection = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      office_id: number;
      election_date: string;
      election_group_id?: number;
      candidates: {
        candidate_id: number;
        party_id: number;
        party_short_name: string;
      }[];
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.electionsNationwide, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to create nationwide election",
      };
    }
  });

export const createStateElection = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      office_id: number;
      election_date: string;
      election_group_id?: number;
      state_ids: number[];
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.electionsState, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to create state elections",
      };
    }
  });

export const createSenatorialDistrictElection = createServerFn({
  method: "POST",
})
  .inputValidator(
    (data: {
      office_id: number;
      election_date: string;
      election_group_id?: number;
      senatorial_district_ids: number[];
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.electionsSenatorialDistrict, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to create senatorial district elections",
      };
    }
  });

export const createFederalConstituencyElection = createServerFn({
  method: "POST",
})
  .inputValidator(
    (data: {
      office_id: number;
      election_date: string;
      election_group_id?: number;
      federal_constituency_ids: number[];
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.electionsFederalConstituency, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to create federal constituency elections",
      };
    }
  });

export const createStateConstituencyElection = createServerFn({
  method: "POST",
})
  .inputValidator(
    (data: {
      office_id: number;
      election_date: string;
      election_group_id?: number;
      state_constituency_ids: number[];
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.electionsStateConstituency, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to create state constituency elections",
      };
    }
  });

export const createLgaElection = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      office_id: number;
      election_date: string;
      election_group_id?: number;
      lga_ids: number[];
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.electionsLga, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to create LGA elections",
      };
    }
  });

export const createWardElection = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      office_id: number;
      election_date: string;
      election_group_id?: number;
      ward_ids: number[];
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.electionsWard, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to create Ward elections",
      };
    }
  });

export const getElectionCandidates = createServerFn({ method: "GET" })
  .inputValidator((electionId: string | number) => electionId)
  .handler(async ({ data: electionId }) => {
    try {
      return await apiFetchJson(API_URL.electionCandidates(electionId));
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch election candidates",
      };
    }
  });

export const syncElectionCandidates = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      electionId: string | number;
      candidates: {
        candidate_id: number;
        party_id: number;
        party_short_name: string;
      }[];
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(
        API_URL.electionCandidates(data.electionId),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ candidates: data.candidates }),
        },
      );
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to sync candidates",
      };
    }
  });

