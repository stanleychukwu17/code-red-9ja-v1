/**
 * @file Election Instances Page
 * @description Renders individual contested election race instances (e.g. specific Senatorial,
 * Gubernatorial, or Presidential ballots) with registered party candidates and election dates.
 * Features cursor-based pagination, multi-criteria filtering, and search.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useEffect, useState, useMemo } from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { Button } from "@repo/ui/components/button";
import { ElectionInstancesTable } from "#/components/Tables";
import { getElectionTabs } from "./-data";
import { getElections, type ElectionFilters } from "#/lib/server/elections";
import { ElectionInstancesFilterDialog } from "#/components/dialogs/ElectionInstancesFilterDialog";
import { useIntersectionObserver, useDebounceValue } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { ElectionInstanceType } from "#/components/tiles/election-instance-tile";

export type InstancesSearch = {
  election_group_id?: number;
};

export const Route = createFileRoute("/_authenticated/$partyShortName/elections/instances")({
  validateSearch: (search: Record<string, unknown>): InstancesSearch => {
    const raw = search.election_group_id;
    const num =
      raw !== undefined && raw !== null && raw !== "" ? Number(raw) : undefined;
    return {
      election_group_id: num && !isNaN(num) ? num : undefined,
    };
  },
  head: () => getPageHeader({ title: "Election Instances" }),
  component: RouteComponent,
});

/**
 * Election Instances Component
 * Fetches and displays individual race ballots, supporting search, filters,
 * infinite scroll pagination, and mapping to ElectionInstancesTable.
 */
function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const { election_group_id } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 400);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [filters, setFilters] = useState<ElectionFilters>({
    election_group_ids: election_group_id ? [election_group_id] : [],
    scopes: [],
    statuses: [],
    state_ids: [],
    office_ids: [],
    date_from: undefined,
    date_to: undefined,
  });

  // Synchronize URL search params with active election group filter if changed externally
  useEffect(() => {
    if (election_group_id) {
      setFilters((prev) => {
        if (
          prev.election_group_ids.length === 1 &&
          prev.election_group_ids[0] === election_group_id
        ) {
          return prev;
        }
        return {
          ...prev,
          election_group_ids: [election_group_id],
        };
      });
    }
  }, [election_group_id]);

  // Calculate total number of applied filters for badge indicator
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.election_group_ids.length > 0)
      count += filters.election_group_ids.length;
    if (filters.scopes.length > 0) count += filters.scopes.length;
    if (filters.statuses.length > 0) count += filters.statuses.length;
    if (filters.state_ids.length > 0) count += filters.state_ids.length;
    if (filters.office_ids.length > 0) count += filters.office_ids.length;
    if (filters.date_from) count += 1;
    if (filters.date_to) count += 1;
    return count;
  }, [filters]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: [
        "elections",
        partyShortName,
        debouncedSearchQuery,
        filters,
      ],
      queryFn: async ({ pageParam }) => {
        const res = await getElections({
          data: {
            limit: 20,
            cursor: pageParam as string,
            partyShortName,
            search: debouncedSearchQuery || undefined,
            election_group_ids:
              filters.election_group_ids.length > 0
                ? filters.election_group_ids
                : undefined,
            scopes: filters.scopes.length > 0 ? filters.scopes : undefined,
            statuses:
              filters.statuses.length > 0 ? filters.statuses : undefined,
            state_ids:
              filters.state_ids.length > 0 ? filters.state_ids : undefined,
            office_ids:
              filters.office_ids.length > 0 ? filters.office_ids : undefined,
            date_from: filters.date_from || undefined,
            date_to: filters.date_to || undefined,
          },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch elections");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage: any) => {
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

  const elections: ElectionInstanceType[] = data
    ? data.pages.flatMap((page: any) =>
      (page.data?.elections ?? []).map((el: any) => ({
        id: el.id,
        rank: el.rank,
        title: el.name,
        candidate: el.candidate,
        electionDate: el.election_date,
      })),
    )
    : [];

  return (
    <Layout>
      <PageHeader
        title="Elections"
        activeTab="instances"
        tabs={getElectionTabs(partyShortName)}
      />
      <PageSearchLayer
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search elections..."
        rightComponent={
          <div className="relative">
            <FilterButton onClick={() => setIsFilterOpen(true)} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 rounded-full bg-[#00cf79] text-white text-[11px] font-bold flex items-center justify-center pointer-events-none shadow-sm">
                {activeFiltersCount}
              </span>
            )}
          </div>
        }
      />

      {isLoading && elections.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading elections...
        </div>
      ) : elections.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-[#dfdfdf] space-y-3">
          <p className="text-c-50 text-[15px]">
            No election instances found matching your search and filter criteria.
          </p>
          {(searchQuery || activeFiltersCount > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setFilters({
                  election_group_ids: [],
                  scopes: [],
                  statuses: [],
                  state_ids: [],
                  office_ids: [],
                  date_from: undefined,
                  date_to: undefined,
                });
                if (election_group_id) {
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      election_group_id: undefined,
                    }),
                    replace: true,
                  });
                }
              }}
            >
              Clear filters and search
            </Button>
          )}
        </div>
      ) : (
        <ElectionInstancesTable items={elections} />
      )}

      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-6 flex items-center justify-center text-c-50 text-[14px]"
        >
          {isFetchingNextPage
            ? "Loading more elections..."
            : "Scroll down to load more"}
        </div>
      )}

      {/* Filter modal dialog */}
      <ElectionInstancesFilterDialog
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);

          // Keep URL query param in sync when exactly one election group is selected
          const newGroupId =
            newFilters.election_group_ids.length === 1
              ? newFilters.election_group_ids[0]
              : undefined;

          if (newGroupId !== election_group_id) {
            navigate({
              search: (prev) => ({
                ...prev,
                election_group_id: newGroupId,
              }),
              replace: true,
            });
          }
        }}
      />
    </Layout>
  );
}
