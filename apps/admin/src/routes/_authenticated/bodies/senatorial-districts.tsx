import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { DistrictsTable } from "#/components/Tables";
import { BODIES_TABS } from "./-data";
import { useEffect } from "react";
import { getSenatorialDistricts } from "#/lib/server/senatorial_districts";
import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";
import { useIntersectionObserver } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BodiesDropdown } from "#/components/dropdowns/BodiesDropdown";
import type { DistrictType } from "#/components/tiles/district-tile";

export const Route = createFileRoute(
  "/_authenticated/bodies/senatorial-districts",
)({
  head: () => getPageHeader({ title: "Bodies - Senatorial Districts" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["senatorial-districts"],
      queryFn: async ({ pageParam }) => {
        const res = await getSenatorialDistricts({
          data: { limit: 20, cursor: pageParam },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch senatorial districts");
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

  const districts: DistrictType[] = data
    ? data.pages.flatMap((page) =>
        (page.data?.districts || []).map((district: any) => ({
          id: district.id,
          name: district.name,
          description: district.description ?? "",
          coalition_center: district.coalition_center ?? "",
          state_id: district.state_id,
          state_name: district.state_name,
          federal_constituencies_count: district.federal_constituencies_count,
          lgas_count: district.lgas_count,
          state_constituencies_count: district.state_constituencies_count,
          wards_count: district.wards_count,
          polling_units_count: district.polling_units_count,
        })),
      )
    : [];

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="districts" tabs={BODIES_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <BodiesDropdown />
            <AddButton {...dialogProps} />
          </>
        }
      />

      {isLoading && districts.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading districts...
        </div>
      ) : (
        <DistrictsTable items={districts} />
      )}

      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-6 flex items-center justify-center text-c-50 text-[14px]"
        >
          {isFetchingNextPage
            ? "Loading more districts..."
            : "Scroll down to load more"}
        </div>
      )}
      {renderDialogs()}
    </Layout>
  );
}
