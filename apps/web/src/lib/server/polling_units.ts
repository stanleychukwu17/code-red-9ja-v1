import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

/**
 * Represents a Polling Unit entity returned by the backend API.
 */
export type PollingUnitItem = {
  id: number;
  name: string;
  code?: string;
  pu_code?: string;
  registration_area_id?: number;
  ward_id: number;
  ward_name?: string;
  lga_id: number;
  lga_name?: string;
  state_id: number;
  state_name?: string;
  latitude?: number;
  longitude?: number;
  precise_location?: string;
  formatted_address?: string;
  google_place_id?: string;
};

/**
 * Represents a State entity within Nigeria.
 */
export type StateItem = {
  id: number;
  name: string;
  country_id?: number;
};

/**
 * Represents a Local Government Area (LGA) entity.
 */
export type LGAItem = {
  id: number;
  name: string;
  state_id: number;
};

/**
 * Represents an Electoral Ward entity within an LGA.
 */
export type WardItem = {
  id: number;
  name: string;
  lga_id: number;
  state_id: number;
};

/**
 * Server function to fetch all States in Nigeria (country_id: 161).
 * Used to populate the top-level state selector in geographic filters.
 */
export const getStatesForNigeria = createServerFn().handler(async () => {
  try {
    const res = await apiFetchJson(API_URL.getStates(161));
    return res;
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to fetch states",
      data: { states: [] },
    };
  }
});

/**
 * Server function to fetch LGAs for a given State ID.
 * Returns an empty array if no stateId is provided.
 */
export const getLGAsByState = createServerFn()
  .inputValidator((data: { stateId?: number }) => data)
  .handler(async ({ data: { stateId } }) => {
    try {
      if (!stateId) return { success: true, data: { lgas: [] } };
      const res = await apiFetchJson(API_URL.getLGAs(stateId, 100));
      return res;
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch LGAs",
        data: { lgas: [] },
      };
    }
  });

/**
 * Server function to fetch Electoral Wards for a specific LGA (and optional state).
 * Returns an empty array if no lgaId is provided.
 */
export const getWardsByLGA = createServerFn()
  .inputValidator((data: { lgaId?: number; stateId?: number }) => data)
  .handler(async ({ data: { lgaId, stateId } }) => {
    try {
      if (!lgaId) return { success: true, data: { wards: [] } };
      const res = await apiFetchJson(API_URL.getWards(lgaId, stateId, 100));
      return res;
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch wards",
        data: { wards: [] },
      };
    }
  });

/**
 * Server function to query Polling Units filtered by hierarchical electoral criteria:
 * State ID, LGA ID, and Ward ID with cursor pagination support.
 */
export const getPollingUnitsList = createServerFn()
  .inputValidator(
    (data: {
      wardId?: number;
      localGovernmentId?: number;
      stateId?: number;
      limit?: number;
      cursor?: string | number;
    }) => data,
  )
  .handler(async ({ data: { wardId, localGovernmentId, stateId, limit = 50, cursor } }) => {
    try {
      const url = API_URL.getPollingUnits(wardId, localGovernmentId, stateId, limit, cursor);
      const res = await apiFetchJson(url);
      return res;
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch polling units",
        data: { polling_units: [] },
      };
    }
  });
