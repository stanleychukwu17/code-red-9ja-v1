import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { WardsTable } from "#/components/Tables";
import { BODIES_TABS } from "./-data";
import { useEffect, useState } from "react";
import { getWards } from "#/lib/server/wards";
import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";
import { useIntersectionObserver, useDebounceValue } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BodiesDropdown } from "#/components/dropdowns/BodiesDropdown";
import type { WardType } from "#/components/tiles/ward-tile";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/bodies/wards")({
  head: () => getPageHeader({ title: "Bodies - Wards" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: ["wards", debouncedSearchQuery],
      queryFn: async ({ pageParam }) => {
        const res = await getWards({
          data: { limit: 20, cursor: pageParam, search: debouncedSearchQuery || undefined },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch wards");
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

  const wards: WardType[] = data
    ? data.pages.flatMap((page) =>
        (page.data?.wards || []).map((w: any) => ({
          id: w.id,
          name: w.name,
          code: w.code ?? "",
          lga_id: w.lga_id,
          lga_name: w.lga_name,
          state_id: w.state_id,
          state_name: w.state_name,
          polling_units_count: w.polling_units_count,
        })),
      )
    : [];

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="wards" tabs={BODIES_TABS} />
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

      {isLoading && wards.length === 0 ? (
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error ? error.message : "Failed to load wards"}
        </div>
      ) : wards.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No wards found.
        </div>
      ) : (
        <>
          <WardsTable items={wards} />
          {hasNextPage && (
            <div
              ref={sentinelRef}
              className="py-6 flex items-center justify-center text-c-50 text-[14px]"
            >
              {isFetchingNextPage ? (
                <Loader2 className="size-5 animate-spin mr-2" />
              ) : null}
              {isFetchingNextPage
                ? "Loading more wards..."
                : "Scroll down to load more"}
            </div>
          )}
        </>
      )}

      {renderDialogs()}
    </Layout>
  );
}
