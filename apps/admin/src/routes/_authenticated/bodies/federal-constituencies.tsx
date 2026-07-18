import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { FederalConstituenciesTable } from "#/components/Tables";
import { BODIES_TABS } from "./-data";
import { useEffect } from "react";
import { getFederalConstituencies } from "#/lib/server/federal_constituencies";
import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";
import { useIntersectionObserver } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BodiesDropdown } from "#/components/dropdowns/BodiesDropdown";
import type { FederalConstituencyType } from "#/components/tiles/federal-constituency-tile";

export const Route = createFileRoute(
  "/_authenticated/bodies/federal-constituencies",
)({
  head: () => getPageHeader({ title: "Bodies - Federal Constituencies" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["federal_constituencies"],
      queryFn: async ({ pageParam }) => {
        const res = await getFederalConstituencies({
          data: { limit: 20, cursor: pageParam },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(
          res?.message || "Failed to fetch federal constituencies",
        );
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

  const constituencies: FederalConstituencyType[] = data
    ? data.pages.flatMap((page) =>
        (page.data?.constituencies || []).map((constituency: any) => ({
          id: constituency.id,
          name: constituency.name,
          state_id: constituency.state_id,
          state_name: constituency.state_name,
          senatorial_district_id: constituency.senatorial_district_id,
          senatorial_district_name: constituency.senatorial_district_name,
          lgas_count: constituency.lgas_count,
          state_constituencies_count: constituency.state_constituencies_count,
          wards_count: constituency.wards_count,
          polling_units_count: constituency.polling_units_count,
        })),
      )
    : [];

  return (
    <Layout>
      <PageHeader
        title="Bodies"
        activeTab="federal-constituencies"
        tabs={BODIES_TABS}
      />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <BodiesDropdown />
            <AddButton {...dialogProps} />
          </>
        }
      />

      {isLoading && constituencies.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading federal constituencies...
        </div>
      ) : (
        <FederalConstituenciesTable items={constituencies} />
      )}

      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-6 flex items-center justify-center text-c-50 text-[14px]"
        >
          {isFetchingNextPage
            ? "Loading more federal constituencies..."
            : "Scroll down to load more"}
        </div>
      )}
      {renderDialogs()}
    </Layout>
  );
}
