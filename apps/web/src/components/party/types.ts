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
  Landmark,
  CalendarDays,
} from "lucide-react";

export interface PartyLeader {
  id: string | number;
  name?: string | null;
  role: string;
  avatar?: string | null;
  isVacant?: boolean;
  is_vacant?: boolean;
  since?: string | null;
  username?: string | null;
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
  | "events"
  | "leadership"
  | "party-chapters"
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
  { path: "events", label: "Events", icon: CalendarDays },
  { path: "leadership", label: "Leadership", icon: Crown },
  { path: "party-chapters", label: "Party chapters", icon: Landmark },
  { path: "party-admins", label: "Party Admins", icon: ShieldCheck },
  { path: "members", label: "Members", icon: Users },
  { path: "groups", label: "Groups", icon: FolderKanban },
  { path: "about", label: "About", icon: Info },
  { path: "social-links", label: "social links", icon: Share2 },
];
