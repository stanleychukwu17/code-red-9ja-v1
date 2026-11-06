/**
 * @file Pending Party Applications Page
 * @description Primary queue for party administrators to review, approve, or reject incoming agent applications.
 * Uses cursor-based infinite queries for the pending list and secondary count queries for tab badges.
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
import { Filter, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/$partyShortName/applications/")({
  head: () => getPageHeader({ title: "Applications" }),
  component: RouteComponent,
});

const PAGE_LIMIT = 50;

/**
 * Pending Applications Page Component
 * Renders the pending applications queue with cascaded filters (Election Group, State, LGA, Ward).
 */
function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const { party } = useUserParty();
  const partyId = party?.id;

  // Filter state for cascaded geographic and election group queries
  const [electionGroupId, setElectionGroupId] = useState<number | undefined>();
  const [stateId, setStateId] = useState<number | undefined>();
  const [lgaId, setLgaId] = useState<number | undefined>();
  const [wardId, setWardId] = useState<number | undefined>();
  const [pollingUnitId, setPollingUnitId] = useState<number | undefined>();

  // Cursor-paginated pending applications (primary list)
  const { data: pendingPages, isLoading: isPendingLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: QUERY_KEYS.applications.list("pending", partyId, electionGroupId, stateId, lgaId, wardId, pollingUnitId),
    initialPageParam: undefined as number | undefined,
    enabled: Boolean(partyId && electionGroupId && stateId),
    queryFn: ({ pageParam }) => getApplications({
      data: {
        status: "pending",
        limit: PAGE_LIMIT,
        cursor: pageParam,
        partyId,
        electionGroupId,
        stateId,
        lgaId,
        wardId,
        pollingUnitId,
      },
    }),
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.data?.meta;
      return meta?.has_more ? meta.next_cursor : undefined;
    },
    staleTime: Infinity,
  });

  const pendingApps = pendingPages?.pages.flatMap((p) => p?.data?.applications ?? []) ?? [];

  return (
    <Layout>
      <PageHeader
        title="Applications"
        activeTab="pending"
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
        pollingUnitId={pollingUnitId}
        onPollingUnitChange={setPollingUnitId}
        onAcceptAll={() => {
          // Handled by batch approval workflow
        }}
        showAcceptAll={true}
      />

      {!electionGroupId || !stateId ? (
        <div className="py-20 flex flex-col items-center justify-center text-center px-4">
          <div className="size-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-3">
            <Filter className="size-6" />
          </div>
          <h3 className="text-base font-semibold text-c-80">
            Select an Election Group and State
          </h3>
          <p className="text-sm text-c-50 max-w-sm mt-1">
            Please choose an election group and state above to view applications.
          </p>
        </div>
      ) : isPendingLoading ? (
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
          <ApplicationsTable items={pendingApps} />
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
