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
import { Button } from "@repo/ui/components/button";
import {
  PollingUnitsFilterDialog,
  type PollingUnitsFilters,
} from "#/components/dialogs/PollingUnitsFilterDialog";

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

  // Cascading geographic filters (State -> LGA -> Ward)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<PollingUnitsFilters>({});

  // Count active filters for badge indicator
  const activeFiltersCount = [
    filters.stateId,
    filters.lgaId,
    filters.wardId,
  ].filter(Boolean).length;

  // Infinite query for paginated polling units with debounced search and cascading filters
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } = useInfiniteQuery({
    queryKey: [
      ...QUERY_KEYS.bodies.pollingUnits,
      debouncedSearchQuery,
      filters.stateId,
      filters.lgaId,
      filters.wardId,
    ],
    queryFn: async ({ pageParam }) => {
      const res = await getPollingUnitsPaginated({
        data: {
          limit: 35,
          cursor: pageParam,
          search: debouncedSearchQuery || undefined,
          stateId: filters.stateId,
          localGovernmentId: filters.lgaId,
          wardId: filters.wardId,
        },
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
        placeholder="Search polling units by name or code..."
        rightComponent={
          <>
            <div className="relative">
              <FilterButton onClick={() => setIsFilterOpen(true)} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 size-5 rounded-full bg-[#00cf79] text-white text-[11px] font-bold flex items-center justify-center pointer-events-none shadow-sm">
                  {activeFiltersCount}
                </span>
              )}
            </div>
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
        <div className="w-full p-12 text-center bg-white rounded-2xl border border-[#dfdfdf] space-y-3">
          <p className="text-c-50 text-[15px] font-medium">
            No polling units found matching your search and filter criteria.
          </p>
          {(searchQuery || activeFiltersCount > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setFilters({});
              }}
              className="text-c-70 hover:text-black font-medium"
            >
              Clear filters and search
            </Button>
          )}
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

      {/* Cascading State / LGA / Ward Filter Modal */}
      <PollingUnitsFilterDialog
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApply={setFilters}
      />

      {renderDialogs()}
    </Layout>
  );
}
