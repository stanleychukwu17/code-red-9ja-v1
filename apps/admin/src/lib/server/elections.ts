import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export type ElectionsFilters = {
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
      const params = new URLSearchParams();
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));
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

export const updateElection = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string | number;
      name: string;
      election_date: string;
      election_group_id: number;
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

export const bulkDeleteElections = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      election_ids: (string | number)[];
      election_group_id?: number;
    }) => {
      return {
        election_ids: data.election_ids
          .map((id) => Number(id))
          .filter((id) => !isNaN(id) && id > 0),
        election_group_id: data.election_group_id
          ? Number(data.election_group_id)
          : undefined,
      };
    },
  )
  .handler(async ({ data: { election_ids, election_group_id } }) => {
    try {
      if (election_ids.length === 0) {
        return { success: false, message: "No election IDs provided" };
      }
      return await apiFetchJson(API_URL.electionsBulk, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ election_ids, election_group_id }),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to delete elections",
      };
    }
  });

export const bulkUpdateElectionGroup = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      election_ids: (string | number)[];
      election_group_id: number;
      from_election_group_id?: number;
    }) => {
      return {
        election_ids: data.election_ids
          .map((id) => Number(id))
          .filter((id) => !isNaN(id) && id > 0),
        election_group_id: Number(data.election_group_id),
        from_election_group_id: data.from_election_group_id
          ? Number(data.from_election_group_id)
          : undefined,
      };
    },
  )
  .handler(
    async ({
      data: { election_ids, election_group_id, from_election_group_id },
    }) => {
      try {
        if (election_ids.length === 0) {
          return { success: false, message: "No election IDs provided" };
        }
        return await apiFetchJson(API_URL.electionsBulkGroup, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            election_ids,
            election_group_id,
            from_election_group_id,
          }),
        });
      } catch (error: any) {
        return {
          success: false,
          message: error?.message || "Failed to update election group",
        };
      }
    },
  );

export const createNationwideElection = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      office_id: number;
      election_date: string;
      election_group_id?: number;
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
      all_wards?: boolean;
      ward_ids?: number[];
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

