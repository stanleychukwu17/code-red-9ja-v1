import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";
import type { ApplicationType } from "#/components/tiles/application-tile";

export const getApplicationTabs = (
  partyShortName: string,
  counts?: { pending?: number; accepted?: number; rejected?: number },
): PageHeaderTabProps[] => [
  {
    id: "pending",
    label: `Pending`,
    href: `/${partyShortName}/applications`,
  },
  {
    id: "accepted",
    label: `Accepted`,
    href: `/${partyShortName}/applications/accepted`,
  },
  {
    id: "rejected",
    label: `Rejected`,
    href: `/${partyShortName}/applications/rejected`,
  },
];

export const getPendingApplications = (
  partyShortName: string,
): ApplicationType[] => [
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    election: `${partyShortName.toUpperCase()} 2027 Presidential`,
    residence: "Abuja, abaji...",
    appliedOn: "May 26, 26",
    decisionLabel: "Accept",
    decisionVariant: "pending",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    election: `${partyShortName.toUpperCase()} 2027 Presidential`,
    residence: "Abuja, abaji...",
    appliedOn: "May 26, 26",
    decisionLabel: "Accept",
    decisionVariant: "pending",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&h=200&fit=crop",
    election: `${partyShortName.toUpperCase()} 2027 Governorship`,
    residence: "Abuja, abaji...",
    appliedOn: "May 26, 26",
    decisionLabel: "Accept",
    decisionVariant: "pending",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    election: `${partyShortName.toUpperCase()} 2027 Presidential`,
    residence: "Abuja, abaji...",
    appliedOn: "May 26, 26",
    decisionLabel: "Accept",
    decisionVariant: "pending",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    election: `${partyShortName.toUpperCase()} 2027 Presidential`,
    residence: "Abuja, abaji...",
    appliedOn: "May 26, 26",
    decisionLabel: "Accept",
    decisionVariant: "pending",
  },
];

export const getAcceptedApplications = (
  partyShortName: string,
): ApplicationType[] => [
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    election: `${partyShortName.toUpperCase()} 2027 Presidential`,
    residence: "Abuja, abaji...",
    appliedOn: "May 26, 26",
    decisionLabel: "Cancel acceptance",
    decisionVariant: "reject",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    election: `${partyShortName.toUpperCase()} 2027 Presidential`,
    residence: "Abuja, abaji...",
    appliedOn: "May 26, 26",
    decisionLabel: "Cancel acceptance",
    decisionVariant: "reject",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&h=200&fit=crop",
    election: `${partyShortName.toUpperCase()} 2027 Presidential`,
    residence: "Abuja, abaji...",
    appliedOn: "May 26, 26",
    decisionLabel: "Cancel acceptance",
    decisionVariant: "reject",
  },
];

export const getRejectedApplications = (
  partyShortName: string,
): ApplicationType[] => [
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    election: `${partyShortName.toUpperCase()} 2027 Presidential`,
    residence: "Abuja, abaji...",
    appliedOn: "May 26, 26",
    decisionLabel: "Cancel rejection",
    decisionVariant: "reject",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    election: `${partyShortName.toUpperCase()} 2027 Presidential`,
    residence: "Abuja, abaji...",
    appliedOn: "May 26, 26",
    decisionLabel: "Cancel rejection",
    decisionVariant: "reject",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&h=200&fit=crop",
    election: `${partyShortName.toUpperCase()} 2027 Presidential`,
    residence: "Abuja, abaji...",
    appliedOn: "May 26, 26",
    decisionLabel: "Cancel rejection",
    decisionVariant: "reject",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    election: `${partyShortName.toUpperCase()} 2027 Presidential`,
    residence: "Abuja, abaji...",
    appliedOn: "May 26, 26",
    decisionLabel: "Cancel rejection",
    decisionVariant: "reject",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    election: `${partyShortName.toUpperCase()} 2027 Presidential`,
    residence: "Abuja, abaji...",
    appliedOn: "May 26, 26",
    decisionLabel: "Cancel rejection",
    decisionVariant: "reject",
  },
  {
    name: "Charles Ogenna",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    election: `${partyShortName.toUpperCase()} 2027 Presidential`,
    residence: "Abuja, abaji...",
    appliedOn: "May 26, 26",
    decisionLabel: "Cancel rejection",
    decisionVariant: "reject",
  },
];
