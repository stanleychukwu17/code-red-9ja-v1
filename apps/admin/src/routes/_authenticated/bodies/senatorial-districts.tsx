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
import { BODIES_TABS } from "./data";
import { useEffect } from "react";
import { getSenatorialDistricts } from "#/lib/server/senatorial_districts";
import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";
import { useIntersectionObserver } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";

export const Route = createFileRoute(
  "/_authenticated/bodies/senatorial-districts",
)({
  head: () => getPageHeader({ title: "Bodies - Senatorial Districts" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
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

  const districts = data
    ? data.pages.flatMap((page) =>
        (page.data?.districts || []).map((district: { id: number; name: string; state_id: number; state_name: string }) => ({
          title: district.name,
          meta: [String(district.state_id), district.state_name],
        }))
      )
    : [];

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="districts" tabs={BODIES_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
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
          {isFetchingNextPage ? "Loading more districts..." : "Scroll down to load more"}
        </div>
      )}

      {renderDialogs()}
    </Layout>
  );
}

