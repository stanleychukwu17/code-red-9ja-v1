import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";
import { APP_URL } from "#/lib/config";

export const getAgentsTabs = (partyShortName: string): PageHeaderTabProps[] => [
  { id: "coverage", label: "Agent coverage", href: `${APP_URL.partyRoutes.agents(partyShortName)}/coverage` },
  { id: "polling-agent", label: "Polling agent", href: `${APP_URL.partyRoutes.agents(partyShortName)}/polling-agent` },
  { id: "ward-supervisor", label: "Ward supervisor", href: `${APP_URL.partyRoutes.agents(partyShortName)}/ward-supervisor` },
  { id: "lga-supervisor", label: "LGA supervisor", href: `${APP_URL.partyRoutes.agents(partyShortName)}/lga-supervisor` },
  { id: "state-supervisor", label: "State supervisor", href: `${APP_URL.partyRoutes.agents(partyShortName)}/state-supervisor` },
];
