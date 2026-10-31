/**
 * @file Rejected Party Applications Page
 * @description List of rejected polling agent applications with cascaded filters.
 */

import { useState } from "react";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { ApplicationsTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getApplicationTabs } from "./-data";
import { ApplicationsFilterBar } from "#/components/applications/ApplicationsFilterBar";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getApplications } from "#/lib/server/applications";
import { useUserParty } from "#/hooks/useUserParty";
import { QUERY_KEYS } from "#/lib/config";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/$partyShortName/applications/rejected")({
  head: () => getPageHeader({ title: "Rejected Applications" }),
  component: RouteComponent,
});

const PAGE_LIMIT = 50;

/**
 * Rejected Applications Page Component
 * Loads rejected applications via cursor-based infinite pagination and tracks count metrics.
 */
function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const { party } = useUserParty();
  const partyId = party?.id;

  const [electionGroupId, setElectionGroupId] = useState<number | undefined>();
  const [stateId, setStateId] = useState<number | undefined>();
  const [lgaId, setLgaId] = useState<number | undefined>();
  const [wardId, setWardId] = useState<number | undefined>();

  // Cursor-paginated rejected applications (primary list)
  const { data: rejectedPages, isLoading: isRejectedLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: QUERY_KEYS.applications.list("rejected", partyId, electionGroupId, stateId, lgaId, wardId),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      getApplications({
        data: {
          status: "rejected",
          limit: PAGE_LIMIT,
          cursor: pageParam,
          partyId,
          electionGroupId,
          stateId,
          lgaId,
          wardId,
        },
      }),
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.data?.meta;
      return meta?.has_more ? meta.next_cursor : undefined;
    },
    staleTime: Infinity,
  });

  const rejectedApps =
    rejectedPages?.pages.flatMap((p) => p?.data?.applications ?? []) ?? [];

  return (
    <Layout>
      <PageHeader
        title="Applications"
        activeTab="rejected"
        tabs={getApplicationTabs(partyShortName)}
      />
      <ApplicationsFilterBar
        electionGroupId={electionGroupId}
        onElectionGroupChange={setElectionGroupId}
        stateId={stateId}
        onStateChange={setStateId}
        lgaId={lgaId}
        onLgaChange={setLgaId}
        wardId={wardId}
        onWardChange={setWardId}
        showAcceptAll={false}
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
          <ApplicationsTable items={rejectedApps} />
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
