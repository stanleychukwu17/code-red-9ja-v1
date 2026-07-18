import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState, useEffect } from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import {
  ElectionGroupsTable,
  type ElectionGroupType,
} from "#/components/Tables";
import { ELECTION_TABS } from "./-data";
import { ElectionGroupFormDialog } from "#/components/dialogs/ElectionGroupFormDialog";
import { getElectionGroups } from "#/lib/server/election_groups";
import { useIntersectionObserver } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { DateBullet } from "@repo/ui/components/bullets/date-bullet";

export const Route = createFileRoute("/_authenticated/elections/")({
  head: () => getPageHeader({ title: "Elections" }),
  component: RouteComponent,
});

function RouteComponent() {
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["election-groups"],
      queryFn: async ({ pageParam }) => {
        const res = await getElectionGroups({
          data: { limit: 20, cursor: pageParam as string, orderBy: "rank", order: "ASC" },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch election groups");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage) => {
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

  const electionGroups: ElectionGroupType[] = data
    ? data.pages.flatMap((page) => page.data?.election_groups ?? [])
    : [];

  return (
    <Layout>
      <PageHeader title="Elections" activeTab="groups" tabs={ELECTION_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton onClick={() => setIsAddOpen(true)} />
          </>
        }
      />

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

      <ElectionGroupFormDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </Layout>
  );
}
