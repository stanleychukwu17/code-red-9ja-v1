import type { FC, ReactNode } from "react";
import { cn } from "../../lib/utils";

// Supported team role types across electoral hierarchy
export type TeamRoleType =
  | "polling_agent"
  | "ward_election_supervisor"
  | "lga_election_supervisor"
  | "state_election_supervisor";

// Role color scheme configuration
export type RoleColorConfig = {
  bg: string;
  text: string;
};

// Maps role identifiers to distinct thematic badge colors
export const getTeamRoleColor = (role?: TeamRoleType | string): RoleColorConfig => {
  switch (role) {
    case "polling_agent":
      return {
        bg: "#059669", // Emerald green for grassroots polling unit agents
        text: "#FFFFFF",
      };
    case "ward_election_supervisor":
      return {
        bg: "#5225a6", // Deep royal purple for ward supervisors
        text: "#FFFFFF",
      };
    case "lga_election_supervisor":
      return {
        bg: "#D97706", // Amber gold for local government area supervisors
        text: "#FFFFFF",
      };
    case "state_election_supervisor":
      return {
        bg: "#2563EB", // Vibrant blue for state coordinators
        text: "#FFFFFF",
      };
    default:
      return {
        bg: "#5225a6", // Default purple fallback
        text: "#FFFFFF",
      };
  }
};

// Formats technical role keys into friendly display labels
export const formatTeamRole = (role?: TeamRoleType | string): string => {
  switch (role) {
    case "polling_agent":
      return "pu agent";
    case "ward_election_supervisor":
      return "ward supervisor";
    case "lga_election_supervisor":
      return "lga supervisor";
    case "state_election_supervisor":
      return "state supervisor";
    default:
      return role || "agent";
  }
};

// Team role badge properties
export type TeamRoleBadgeProps = {
  role?: TeamRoleType | string;
  className?: string;
  children?: ReactNode;
};

// Visual bullet badge indicating team member duty level
export const TeamRoleBadge: FC<TeamRoleBadgeProps> = ({ role, className, children }) => {
  const { bg, text } = getTeamRoleColor(role);
  const displayText = children ?? formatTeamRole(role);

  return (
    <span
      className={cn(
        "px-2.5 py-0.5 rounded-full text-[10px] font-semibold w-fit shrink-0 select-none",
        className
      )}
      style={{ backgroundColor: bg, color: text }}
    >
      {displayText}
    </span>
  );
};
