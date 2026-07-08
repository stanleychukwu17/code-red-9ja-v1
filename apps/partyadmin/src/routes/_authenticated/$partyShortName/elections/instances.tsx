import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useEffect } from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { ElectionInstancesTable } from "#/components/Tables";
import { getElectionTabs } from "./-data";
import { getElections } from "#/lib/server/elections";
import { useIntersectionObserver } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { ElectionInstanceType } from "#/components/tiles/election-instance-tile";

export const Route = createFileRoute("/_authenticated/$partyShortName/elections/instances")({
  head: () => getPageHeader({ title: "Election Instances" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { partyShortName } = Route.useParams();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["elections", partyShortName],
      queryFn: async ({ pageParam }) => {
        const res = await getElections({
          data: { limit: 20, cursor: pageParam as string, partyShortName },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch elections");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage: any) => {
        if (lastPage && lastPage.meta && lastPage.meta.has_more) {
          return lastPage.meta.next_cursor || "";
        }
        return undefined;
      },
    });

  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const elections: ElectionInstanceType[] = data
    ? data.pages.flatMap((page: any) =>
      (page.data?.elections ?? []).map((el: any) => ({
        id: el.id,
        rank: el.rank,
        title: el.name,
        candidate: el.candidate,
        electionDate: el.election_date,
      }))
    )
    : [];

  return (
    <Layout>
      <PageHeader
        title="Elections"
        activeTab="instances"
        tabs={getElectionTabs(partyShortName)}
      />
      <PageSearchLayer rightComponent={<FilterButton />} />

      {isLoading && elections.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading elections...
        </div>
      ) : (
        <ElectionInstancesTable items={elections} />
      )}

      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-6 flex items-center justify-center text-c-50 text-[14px]"
        >
          {isFetchingNextPage
            ? "Loading more elections..."
            : "Scroll down to load more"}
        </div>
      )}
    </Layout>
  );
}
