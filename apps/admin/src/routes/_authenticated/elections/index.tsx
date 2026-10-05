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

// Define the route for /elections under the _authenticated layout
export const Route = createFileRoute("/_authenticated/elections/")({
  head: () => getPageHeader({ title: "Elections" }),
  component: RouteComponent,
});

function RouteComponent() {
  // State for toggling the "Create New Election Group" modal dialog
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Paginated query to fetch election groups using cursor-based pagination (20 items per page)
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

  // Intersection observer attached to the bottom sentinel element for infinite scrolling
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  // Trigger loading next page when user scrolls down and the sentinel element comes into view
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten the paginated pages of election groups into a single array for table display
  const electionGroups: ElectionGroupType[] = data
    ? data.pages.flatMap((page) => page.data?.election_groups ?? [])
    : [];

  return (
    <Layout>
      {/* Header with page title and sub-navigation tabs (Groups, Instances, Offices) */}
      <PageHeader title="Elections" activeTab="groups" tabs={ELECTION_TABS} />

      {/* Top action toolbar: filter options and "Add" button to open creation dialog */}
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton onClick={() => setIsAddOpen(true)} />
          </>
        }
      />

      {/* Table view: initial loading spinner or populated election groups table */}
      {isLoading && electionGroups.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading election groups...
        </div>
      ) : (
        <ElectionGroupsTable items={electionGroups} />
      )}

      {/* Sentinel element for infinite scroll; displays loading feedback when fetching more */}
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

      {/* Dialog for creating a new election group */}
      <ElectionGroupFormDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </Layout>
  );
}
