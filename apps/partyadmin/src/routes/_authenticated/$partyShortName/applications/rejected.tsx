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
  "/_authenticated/$partyShortName/applications/rejected",
)({
  head: () => getPageHeader({ title: "Applications" }),
  component: RouteComponent,
});

const PAGE_LIMIT = 50;

function RouteComponent() {
  const { partyShortName } = Route.useParams();

  // Cursor-paginated rejected applications (primary list)
  const {
    data: rejectedPages,
    isLoading: isRejectedLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchRejected,
  } = useInfiniteQuery({
    queryKey: ["applications", partyShortName, "rejected"],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      getApplications({
        data: { status: "rejected", limit: PAGE_LIMIT, cursor: pageParam },
      }),
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.data?.meta;
      return meta?.has_more ? meta.next_cursor : undefined;
    },
  });

  // Count queries for tab badges
  const { data: pendingRes, refetch: refetchPending } = useQuery({
    queryKey: ["applications", partyShortName, "pending", "count"],
    queryFn: () => getApplications({ data: { status: "pending", limit: 1 } }),
  });
  const { data: acceptedRes, refetch: refetchAccepted } = useQuery({
    queryKey: ["applications", partyShortName, "accepted", "count"],
    queryFn: () => getApplications({ data: { status: "accepted", limit: 1 } }),
  });

  const refetchAll = () => {
    refetchPending();
    refetchAccepted();
    refetchRejected();
  };

  const rejectedApps =
    rejectedPages?.pages.flatMap((p) => p?.data?.applications ?? []) ?? [];
  const rejectedCount = rejectedPages?.pages[0]?.data?.meta?.has_more
    ? `${rejectedApps.length}+`
    : rejectedApps.length;

  const pendingCount = pendingRes?.data?.meta?.has_more
    ? "50+"
    : (pendingRes?.data?.applications?.length ?? 0);
  const acceptedCount = acceptedRes?.data?.meta?.has_more
    ? "50+"
    : (acceptedRes?.data?.applications?.length ?? 0);

  return (
    <Layout>
      <PageHeader
        title="Applications"
        activeTab="rejected"
        tabs={getApplicationTabs(partyShortName, {
          pending: Number(pendingCount),
          accepted: Number(acceptedCount),
          rejected: Number(rejectedApps.length),
        })}
        rightComponent={
          <div className="text-[18px] text-[#6f6f6f]">
            <span className="font-semibold text-[#222]">{rejectedCount}</span>{" "}
            slots
          </div>
        }
      />
      <PageSearchLayer
        ariaLabel="Search applications"
        placeholder="Search"
        rightComponent={<ApplicationsActions />}
      />

      {isRejectedLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-c-50 gap-2">
          <Loader2 className="size-8 animate-spin text-blue-600" />
          <p className="text-sm">Loading applications...</p>
        </div>
      ) : rejectedApps.length === 0 ? (
        <div className="py-20 text-center text-c-50">
          No rejected applications found.
        </div>
      ) : (
        <>
          <ApplicationsTable items={rejectedApps} refetch={refetchAll} />
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
