import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";
import { APP_URL } from "#/lib/config";

export const ELECTION_TABS: PageHeaderTabProps[] = [
  { id: "groups", label: "Groups", href: APP_URL.elections.groups },
  { id: "instances", label: "Instances", href: APP_URL.elections.instances },
  { id: "offices", label: "Offices", href: APP_URL.elections.offices },
  { id: "explanation", label: "Explanation", href: APP_URL.elections.explanation },
];
