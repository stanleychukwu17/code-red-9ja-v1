/**
 * @file Accepted Party Applications Page
 * @description List of accepted polling agent applications with cascaded filters.
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

export const Route = createFileRoute("/_authenticated/$partyShortName/applications/accepted")({
  head: () => getPageHeader({ title: "Accepted Applications" }),
  component: RouteComponent,
});

const PAGE_LIMIT = 50;

/**
 * Accepted Applications Page Component
 * Loads accepted applications via cursor pagination and displays count metrics in header tabs.
 */
function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const { party } = useUserParty();
  const partyId = party?.id;

  const [electionGroupId, setElectionGroupId] = useState<number | undefined>();
  const [stateId, setStateId] = useState<number | undefined>();
  const [lgaId, setLgaId] = useState<number | undefined>();
  const [wardId, setWardId] = useState<number | undefined>();

  // Cursor-paginated accepted applications (primary list)
  const { data: acceptedPages, isLoading: isAcceptedLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: QUERY_KEYS.applications.list("accepted", partyId, electionGroupId, stateId, lgaId, wardId),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      getApplications({
        data: {
          status: "accepted",
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

  const acceptedApps = acceptedPages?.pages.flatMap((p) => p?.data?.applications ?? []) ?? [];

  return (
    <Layout>
      <PageHeader
        title="Applications"
        activeTab="accepted"
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

      {isAcceptedLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-c-50 gap-2">
          <Loader2 className="size-8 animate-spin text-blue-600" />
          <p className="text-sm">Loading applications...</p>
        </div>
      ) : acceptedApps.length === 0 ? (
        <div className="py-20 text-center text-c-50">
          No accepted applications found.
        </div>
      ) : (
        <>
          <ApplicationsTable items={acceptedApps} />
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
