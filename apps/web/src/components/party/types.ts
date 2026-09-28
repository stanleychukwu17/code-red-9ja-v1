import type { LucideIcon } from "lucide-react";
import {
  Home,
  Clock,
  Users,
  UserCheck,
  FolderKanban,
  Info,
  Share2,
} from "lucide-react";

export interface PartyLeader {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface PartyEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  description?: string;
  image?: string;
}

export interface PartyProfileData {
  id: string | number;
  shortName: string;
  name: string;
  coverImage: string;
  logo: string;
  followersCount: string;
  followersValue: number;
  totalMembersCount: string;
  chapterMembersCount: string;
  isMember: boolean;
  isFollowing: boolean;
  nationalLeadersCol1: PartyLeader[];
  nationalLeadersCol2: PartyLeader[];
}

export type PartyTabPath =
  | "home"
  | "timeline"
  | "followers"
  | "groups"
  | "members"
  | "about"
  | "social-links";

export type PartyTabId = PartyTabPath;

export interface PartyTabItem {
  path: PartyTabPath;
  label: string;
  icon: LucideIcon;
}

export const PARTY_NAV_TABS: PartyTabItem[] = [
  { path: "home", label: "Home", icon: Home },
  { path: "timeline", label: "Timeline", icon: Clock },
  { path: "members", label: "Members", icon: Users },
  { path: "followers", label: "Followers", icon: UserCheck },
  { path: "groups", label: "Groups", icon: FolderKanban },
  { path: "about", label: "About", icon: Info },
  { path: "social-links", label: "social links", icon: Share2 },
];
