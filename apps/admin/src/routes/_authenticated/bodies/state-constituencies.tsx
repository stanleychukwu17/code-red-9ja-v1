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
import { useEffect, useState } from "react";
import { getStateConstituencies } from "#/lib/server/state_constituencies";
import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";
import { useIntersectionObserver, useDebounceValue } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/bodies/state-constituencies",
)({
  head: () => getPageHeader({ title: "Bodies - State Constituencies" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ["state-constituencies", debouncedSearchQuery],
    queryFn: async ({ pageParam }) => {
      const res = await getStateConstituencies({
        data: {
          limit: 20,
          cursor: pageParam,
          search: debouncedSearchQuery || undefined,
        },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(
        res?.message || "Failed to fetch state assembly constituencies",
      );
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => {
      if (lastPage && lastPage.meta && lastPage.meta.has_more) {
        return lastPage.meta.next_cursor || "";
      }
      return undefined;
    },
    refetchOnWindowFocus: false,
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
        (page.data?.constituencies || []).map(
          (c: {
            id: number;
            name: string;
            code?: string | { String: string; Valid: boolean } | null;
            lga_id: number;
            lga_name: string;
            state_id: number;
            state_name: string;
            senatorial_district_id: number;
            senatorial_district_name: string;
            federal_constituency_id: number;
            federal_constituency_name: string;
            wards_count: number;
            polling_units_count: number;
          }) => ({
            id: c.id,
            name: c.name,
            code:
              typeof c.code === "object" && c.code && "Valid" in c.code
                ? c.code.Valid
                  ? c.code.String
                  : null
                : ((c.code as string | null) ?? null),
            lga_id: c.lga_id,
            lga_name: c.lga_name,
            state_id: c.state_id,
            state_name: c.state_name,
            senatorial_district_id: c.senatorial_district_id,
            senatorial_district_name: c.senatorial_district_name,
            federal_constituency_id: c.federal_constituency_id,
            federal_constituency_name: c.federal_constituency_name,
            wards_count: c.wards_count,
            polling_units_count: c.polling_units_count,
          }),
        ),
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
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        rightComponent={
          <>
            <FilterButton />
            <AddButton {...dialogProps} />
          </>
        }
      />

      {isLoading && constituencies.length === 0 ? (
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error
            ? error.message
            : "Failed to load state constituencies"}
        </div>
      ) : constituencies.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No state constituencies found.
        </div>
      ) : (
        <>
          <StateConstituenciesTable items={constituencies} />
          {hasNextPage && (
            <div
              ref={sentinelRef}
              className="py-6 flex items-center justify-center text-c-50 text-[14px]"
            >
              {isFetchingNextPage ? (
                <Loader2 className="size-5 animate-spin mr-2" />
              ) : null}
              {isFetchingNextPage
                ? "Loading more constituencies..."
                : "Scroll down to load more"}
            </div>
          )}
        </>
      )}

      {renderDialogs()}
    </Layout>
  );
}
