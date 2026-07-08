import {
  Layout,
  PageHeader,
  PageSearchLayer,
} from "@repo/ui/components/custom/AdminLayouts";
import { ApplicationsTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getApplicationTabs } from "./-data";
import { ApplicationsActions } from "#/components/applications/ApplicationsActions";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getApplications } from "#/lib/server/applications";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/applications/",
)({
  head: () => getPageHeader({ title: "Applications" }),
  component: RouteComponent,
});

const PAGE_LIMIT = 50;

function RouteComponent() {
  const { partyShortName } = Route.useParams();

  // Cursor-paginated pending applications (primary list)
  const {
    data: pendingPages,
    isLoading: isPendingLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchPending,
  } = useInfiniteQuery({
    queryKey: ["applications", partyShortName, "pending"],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      getApplications({
        data: { status: "pending", limit: PAGE_LIMIT, cursor: pageParam },
      }),
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.data?.meta;
      return meta?.has_more ? meta.next_cursor : undefined;
    },
  });

  // Simple count queries for tab badges (first page only)
  const { data: acceptedRes, refetch: refetchAccepted } = useQuery({
    queryKey: ["applications", partyShortName, "accepted", "count"],
    queryFn: () => getApplications({ data: { status: "accepted", limit: 1 } }),
  });
  const { data: rejectedRes, refetch: refetchRejected } = useQuery({
    queryKey: ["applications", partyShortName, "rejected", "count"],
    queryFn: () => getApplications({ data: { status: "rejected", limit: 1 } }),
  });

  const refetchAll = () => {
    refetchPending();
    refetchAccepted();
    refetchRejected();
  };

  const pendingApps =
    pendingPages?.pages.flatMap((p) => p?.data?.applications ?? []) ?? [];
  const pendingCount = pendingPages?.pages[0]?.data?.meta?.has_more
    ? `${pendingApps.length}+`
    : pendingApps.length;

  // Tab badge counts (approximate from first cursor page)
  const acceptedCount = acceptedRes?.data?.meta?.has_more
    ? "50+"
    : (acceptedRes?.data?.applications?.length ?? 0);
  const rejectedCount = rejectedRes?.data?.meta?.has_more
    ? "50+"
    : (rejectedRes?.data?.applications?.length ?? 0);

  return (
    <Layout>
      <PageHeader
        title="Applications"
        activeTab="pending"
        tabs={getApplicationTabs(partyShortName, {
          pending: Number(pendingApps.length),
          accepted: Number(acceptedCount),
          rejected: Number(rejectedCount),
        })}
        rightComponent={
          <div className="text-[18px] text-[#6f6f6f]">
            <span className="font-semibold text-[#222]">{pendingCount}</span>{" "}
            slots
          </div>
        }
      />
      <PageSearchLayer
        ariaLabel="Search applications"
        placeholder="Search"
        rightComponent={<ApplicationsActions />}
      />

      {isPendingLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-c-50 gap-2">
          <Loader2 className="size-8 animate-spin text-blue-600" />
          <p className="text-sm">Loading applications...</p>
        </div>
      ) : pendingApps.length === 0 ? (
        <div className="py-20 text-center text-c-50">
          No pending applications found.
        </div>
      ) : (
        <>
          <ApplicationsTable items={pendingApps} refetch={refetchAll} />
          {hasNextPage && (
            <div className="flex justify-center py-6">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-c-70 hover:bg-hover-2 transition disabled:opacity-50 disabled:pointer-events-none"
              >
                {isFetchingNextPage && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
