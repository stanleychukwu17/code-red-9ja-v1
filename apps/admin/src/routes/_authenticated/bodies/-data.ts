export type BodiesTabId =
  | "states"
  | "districts"
  | "federal-constituencies"
  | "state-constituencies"
  | "lgas"
  | "wards"
  | "polling-units";

export const BODIES_TABS = [
  { id: "states", label: "States", href: "/bodies/states" },
  { id: "districts", label: "Districts", href: "/bodies/senatorial-districts" },
  {
    id: "federal-constituencies",
    label: "Federal Con.",
    href: "/bodies/federal-constituencies",
  },
  { id: "lgas", label: "LGAs", href: "/bodies/lgas" },
  {
    id: "state-constituencies",
    label: "State Con.",
    href: "/bodies/state-constituencies",
  },
  { id: "wards", label: "Wards", href: "/bodies/wards" },
  {
    id: "polling-units",
    label: "Polling units",
    href: "/bodies/polling-units",
  },
];
