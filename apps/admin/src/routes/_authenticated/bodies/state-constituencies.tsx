import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { StateConstituenciesTable } from "#/components/Tables";
import type { StateConstituencyType } from "#/components/Tables";
import { BODIES_TABS } from "./-data";
import { useEffect } from "react";
import { getStateAssemblyConstituencies } from "#/lib/server/state_assembly_constituencies";
import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";
import { useIntersectionObserver } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";

export const Route = createFileRoute(
  "/_authenticated/bodies/state-constituencies",
)({
  head: () => getPageHeader({ title: "Bodies - State Constituencies" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["state-constituencies"],
    queryFn: async ({ pageParam }) => {
      const res = await getStateAssemblyConstituencies({
        data: { limit: 20, cursor: pageParam },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to fetch state assembly constituencies");
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

  const constituencies: StateConstituencyType[] = data
    ? data.pages.flatMap((page) =>
      (page.data?.constituencies || []).map((c: {
        id: number;
        name: string;
        lga_id: number;
        lga_name: string;
        state_id: number;
        state_name: string;
        senatorial_district_id: number;
        senatorial_district_name: string;
        federal_constituency_id: number;
        federal_constituency_name: string;
      }) => ({
        id: c.id,
        name: c.name,
        lga_id: c.lga_id,
        lga_name: c.lga_name,
        state_id: c.state_id,
        state_name: c.state_name,
        senatorial_district_id: c.senatorial_district_id,
        senatorial_district_name: c.senatorial_district_name,
        federal_constituency_id: c.federal_constituency_id,
        federal_constituency_name: c.federal_constituency_name,
      }))
    )
    : [];

  return (
    <Layout>
      <PageHeader
        title="Bodies"
        activeTab="state-constituencies"
        tabs={BODIES_TABS}
      />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton {...dialogProps} />
          </>
        }
      />

      {isLoading && constituencies.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading state constituencies...
        </div>
      ) : (
        <StateConstituenciesTable items={constituencies} />
      )}

      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-6 flex items-center justify-center text-c-50 text-[14px]"
        >
          {isFetchingNextPage ? "Loading more constituencies..." : "Scroll down to load more"}
        </div>
      )}

      {renderDialogs()}
    </Layout>
  );
}
