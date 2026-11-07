import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";
import { APP_URL } from "#/lib/config";

export type ApplicationsFilters = {
  election_group_id?: number;
  state_id?: number;
  lga_id?: number;
  ward_id?: number;
  polling_unit_id?: number;
};

export const parseNumberParam = (val: unknown): number | undefined => {
  if (val === undefined || val === null || val === "") return undefined;

  const num = Number(val);
  return !isNaN(num) && num > 0 ? num : undefined;
};

export const validateApplicationsSearch = (
  search: Record<string, unknown>,
): ApplicationsFilters => ({
  election_group_id: parseNumberParam(search.election_group_id),
  state_id: parseNumberParam(search.state_id),
  lga_id: parseNumberParam(search.lga_id),
  ward_id: parseNumberParam(search.ward_id),
  polling_unit_id: parseNumberParam(search.polling_unit_id),
});

export const buildApplicationsQuery = (search?: ApplicationsFilters): string => {
  if (!search) return "";
  const params = new URLSearchParams();
  if (search.election_group_id) params.set("election_group_id", String(search.election_group_id));
  if (search.state_id) params.set("state_id", String(search.state_id));
  if (search.lga_id) params.set("lga_id", String(search.lga_id));
  if (search.ward_id) params.set("ward_id", String(search.ward_id));
  if (search.polling_unit_id) params.set("polling_unit_id", String(search.polling_unit_id));
  const str = params.toString();
  return str ? `?${str}` : "";
};

export const getApplicationTabs = (
  partyShortName: string,
  search?: ApplicationsFilters,
): PageHeaderTabProps[] => {
  const searchGetter = (prev: any) => {
    const combined = { ...prev, ...(search ?? {}) };
    const next: Record<string, any> = {};
    for (const [key, val] of Object.entries(combined)) {
      if (val !== undefined && val !== null && val !== "") {
        next[key] = val;
      }
    }
    return next;
  };

  return [
    {
      id: "pending",
      label: `Pending`,
      href: APP_URL.partyRoutes.applications(partyShortName),
      search: searchGetter,
    },
    {
      id: "accepted",
      label: `Accepted`,
      href: `${APP_URL.partyRoutes.applications(partyShortName)}/accepted`,
      search: searchGetter,
    },
    {
      id: "rejected",
      label: `Rejected`,
      href: `${APP_URL.partyRoutes.applications(partyShortName)}/rejected`,
      search: searchGetter,
    },
  ];
};
