import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";


// Fetch all states with their state_final_result for a given election
export const getStateFinalResults = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      electionGroupId?: number;
      electionId?: number;
      limit?: number;
      cursor?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data.electionGroupId)
        params.append("election_group_id", String(data.electionGroupId));
      if (data.electionId)
        params.append("election_id", String(data.electionId));
      if (data.limit) params.append("limit", String(data.limit));
      if (data.cursor) params.append("cursor", data.cursor);

      const response = await apiFetch(
        `${API_URL.stateFinalResults}?${params.toString()}`,
      );
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to fetch state final results: " + (error as Error).message,
      };
    }
  });

// Fetch senatorial districts with their senatorial_district_final_result
export const getSenatorialDistrictFinalResults = createServerFn({
  method: "GET",
})
  .inputValidator(
    (data: {
      electionGroupId?: number;
      electionId?: number;
      stateId?: number;
      limit?: number;
      cursor?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data.electionGroupId)
        params.append("election_group_id", String(data.electionGroupId));
      if (data.electionId)
        params.append("election_id", String(data.electionId));
      if (data.stateId) params.append("state_id", String(data.stateId));
      if (data.limit) params.append("limit", String(data.limit));
      if (data.cursor) params.append("cursor", data.cursor);

      const response = await apiFetch(
        `${API_URL.senatorialDistrictFinalResults}?${params.toString()}`,
      );
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to fetch senatorial district final results: " +
          (error as Error).message,
      };
    }
  });

// Fetch federal constituencies with their federal_constituency_final_result
export const getFederalConstituencyFinalResults = createServerFn({
  method: "GET",
})
  .inputValidator(
    (data: {
      electionGroupId?: number;
      electionId?: number;
      stateId?: number;
      senatorialDistrictId?: number;
      limit?: number;
      cursor?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data.electionGroupId)
        params.append("election_group_id", String(data.electionGroupId));
      if (data.electionId)
        params.append("election_id", String(data.electionId));
      if (data.stateId) params.append("state_id", String(data.stateId));
      if (data.senatorialDistrictId)
        params.append(
          "senatorial_district_id",
          String(data.senatorialDistrictId),
        );
      if (data.limit) params.append("limit", String(data.limit));
      if (data.cursor) params.append("cursor", data.cursor);

      const response = await apiFetch(
        `${API_URL.federalConstituencyFinalResults}?${params.toString()}`,
      );
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to fetch federal constituency final results: " +
          (error as Error).message,
      };
    }
  });

// Fetch LGAs with their lga_final_result
export const getLGAFinalResults = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      electionGroupId?: number;
      electionId?: number;
      stateId?: number;
      federalConstituencyId?: number;
      senatorialDistrictId?: number;
      limit?: number;
      cursor?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data.electionGroupId)
        params.append("election_group_id", String(data.electionGroupId));
      if (data.electionId)
        params.append("election_id", String(data.electionId));
      if (data.stateId) params.append("state_id", String(data.stateId));
      if (data.federalConstituencyId)
        params.append(
          "federal_constituency_id",
          String(data.federalConstituencyId),
        );
      if (data.senatorialDistrictId)
        params.append(
          "senatorial_district_id",
          String(data.senatorialDistrictId),
        );
      if (data.limit) params.append("limit", String(data.limit));
      if (data.cursor) params.append("cursor", data.cursor);

      const response = await apiFetch(
        `${API_URL.lgaFinalResults}?${params.toString()}`,
      );
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to fetch LGA final results: " + (error as Error).message,
      };
    }
  });

// Fetch wards with their ward_final_result
export const getWardFinalResults = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      electionGroupId?: number;
      electionId?: number;
      stateId?: number;
      lgaId?: number;
      federalConstituencyId?: number;
      stateConstituencyId?: number;
      limit?: number;
      cursor?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data.electionGroupId)
        params.append("election_group_id", String(data.electionGroupId));
      if (data.electionId)
        params.append("election_id", String(data.electionId));
      if (data.stateId) params.append("state_id", String(data.stateId));
      if (data.lgaId) params.append("lga_id", String(data.lgaId));
      if (data.federalConstituencyId)
        params.append(
          "federal_constituency_id",
          String(data.federalConstituencyId),
        );
      if (data.stateConstituencyId)
        params.append(
          "state_constituency_id",
          String(data.stateConstituencyId),
        );
      if (data.limit) params.append("limit", String(data.limit));
      if (data.cursor) params.append("cursor", data.cursor);

      const response = await apiFetch(
        `${API_URL.wardFinalResults}?${params.toString()}`,
      );
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to fetch ward final results: " + (error as Error).message,
      };
    }
  });
