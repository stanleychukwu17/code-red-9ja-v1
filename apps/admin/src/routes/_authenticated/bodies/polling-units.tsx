import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { PollingUnitsTable } from "#/components/Tables";
import type { PollingUnitType } from "#/components/Tables";
import { BODIES_TABS } from "./-data";
import { useEffect } from "react";
import { getPollingUnits } from "#/lib/server/polling_units";
import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";
import { useIntersectionObserver } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BodiesDropdown } from "#/components/dropdowns/BodiesDropdown";

export const Route = createFileRoute("/_authenticated/bodies/polling-units")({
  head: () => getPageHeader({ title: "Bodies - Polling Units" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["polling-units"],
      queryFn: async ({ pageParam }) => {
        const res = await getPollingUnits({
          data: { limit: 20, cursor: pageParam },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch polling units");
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

  const units: PollingUnitType[] = data
    ? data.pages.flatMap((page) =>
      (page.data?.polling_units || []).map(
        (pu: {
          id: number;
          name: string;
          abbreviation?: string | null;
          units?: string | null;
          delimitation?: string | { String: string; Valid: boolean } | null;
          remark?: string | null;
          registration_area_id?: number | null;
          ward_id: number;
          ward_name: string;
          lga_id: number;
          lga_name: string;
          state_id: number;
          state_name: string;
          latitude?: number | null;
          longitude?: number | null;
          precise_location?: string | null;
          formatted_address?: string | null;
          google_place_id?: string | null;
        }) => ({
          id: pu.id,
          name: pu.name,
          abbreviation: pu.abbreviation ?? null,
          units: typeof pu.units === "string" ? pu.units : null,
          delimitation: typeof pu.delimitation === "object" && pu.delimitation && "Valid" in pu.delimitation
            ? (pu.delimitation.Valid ? pu.delimitation.String : null)
            : (pu.delimitation as string | null ?? null),
          remark: pu.remark ?? null,
          registration_area_id: pu.registration_area_id ?? null,
          ward_id: pu.ward_id,
          ward_name: pu.ward_name,
          lga_id: pu.lga_id,
          lga_name: pu.lga_name,
          state_id: pu.state_id,
          state_name: pu.state_name,
          latitude: pu.latitude ?? null,
          longitude: pu.longitude ?? null,
          precise_location: pu.precise_location ?? null,
          formatted_address: pu.formatted_address ?? null,
          google_place_id: pu.google_place_id ?? null,
        }),
      ),
    )
    : [];

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="polling-units" tabs={BODIES_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <BodiesDropdown />
            <AddButton {...dialogProps} />
          </>
        }
      />

      {isLoading && units.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading polling units...
        </div>
      ) : (
        <PollingUnitsTable items={units} />
      )}

      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-6 flex items-center justify-center text-c-50 text-[14px]"
        >
          {isFetchingNextPage
            ? "Loading more polling units..."
            : "Scroll down to load more"}
        </div>
      )}

      {renderDialogs()}
    </Layout>
  );
}
