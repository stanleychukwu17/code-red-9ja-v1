import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useEffect } from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
} from "@repo/ui/components/custom/AdminLayouts";
import {
  INECResultGrabberLogsTable,
  type INECResultGrabberLogType,
} from "#/components/Tables";
import { INEC_RESULT_GRABBER_TABS } from "./-data";
import { getINECResultGrabberLogs } from "#/lib/server/inec_grabber";
import { useIntersectionObserver } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";

export const Route = createFileRoute(
  "/_authenticated/inec-result-grabber/logs",
)({
  head: () => getPageHeader({ title: "INEC Results Logs" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["inec-result-grabber-logs"],
      queryFn: async ({ pageParam }) => {
        const res = await getINECResultGrabberLogs({
          data: { limit: 20, cursor: pageParam as string },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch INEC result grabber logs");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.meta && lastPage.meta.has_more) {
          return lastPage.meta.next_cursor || undefined;
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

  const logs: INECResultGrabberLogType[] = data
    ? data.pages.flatMap((page) => page.data?.logs ?? [])
    : [];

  return (
    <Layout>
      <PageHeader
        title="INEC Results"
        activeTab="logs"
        tabs={INEC_RESULT_GRABBER_TABS}
      />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
          </>
        }
      />

      {isLoading && logs.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading INEC result grabber logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          No INEC result grabber logs found.
        </div>
      ) : (
        <INECResultGrabberLogsTable items={logs} />
      )}

      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-6 flex items-center justify-center text-c-50 text-[14px]"
        >
          {isFetchingNextPage
            ? "Loading more logs..."
            : "Scroll down to load more"}
        </div>
      )}
    </Layout>
  );
}
