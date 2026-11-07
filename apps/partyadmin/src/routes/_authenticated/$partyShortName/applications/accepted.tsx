/**
 * @file Accepted Party Applications Page
 * @description List of accepted polling agent applications with cascaded filters.
 */

import { useEffect } from "react";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { ApplicationsTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getApplicationTabs, validateApplicationsSearch } from "./-data";
import { ApplicationsFilterBar, type ApplicationsFilterValues } from "#/components/applications/ApplicationsFilterBar";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getApplications } from "#/lib/server/applications";
import { useUserParty } from "#/hooks/useUserParty";
import { QUERY_KEYS } from "#/lib/config";
import { useIntersectionObserver } from "usehooks-ts";
import { Filter, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/$partyShortName/applications/accepted")({
  validateSearch: validateApplicationsSearch,
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
  const { election_group_id: electionGroupId, state_id: stateId, lga_id: lgaId, ward_id: wardId, polling_unit_id: pollingUnitId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { party } = useUserParty();
  const partyId = party?.id;

  // Synchronize selected filter changes into URL search parameters
  const handleFiltersChange = (filters: ApplicationsFilterValues) => {
    navigate({
      search: (prev: any) => {
        const next = {
          ...prev,
          election_group_id: filters.electionGroupId,
          state_id: filters.stateId,
          lga_id: filters.lgaId,
          ward_id: filters.wardId,
          polling_unit_id: filters.pollingUnitId,
        };
        // Strip undefined or empty keys to keep the URL clean
        Object.keys(next).forEach((k) => {
          if (next[k] === undefined || next[k] === null || next[k] === "") {
            delete next[k];
          }
        });
        return next;
      },
      replace: true,
    });
  };

  // Cursor-paginated accepted applications (primary list)
  const { data: acceptedPages, isLoading: isAcceptedLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: QUERY_KEYS.applications.list("accepted", partyId, electionGroupId, stateId, lgaId, wardId, pollingUnitId),
    initialPageParam: undefined as number | undefined,
    // Only query once required election group and state filters are selected
    enabled: Boolean(partyId && electionGroupId && stateId),
    queryFn: ({ pageParam }) => getApplications({
      data: {
        status: "accepted",
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
    // Resolve next cursor from either root or nested meta payload
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.meta ?? lastPage?.data?.meta;
      return meta?.has_more ? meta.next_cursor : undefined;
    },
    staleTime: Infinity,
  });

  // Observe bottom sentinel element to detect when user reaches the end of the list
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  // Automatically fetch the next batch when sentinel becomes visible
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten paginated page slices into a single continuous items array
  const acceptedApps = acceptedPages?.pages.flatMap((p) => p?.data?.applications ?? []) ?? [];

  return (
    <Layout>
      <PageHeader
        title="Applications"
        activeTab="accepted"
        tabs={getApplicationTabs(partyShortName, {
          election_group_id: electionGroupId,
          state_id: stateId,
          lga_id: lgaId,
          ward_id: wardId,
          polling_unit_id: pollingUnitId,
        })}
      />
      <ApplicationsFilterBar
        electionGroupId={electionGroupId}
        stateId={stateId}
        lgaId={lgaId}
        wardId={wardId}
        pollingUnitId={pollingUnitId}
        onFiltersChange={handleFiltersChange}
        showAcceptAll={false}
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
      ) : isAcceptedLoading ? (
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
            <div
              ref={sentinelRef}
              className="flex items-center justify-center py-6 text-sm text-c-50 min-h-10"
            >
              {isFetchingNextPage && (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-5 animate-spin text-blue-600" />
                  <span>Loading more applications...</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
