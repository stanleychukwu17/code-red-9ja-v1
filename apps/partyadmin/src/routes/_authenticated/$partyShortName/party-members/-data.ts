import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";
import type { PartyAdminType } from "#/components/tiles/party-member-tile";
import { APP_URL } from "#/lib/config";

export const getPartyAdminsTabs = (
  partyShortName: string,
): PageHeaderTabProps[] => [
  { id: "all", label: "Members", href: APP_URL.partyRoutes.members(partyShortName) },
  {
    id: "agent",
    label: "Polling agents",
    href: `${APP_URL.partyRoutes.members(partyShortName)}/agent`,
  },
];

export const getAllPartyAdmins = (
  partyShortName: string,
): PartyAdminType[] => [
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    partyOffice: `${partyShortName.toUpperCase()} National Chairman`,
    dateLabel: "July 9, 2026",
    role: "-",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    partyOffice: `${partyShortName.toUpperCase()} Deputy National Chairman`,
    dateLabel: "July 9, 2026",
    role: "Admin",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    partyOffice: `${partyShortName.toUpperCase()} National Secretary`,
    dateLabel: "July 9, 2026",
    role: "Admin",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    partyOffice: `${partyShortName.toUpperCase()} Deputy National Secretary`,
    dateLabel: "July 9, 2026",
    role: "-",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop",
    partyOffice: `${partyShortName.toUpperCase()} Party Admin`,
    dateLabel: "July 9, 2026",
    role: "-",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    partyOffice: `${partyShortName.toUpperCase()} Party Admin`,
    dateLabel: "July 9, 2026",
    role: "-",
  },
];

export const getAgentPartyAdmins = (
  partyShortName: string,
): PartyAdminType[] => [
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop",
    partyOffice: `${partyShortName.toUpperCase()} Polling Agent`,
    dateLabel: "July 9, 2026",
    role: "-",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    partyOffice: `${partyShortName.toUpperCase()} Polling Agent`,
    dateLabel: "July 9, 2026",
    role: "-",
  },
];

export const getAdminPartyAdmins = (
  partyShortName: string,
): PartyAdminType[] => [
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    partyOffice: `${partyShortName.toUpperCase()} Deputy National Chairman`,
    dateLabel: "July 9, 2026",
    role: "Admin",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    partyOffice: `${partyShortName.toUpperCase()} National Secretary`,
    dateLabel: "July 9, 2026",
    role: "Admin",
  },
];
