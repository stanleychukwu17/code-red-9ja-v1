import { Crown, Award, ShieldCheck, UserCheck, Users } from "lucide-react";
import type { Party } from "#/hooks";

// =========================================================================
// 1. DOMAIN & ENTITY TYPES
// =========================================================================

export type CampaignGroupScope = "national" | "state" | "lga" | "ward" | string;

export type CampaignGroupRole =
  | "candidate"
  | "party_official"
  | "state_election_supervisor"
  | "lga_election_supervisor"
  | "ward_election_supervisor"
  | "polling_agent"
  | "state_supervisor"
  | "lga_supervisor"
  | "ward_supervisor"
  | "agent"
  | string;

export type CampaignGroupMemberItem = {
  id: number;
  party_id: number;
  group_id: number;
  user_id: number;
  role: CampaignGroupRole;
  can_broadcast: boolean;
  joined_at: string;
  fake_id?: string | number;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar?: string;
};

export type CampaignGroupDetails = {
  id: number;
  party_id: number;
  scope: CampaignGroupScope;
  state_id?: number | null;
  lga_id?: number | null;
  ward_id?: number | null;
  state_name?: string | null;
  lga_name?: string | null;
  ward_name?: string | null;
  status: string;
  officials_added: boolean;
  created_at: string;
  updated_at: string;
};

// =========================================================================
// 2. SERVER FUNCTION & API DTO TYPES
// =========================================================================

export type CampaignGroupResponse = {
  success: boolean;
  message?: string;
  data?: {
    group: CampaignGroupDetails;
  };
};

export type CampaignGroupMembersResponse = {
  success: boolean;
  message?: string;
  data?: {
    members: CampaignGroupMemberItem[];
  };
};

export type SyncOfficialsResponse = {
  success: boolean;
  message?: string;
  data?: {
    result: any;
  };
};

export type SwitchCampaignGroupInput = {
  partyId: number | string;
  stateId?: number;
  lgaId?: number;
  wardId?: number;
};

export type FindCampaignGroupResponse = {
  success: boolean;
  message?: string;
  data?: {
    group_id: number;
  };
};

// =========================================================================
// 3. UI, ROLES & NAVIGATION TYPES
// =========================================================================

export type CampaignGroupTabId = "home" | "members" | "timeline" | "talks" | "issues" | "notes";

export type RoleConfigItem = {
  label: string;
  badgeColor: string;
  icon: typeof Crown;
};

export const ROLE_CONFIG: Record<string, RoleConfigItem> = {
  candidate: {
    label: "Fielded Candidate",
    badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    icon: Crown,
  },
  party_official: {
    label: "Party Official",
    badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    icon: Award,
  },
  state_election_supervisor: {
    label: "State Election Supervisor",
    badgeColor: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
    icon: ShieldCheck,
  },
  state_supervisor: {
    label: "State Election Supervisor",
    badgeColor: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
    icon: ShieldCheck,
  },
  lga_election_supervisor: {
    label: "LGA Election Supervisor",
    badgeColor: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
    icon: ShieldCheck,
  },
  lga_supervisor: {
    label: "LGA Election Supervisor",
    badgeColor: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
    icon: ShieldCheck,
  },
  ward_election_supervisor: {
    label: "Ward Election Supervisor",
    badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
    icon: ShieldCheck,
  },
  ward_supervisor: {
    label: "Ward Election Supervisor",
    badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
    icon: ShieldCheck,
  },
  polling_agent: {
    label: "Polling Agent",
    badgeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    icon: UserCheck,
  },
  agent: {
    label: "Polling Agent",
    badgeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    icon: UserCheck,
  },
};

export function getRoleMeta(role: string): RoleConfigItem {
  return (
    ROLE_CONFIG[role] || {
      label: role.replace(/_/g, " "),
      badgeColor: "bg-neutral-500/15 text-neutral-700 dark:text-neutral-400 border-neutral-500/30",
      icon: Users,
    }
  );
}

export type CampaignGroupNavTabsProps = {
  partyId?: string | number;
  groupId?: string | number;
  activeTab?: CampaignGroupTabId;
  onTabChange?: (tab: CampaignGroupTabId) => void;
  className?: string;
};

export type CampaignGroupHeroProps = {
  activeParty?: Party | null;
  group?: CampaignGroupDetails;
  groupTitle?: string;
  partyShortName?: string;
  totalMembers?: number;
  roleCounts?: {
    candidate: number;
    party_official: number;
    supervisor: number;
    agent?: number;
    all?: number;
    polling_agent?: number;
    ward_supervisor?: number;
    lga_supervisor?: number;
    state_supervisor?: number;
  };
  isSyncing?: boolean;
  onSync?: () => void;
  onShare?: () => void;
};

export type CampaignGroupHierarchyFilterProps = {
  activeParty: Party;
  group: CampaignGroupDetails;
  partyShortName?: string;
  isSyncing?: boolean;
  onSync?: () => void;
};

export type HierarchyStep = {
  id: string;
  label: string;
  level: "national" | "state" | "lga" | "ward";
  payload: SwitchCampaignGroupInput;
  isCurrent: boolean;
};

export type HierarchyStepItemProps = {
  step: HierarchyStep;
  isLast: boolean;
  activeParty: Party;
};
