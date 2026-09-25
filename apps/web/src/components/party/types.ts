export interface PartyLeader {
  id: string;
  name: string;
  role: string;
  avatar: string;
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
  icon?: boolean;
}

export const PARTY_NAV_TABS: PartyTabItem[] = [
  { path: "home", label: "Party history", icon: true },
  { path: "timeline", label: "Timeline" },
  { path: "followers", label: "Followers" },
  { path: "groups", label: "Groups" },
  { path: "members", label: "Members" },
  { path: "about", label: "About" },
  { path: "social-links", label: "social links" },
];
