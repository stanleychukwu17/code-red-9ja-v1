import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { LgasTable } from "#/components/Tables";
import { BODIES_TABS } from "./-data";
import { useEffect, useState } from "react";
import { getLGAs } from "#/lib/server/lgas";
import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";
import { useIntersectionObserver, useDebounceValue } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BodiesDropdown } from "#/components/dropdowns/BodiesDropdown";
import type { LgaType } from "#/components/tiles/lga-tile";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/bodies/lgas")({
  head: () => getPageHeader({ title: "Bodies - LGAs" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: ["lgas", debouncedSearchQuery],
      queryFn: async ({ pageParam }) => {
        const res = await getLGAs({
          data: { limit: 20, cursor: pageParam, search: debouncedSearchQuery || undefined },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch LGAs");
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

  const lgas: LgaType[] = data
    ? data.pages.flatMap((page) =>
        (page.data?.lgas || []).map((lga: any) => ({
          id: lga.id,
          name: lga.name,
          code: lga.code ?? "",
          state_id: lga.state_id,
          state_name: lga.state_name,
          senatorial_district_id: lga.senatorial_district_id,
          senatorial_district_name: lga.senatorial_district_name,
          federal_constituency_id: lga.federal_constituency_id,
          federal_constituency_name: lga.federal_constituency_name,
          state_constituencies_count: lga.state_constituencies_count,
          wards_count: lga.wards_count,
          polling_units_count: lga.polling_units_count,
        })),
      )
    : [];

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="lgas" tabs={BODIES_TABS} />
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

      {isLoading && lgas.length === 0 ? (
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error ? error.message : "Failed to load LGAs"}
        </div>
      ) : lgas.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No LGAs found.
        </div>
      ) : (
        <>
          <LgasTable items={lgas} />
          {hasNextPage && (
            <div
              ref={sentinelRef}
              className="py-6 flex items-center justify-center text-c-50 text-[14px]"
            >
              {isFetchingNextPage ? (
                <Loader2 className="size-5 animate-spin mr-2" />
              ) : null}
              {isFetchingNextPage
                ? "Loading more lgas..."
                : "Scroll down to load more"}
            </div>
          )}
        </>
      )}
      {renderDialogs()}
    </Layout>
  );
}
