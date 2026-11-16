import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "#/components/Headers";
import { getPageHeader } from "#/lib/shared/meta";
import { useUserParty } from "#/hooks/useUserParty";
import { useAssignments } from "#/hooks/useAssignments";
import { getMyCampaignGroups } from "#/lib/server/campaign_groups";

export const Route = createFileRoute("/_authenticated/campaign-groups/")({
  head: () => getPageHeader({ title: "Campaign Groups" }),
  component: CampaignGroupsPage,
});

// Fallback view displayed while assignment status is being fetched
function CampaignGroupsLoadingState() {
  return (
    <div className="flex flex-col flex-1 pb-24 px-4 max-w-md w-full">
      <PageHeader title="Campaign Groups" hideBackButton />
      <div className="flex flex-1 items-center justify-center py-24 text-sm text-c-50">
        Loading assignments...
      </div>
    </div>
  );
}

// Empty state view displayed when user has no active assignment
function NoActiveAssignmentState() {
  return (
    <div className="flex flex-col flex-1 pb-24 px-4 max-w-md w-full">
      <PageHeader title="Campaign Groups" hideBackButton />
      <div className="flex flex-col flex-1 items-center justify-center py-14 text-center">
        <p className="text-base font-medium text-c-80">
          You do not have an active assignment
        </p>
      </div>
    </div>
  );
}

/**
 * CampaignGroupsPage renders the multi-tier campaign groups list
 * (National, State, LGA, Ward) matching the mock design.
 */
function CampaignGroupsPage() {
  const { party } = useUserParty();
  const { hasActiveAssignment, isLoading: isAssignmentsLoading } = useAssignments();

  // Query hierarchical campaign groups resolved by backend based on operative scope
  const fetchMyGroups = useServerFn(getMyCampaignGroups);
  const { data: groupsRes, isLoading: isGroupsLoading } = useQuery({
    queryKey: ["myCampaignGroups"],
    queryFn: async () => {
      const res = await fetchMyGroups();
      return res?.data?.groups || [];
    },
    enabled: !!hasActiveAssignment,
    staleTime: Infinity,
  });

  const isLoading = isAssignmentsLoading || (hasActiveAssignment && isGroupsLoading);

  if (isLoading) {
    return <CampaignGroupsLoadingState />;
  }

  if (!hasActiveAssignment) {
    return <NoActiveAssignmentState />;
  }

  const campaignGroups = groupsRes && groupsRes.length > 0 ? groupsRes : [
    {
      id: "national",
      scope: "national",
      title: "National campaign group",
      description:
        "Find National officials and candidates you are representing in the national campaign group",
    },
    {
      id: "state",
      scope: "state",
      title: "Abuja state campaign group",
      description:
        "Find National officials and candidates you are representing in the national campaign group",
    },
    {
      id: "lga",
      scope: "lga",
      title: "Bwari LGA campaign group",
      description:
        "Find National officials and candidates you are representing in the national campaign group",
    },
    {
      id: "ward",
      scope: "ward",
      title: "Usuma ward campaign group",
      description:
        "Find National officials and candidates you are representing in the national campaign group",
    },
  ];

  return (
    <div className="flex flex-col flex-1 pb-24 px-4 max-w-md">
      <PageHeader title="Campaign Groups" hideBackButton />

      {/* Campaign groups list */}
      <div className="flex flex-col divide-y divide-border/60">
        {campaignGroups.map((group) => (
          <div
            key={group.id}
            className="flex items-center justify-between gap-4 py-4 cursor-pointer group transition-colors hover:bg-muted/20 active:bg-muted/40 rounded-lg px-2 -mx-2"
          >
            {/* Left circular avatar / emblem */}
            <div className="relative size-14 shrink-0 rounded-full overflow-hidden bg-[#FAF7F2] dark:bg-muted/40 flex items-center justify-center border border-border/30 shadow-xs">
              {party?.logo ? (
                <img
                  src={party.logo}
                  alt={group.title}
                  className="size-full object-cover"
                />
              ) : (
                /* Botanical emblem illustration fallback */
                <svg
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-10 text-amber-800/80 dark:text-amber-500/80"
                >
                  <path
                    d="M32 54C32 44 26 36 18 32C26 30 32 24 32 12C32 24 38 30 46 32C38 36 32 44 32 54Z"
                    fill="currentColor"
                    fillOpacity="0.25"
                  />
                  <path
                    d="M22 28C24 22 29 18 32 16C35 18 40 22 42 28C38 27 35 28 32 30C29 28 26 27 22 28Z"
                    fill="currentColor"
                    fillOpacity="0.75"
                  />
                  <circle cx="32" cy="22" r="3" fill="currentColor" />
                  <path
                    d="M20 40C26 38 30 35 32 32C34 35 38 38 44 40C39 42 36 45 32 50C28 45 25 42 20 40Z"
                    fill="currentColor"
                    fillOpacity="0.6"
                  />
                </svg>
              )}
            </div>

            {/* Title & Description */}
            <div className="flex flex-col flex-1 min-w-0 pr-2">
              <h3 className="text-base font-bold text-c-100 tracking-tight leading-snug">
                {group.title}
              </h3>
              <p className="text-xs sm:text-sm text-c-50 dark:text-muted-foreground leading-snug mt-1">
                {group.description}
              </p>
            </div>

            {/* Right arrow in circle */}
            <div className="size-8 rounded-full border border-c-100 dark:border-white/80 flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-4 stroke-[2.2] text-c-100 dark:text-white" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
