import type { LucideIcon } from "lucide-react";
import {
  Home,
  Clock,
  Crown,
  Users,
  FolderKanban,
  Info,
  Share2,
  ShieldCheck,
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
  isChapterMember: boolean;
  isFollowing: boolean;
  nationalLeadersCol1: PartyLeader[];
  nationalLeadersCol2: PartyLeader[];
}

export type PartyTabPath =
  | "home"
  | "timeline"
  | "leadership"
  | "party-admins"
  | "members"
  | "groups"
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
  { path: "leadership", label: "Leadership", icon: Crown },
  { path: "party-admins", label: "Party Admins", icon: ShieldCheck },
  { path: "members", label: "Members", icon: Users },
  { path: "groups", label: "Groups", icon: FolderKanban },
  { path: "about", label: "About", icon: Info },
  { path: "social-links", label: "social links", icon: Share2 },
];
