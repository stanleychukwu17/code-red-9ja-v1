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
import type { WardType } from "#/components/Tables";
import { BODIES_TABS } from "./-data";
import { useEffect } from "react";
import { getWards } from "#/lib/server/wards";
import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";
import { useIntersectionObserver } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/bodies/wards")({
  head: () => getPageHeader({ title: "Bodies - Wards" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["wards"],
      queryFn: async ({ pageParam }) => {
        const res = await getWards({
          data: { limit: 20, cursor: pageParam },
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
      (page.data?.wards || []).map(
        (w: {
          id: number;
          name: string;
          abbreviation?: string;
          lga_id: number;
          lga_name: string;
          state_id: number;
          state_name: string;
        }) => ({
          id: w.id,
          name: w.name,
          abbreviation: w.abbreviation ?? "",
          lga_id: w.lga_id,
          lga_name: w.lga_name,
          state_id: w.state_id,
          state_name: w.state_name,
        }),
      ),
    )
    : [];

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="wards" tabs={BODIES_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton {...dialogProps} />
          </>
        }
      />

      {isLoading && wards.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading wards...
        </div>
      ) : (
        <WardsTable items={wards} />
      )}

      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-6 flex items-center justify-center text-c-50 text-[14px]"
        >
          {isFetchingNextPage
            ? "Loading more wards..."
            : "Scroll down to load more"}
        </div>
      )}

      {renderDialogs()}
    </Layout>
  );
}
