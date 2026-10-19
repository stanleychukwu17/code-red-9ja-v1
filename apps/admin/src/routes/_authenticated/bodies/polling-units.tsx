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
import { useEffect, useState } from "react";
import { getPollingUnitsPaginated } from "#/lib/server/polling_units";
import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";
import { useIntersectionObserver, useDebounceValue } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BodiesDropdown } from "#/components/dropdowns/BodiesDropdown";
import { Loader2 } from "lucide-react";
import { QUERY_KEYS } from "#/lib/config";

// Raw response payload item returned by the polling units API (supports sqlc NullString envelopes)
type RawPollingUnitApiItem = {
  id: number;
  name: string;
  code?: string | { String: string; Valid: boolean } | null; // Code or sqlc NullString
  pu_code?: string | { String: string; Valid: boolean } | null; // PU Code or sqlc NullString
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
};

// Normalizes raw API polling unit payload into the UI table model
function mapApiPollingUnit(pu: RawPollingUnitApiItem): PollingUnitType {
  // Unwraps sql.NullString objects or raw strings into standard string | null
  const resolveCode = (val?: string | { String: string; Valid: boolean } | null) =>
    typeof val === "object" && val && "Valid" in val
      ? (val.Valid ? val.String : null)
      : ((val as string | null) ?? null);

  return {
    id: pu.id,
    name: pu.name,
    code: resolveCode(pu.code),
    pu_code: resolveCode(pu.pu_code),
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
  };
}

export const Route = createFileRoute("/_authenticated/bodies/polling-units")({
  head: () => getPageHeader({ title: "Bodies - Polling Units" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500);

  // Infinite query for paginated polling units with debounced search
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } = useInfiniteQuery({
    queryKey: [...QUERY_KEYS.bodies.pollingUnits, debouncedSearchQuery],
    queryFn: async ({ pageParam }) => {
      const res = await getPollingUnitsPaginated({
        data: { limit: 35, cursor: pageParam, search: debouncedSearchQuery || undefined },
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
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Intersection observer sentinel for infinite scroll trigger
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  // Trigger next page fetch when sentinel enters viewport
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const units: PollingUnitType[] = data
    ? data.pages.flatMap((page) =>
      (page.data?.polling_units || []).map(mapApiPollingUnit),
    )
    : [];

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="polling-units" tabs={BODIES_TABS} />
      <PageSearchLayer
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        rightComponent={
          <>
            <FilterButton />
            <BodiesDropdown />
            <AddButton {...dialogProps} />
          </>
        }
      />

      {isLoading && units.length === 0 ? (
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error ? error.message : "Failed to load polling units"}
        </div>
      ) : units.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No polling units found.
        </div>
      ) : (
        <>
          <PollingUnitsTable items={units} />
          {hasNextPage && (
            <div
              ref={sentinelRef}
              className="py-6 flex items-center justify-center text-c-50 text-[14px]"
            >
              {isFetchingNextPage ? (
                <Loader2 className="size-5 animate-spin mr-2" />
              ) : null}
              {isFetchingNextPage
                ? "Loading more polling units..."
                : "Scroll down to load more"}
            </div>
          )}
        </>
      )}

      {renderDialogs()}
    </Layout>
  );
}
