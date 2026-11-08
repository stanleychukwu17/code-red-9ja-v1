import { Crown, Award, ShieldCheck, UserCheck, Users } from "lucide-react";

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
