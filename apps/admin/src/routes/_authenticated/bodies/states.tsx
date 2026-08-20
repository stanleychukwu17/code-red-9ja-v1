import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { StatesTable } from "#/components/Tables";
import type { StateType } from "#/components/Tables";
import { BODIES_TABS } from "./-data";
import { useEffect, useState } from "react";
import { getStates } from "#/lib/server/states";
import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";
import { useIntersectionObserver, useDebounceValue } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BodiesDropdown } from "#/components/dropdowns/BodiesDropdown";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/bodies/states")({
  head: () => getPageHeader({ title: "Bodies - States" }),
  component: RouteComponent,
});

function RouteComponent() {
  return <StatesListComponent />;
}

function StatesListComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: ["states", debouncedSearchQuery],
      queryFn: async ({ pageParam }) => {
        const res = await getStates({
          data: { countryId: 161, limit: 20, cursor: pageParam, search: debouncedSearchQuery || undefined },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch states");
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

  // Infinite Scroll Trigger
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten pages to items — preserve full entity data
  const states: StateType[] = data
    ? data.pages.flatMap((page) =>
        (page.data?.states || []).map((state: any) => ({
          id: state.id,
          name: state.name,
          country_id: state.country_id ?? 161,
          country_code: state.country_code ?? "NG",
          latitude: state.latitude ?? 0,
          longitude: state.longitude ?? 0,
          lgas_count: state.lgas_count,
          senatorial_districts_count: state.senatorial_districts_count,
          federal_constituencies_count: state.federal_constituencies_count,
          state_constituencies_count: state.state_constituencies_count,
          wards_count: state.wards_count,
          polling_units_count: state.polling_units_count,
        })),
      )
    : [];

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="states" tabs={BODIES_TABS} />
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

      {isLoading && states.length === 0 ? (
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error ? error.message : "Failed to load states"}
        </div>
      ) : states.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No states found.
        </div>
      ) : (
        <>
          <StatesTable items={states} />
          {hasNextPage && (
            <div
              ref={sentinelRef}
              className="py-6 flex items-center justify-center text-c-50 text-[14px]"
            >
              {isFetchingNextPage ? (
                <Loader2 className="size-5 animate-spin mr-2" />
              ) : null}
              {isFetchingNextPage
                ? "Loading more states..."
                : "Scroll down to load more"}
            </div>
          )}
        </>
      )}

      {renderDialogs()}
    </Layout>
  );
}
