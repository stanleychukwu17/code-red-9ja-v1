import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useEffect } from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { ElectionGroupsTable } from "#/components/Tables";
import { getElectionTabs } from "./data";
import { getElectionGroups } from "#/lib/server/election_groups";
import { useIntersectionObserver } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { ElectionGroupType } from "#/components/tiles/election-group-tile";
import { useAuth } from "#/providers/providers";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/elections/",
)({
  head: () => getPageHeader({ title: "Elections" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const { user } = useAuth();
  const partyId = user?.party?.id;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["election-groups", partyId],
      queryFn: async ({ pageParam }) => {
        const res = await getElectionGroups({
          data: { limit: 20, cursor: pageParam as string, partyId },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch election groups");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage: any) => {
        if (lastPage && lastPage.meta && lastPage.meta.has_more) {
          return lastPage.meta.next_cursor || "";
        }
        return undefined;
      },
    });
  console.log(data);

  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const electionGroups: ElectionGroupType[] = data
    ? data.pages.flatMap((page: any) =>
        (page.data?.election_groups ?? []).map((eg: any) => ({
          id: eg.id,
          title: eg.name,
          pollingAgentsCoverage: typeof eg.polling_agents_coverage === "number"
            ? eg.polling_agents_coverage
            : (eg.polling_agents_coverage?.percentage ?? 0),
          numberOfElectionsPartyIsContesting:
            eg.number_of_elections_party_is_contesting ?? 0,
          instancesCount: eg.elections_count,
          electionDate: eg.election_date,
        })),
      )
    : [];

  return (
    <Layout>
      <PageHeader
        title="Elections"
        activeTab="groups"
        tabs={getElectionTabs(partyShortName)}
      />
      <PageSearchLayer rightComponent={<FilterButton />} />

      {isLoading && electionGroups.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading election groups...
        </div>
      ) : (
        <ElectionGroupsTable items={electionGroups} />
      )}

      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-6 flex items-center justify-center text-c-50 text-[14px]"
        >
          {isFetchingNextPage
            ? "Loading more election groups..."
            : "Scroll down to load more"}
        </div>
      )}
    </Layout>
  );
}
