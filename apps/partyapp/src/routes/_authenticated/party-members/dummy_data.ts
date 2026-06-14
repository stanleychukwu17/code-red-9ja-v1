import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";
import type { PartyMemberType } from "#/components/tiles/party-member-tile";

export const PARTY_MEMBERS_TABS: PageHeaderTabProps[] = [
  { id: "all", label: "All", href: "/party-members" },
  { id: "admin", label: "Admin", href: "/party-members/admin" },
  { id: "agent", label: "Agent", href: "/party-members/agent" },
];

export const allPartyMembers: PartyMemberType[] = [
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    partyOffice: "National Chairman",
    dateLabel: "July 9, 2026",
    role: "-",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    partyOffice: "Deputy National Chairman",
    dateLabel: "July 9, 2026",
    role: "Admin",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    partyOffice: "National Secretary",
    dateLabel: "July 9, 2026",
    role: "Admin",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    partyOffice: "Deputy National Secretary",
    dateLabel: "July 9, 2026",
    role: "-",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop",
    partyOffice: "Party Member",
    dateLabel: "July 9, 2026",
    role: "-",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    partyOffice: "Party Member",
    dateLabel: "July 9, 2026",
    role: "-",
  },
];

export const agentPartyMembers: PartyMemberType[] = [
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop",
    partyOffice: "Party Agent",
    dateLabel: "July 9, 2026",
    role: "-",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    partyOffice: "Party Agent",
    dateLabel: "July 9, 2026",
    role: "-",
  },
];

export const adminPartyMembers: PartyMemberType[] = [
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    partyOffice: "Deputy National Chairman",
    dateLabel: "July 9, 2026",
    role: "Admin",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    partyOffice: "National Secretary",
    dateLabel: "July 9, 2026",
    role: "Admin",
  },
];
