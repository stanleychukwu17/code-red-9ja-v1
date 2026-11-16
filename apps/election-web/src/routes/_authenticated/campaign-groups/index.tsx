import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { WEB_URL } from "#/lib/config";
import { PageHeader } from "#/components/Headers";
import { getPageHeader } from "#/lib/shared/meta";
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
  const { hasActiveAssignment, partyId, isLoading: isAssignmentsLoading } = useAssignments();

  // Query hierarchical campaign groups resolved by backend based on operative scope
  const fetchMyGroups = useServerFn(getMyCampaignGroups);
  const { data: myGroupsData, isLoading: isGroupsLoading } = useQuery({
    queryKey: ["myCampaignGroups", partyId],
    queryFn: async () => {
      const res = await fetchMyGroups({
        data: {
          party_id: partyId ?? undefined,
        },
      });
      return res?.data ?? null;
    },

    enabled: !!hasActiveAssignment && !!partyId,
    staleTime: Infinity,
  });

  // Composite loading state for assignment check and groups query
  const isLoading = isAssignmentsLoading || (hasActiveAssignment && isGroupsLoading);

  // Render loading placeholder while fetching assignments and groups
  if (isLoading) {
    return <CampaignGroupsLoadingState />;
  }

  // Guard against users lacking an active election assignment
  if (!hasActiveAssignment) {
    return <NoActiveAssignmentState />;
  }

  // Resolved campaign groups matching user territory scope
  const campaignGroups = myGroupsData?.groups ?? [];

  return (
    <div className="flex flex-col flex-1 pb-24 px-4 max-w-md">
      <PageHeader title="Campaign Groups" hideBackButton />

      {/* Campaign groups list */}
      {campaignGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <p className="text-base font-medium text-c-80">
            No campaign groups found
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            No campaign groups are associated with your active assignment yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {campaignGroups.map((group) => {
            return (
              <div
                key={group.id}
                className="flex items-center justify-between gap-4 py-4 group transition-colors hover:bg-muted/20 active:bg-muted/40 rounded-lg px-2 -mx-2"
              >
                {/* Left circular avatar / emblem */}
                <div className="relative size-14 shrink-0 rounded-full overflow-hidden bg-[#FAF7F2] dark:bg-muted/40 flex items-center justify-center border border-border/30 shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&w=200"
                    alt={group.title}
                    className="size-full object-cover"
                  />
                </div>

                {/* Title & Description */}
                <div className="flex flex-col flex-1 min-w-0 pr-2">
                  <h3 className="text-base font-medium text-c-100 leading-snug truncate">
                    {group.title}
                  </h3>
                  <p className="text-xs text-c-50 dark:text-muted-foreground leading-tight mt-2">
                    {group.description}
                  </p>
                </div>

                {/* Right arrow in circle linking to campaign group on web app */}
                <a
                  href={WEB_URL.campaignGroup(group.party_id, group.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-8 rounded-full border border-c-100 dark:border-white/80 flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-label={`Open ${group.title}`}
                >
                  <ArrowRight className="size-4 stroke-[2.2] text-c-100 dark:text-white" />
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
