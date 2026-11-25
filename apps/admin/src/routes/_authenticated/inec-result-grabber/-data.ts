import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";

export const INEC_RESULT_GRABBER_TABS: PageHeaderTabProps[] = [
  { id: "main", label: "Main", href: "/inec-result-grabber" },
  { id: "scrape", label: "Discover Elections", href: "/inec-result-grabber/scrape" },
  { id: "logs", label: "Logs", href: "/inec-result-grabber/logs" },
];
