/**
 * @file Election Instances Page
 * @description Renders individual contested election race instances (e.g. specific Senatorial,
 * Gubernatorial, or Presidential ballots) with registered party candidates and election dates.
 * Features cursor-based pagination, multi-criteria filtering, and search.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useEffect, useState, useMemo } from "react";
import { Layout, PageHeader, PageSearchLayer, FilterButton } from "@repo/ui/components/custom/AdminLayouts";
import { Button } from "@repo/ui/components/button";
import { ElectionInstancesTable } from "#/components/Tables";
import { getElectionTabs } from "./-data";
import { getElections, type ElectionFilters } from "#/lib/server/elections";
import { ElectionInstancesFilterDialog } from "#/components/dialogs/ElectionInstancesFilterDialog";
import { useIntersectionObserver, useDebounceValue } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { ElectionInstanceType } from "#/components/tiles/election-instance-tile";
import { useUserParty } from "#/hooks/useUserParty";

export type InstancesSearch = {
  election_group_id?: number;
  election_group_ids?: number[];
  scopes?: string[];
  statuses?: string[];
  state_ids?: number[];
  office_ids?: number[];
  date_from?: string;
  date_to?: string;
  search?: string;
};

const parseNumber = (val: unknown): number | undefined => {
  if (val === undefined || val === null || val === "") return undefined;
  const num = Number(val);
  return !isNaN(num) && num > 0 ? num : undefined;
};

const parseNumberArray = (val: unknown): number[] => {
  if (val === undefined || val === null || val === "") return [];
  if (Array.isArray(val)) {
    return val.map((v) => Number(v)).filter((n) => !isNaN(n) && n > 0);
  }
  if (typeof val === "string") {
    return val
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
  }
  if (typeof val === "number" && !isNaN(val) && val > 0) {
    return [val];
  }
  return [];
};

const parseStringArray = (val: unknown): string[] => {
  if (val === undefined || val === null || val === "") return [];
  if (Array.isArray(val)) {
    return val.map(String).filter((s) => s.trim().length > 0);
  }
  if (typeof val === "string") {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
};

const parseString = (val: unknown): string | undefined => {
  if (typeof val === "string" && val.trim().length > 0) return val.trim();
  return undefined;
};

export const Route = createFileRoute("/_authenticated/$partyShortName/elections/instances")({
  validateSearch: (search: Record<string, unknown>): InstancesSearch => {
    const groupIds = parseNumberArray(search.election_group_ids);
    const singleGroupId = parseNumber(search.election_group_id);
    if (singleGroupId && !groupIds.includes(singleGroupId)) {
      groupIds.unshift(singleGroupId);
    }

    const scopes = parseStringArray(search.scopes || search.scope);
    const statuses = parseStringArray(search.statuses || search.status);
    const state_ids = parseNumberArray(search.state_ids || search.state_id);
    const office_ids = parseNumberArray(search.office_ids || search.office_id);
    const date_from = parseString(search.date_from);
    const date_to = parseString(search.date_to);
    const searchStr = parseString(search.search || search.q);

    return {
      election_group_id: singleGroupId ?? (groupIds.length === 1 ? groupIds[0] : undefined),
      election_group_ids: groupIds.length > 0 ? groupIds : undefined,
      scopes: scopes.length > 0 ? scopes : undefined,
      statuses: statuses.length > 0 ? statuses : undefined,
      state_ids: state_ids.length > 0 ? state_ids : undefined,
      office_ids: office_ids.length > 0 ? office_ids : undefined,
      date_from,
      date_to,
      search: searchStr,
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
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();

  const [searchQuery, setSearchQuery] = useState(searchParams.search || "");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 400);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const initialGroupIds = useMemo(() => {
    if (searchParams.election_group_ids && searchParams.election_group_ids.length > 0) {
      return searchParams.election_group_ids;
    }
    if (searchParams.election_group_id) {
      return [searchParams.election_group_id];
    }
    return [];
  }, [searchParams.election_group_id, searchParams.election_group_ids]);

  const [filters, setFilters] = useState<ElectionFilters>({
    election_group_ids: initialGroupIds,
    scopes: searchParams.scopes || [],
    statuses: searchParams.statuses || [],
    state_ids: searchParams.state_ids || [],
    office_ids: searchParams.office_ids || [],
    date_from: searchParams.date_from,
    date_to: searchParams.date_to,
  });

  const updateUrlParams = (newFilters: ElectionFilters, newSearch?: string) => {
    navigate({
      search: () => {
        const next: Record<string, unknown> = {};

        if (newFilters.election_group_ids.length === 1) {
          next.election_group_id = newFilters.election_group_ids[0];
        } else if (newFilters.election_group_ids.length > 1) {
          next.election_group_ids = newFilters.election_group_ids;
        }

        if (newFilters.scopes.length > 0) {
          next.scopes = newFilters.scopes;
        }
        if (newFilters.statuses.length > 0) {
          next.statuses = newFilters.statuses;
        }
        if (newFilters.state_ids.length > 0) {
          next.state_ids = newFilters.state_ids;
        }
        if (newFilters.office_ids.length > 0) {
          next.office_ids = newFilters.office_ids;
        }
        if (newFilters.date_from) {
          next.date_from = newFilters.date_from;
        }
        if (newFilters.date_to) {
          next.date_to = newFilters.date_to;
        }

        const effectiveSearch = newSearch !== undefined ? newSearch : searchQuery;
        if (effectiveSearch && effectiveSearch.trim()) {
          next.search = effectiveSearch.trim();
        }

        return next;
      },
      replace: true,
    });
  };

  // Synchronize URL search params with active filters if changed externally (e.g. back/forward navigation)
  useEffect(() => {
    const groupIds =
      searchParams.election_group_ids && searchParams.election_group_ids.length > 0
        ? searchParams.election_group_ids
        : searchParams.election_group_id
          ? [searchParams.election_group_id]
          : [];

    setFilters({
      election_group_ids: groupIds,
      scopes: searchParams.scopes || [],
      statuses: searchParams.statuses || [],
      state_ids: searchParams.state_ids || [],
      office_ids: searchParams.office_ids || [],
      date_from: searchParams.date_from,
      date_to: searchParams.date_to,
    });

    if (searchParams.search !== undefined && searchParams.search !== searchQuery) {
      setSearchQuery(searchParams.search);
    } else if (!searchParams.search && searchQuery) {
      setSearchQuery("");
    }
  }, [
    searchParams.election_group_id,
    JSON.stringify(searchParams.election_group_ids),
    JSON.stringify(searchParams.scopes),
    JSON.stringify(searchParams.statuses),
    JSON.stringify(searchParams.state_ids),
    JSON.stringify(searchParams.office_ids),
    searchParams.date_from,
    searchParams.date_to,
    searchParams.search,
  ]);

  // Sync debounced search input to URL query params
  useEffect(() => {
    const currentUrlSearch = searchParams.search || "";
    if (debouncedSearchQuery !== currentUrlSearch) {
      updateUrlParams(filters, debouncedSearchQuery);
    }
  }, [debouncedSearchQuery]);

  // Calculate total number of applied filters for badge indicator
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.election_group_ids.length > 0) count += filters.election_group_ids.length;
    if (filters.scopes.length > 0) count += filters.scopes.length;
    if (filters.statuses.length > 0) count += filters.statuses.length;
    if (filters.state_ids.length > 0) count += filters.state_ids.length;
    if (filters.office_ids.length > 0) count += filters.office_ids.length;
    if (filters.date_from) count += 1;
    if (filters.date_to) count += 1;
    return count;
  }, [filters]);

  const { party } = useUserParty();

  // fetch the election instances
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["elections", partyShortName, party?.id, debouncedSearchQuery, filters],
    queryFn: async ({ pageParam }) => {
      const res = await getElections({
        data: {
          limit: 35,
          cursor: pageParam as string,
          partyId: party?.id,
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
    staleTime: Infinity,
    refetchOnWindowFocus: false,
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
    ? data.pages.flatMap((page: any) => page.data?.elections ?? [])
    : [];

  return (
    <Layout>
      <PageHeader
        title="Elections"
        activeTab="instances"
        tabs={getElectionTabs(partyShortName, searchParams)}
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
                const emptyFilters: ElectionFilters = {
                  election_group_ids: [],
                  scopes: [],
                  statuses: [],
                  state_ids: [],
                  office_ids: [],
                  date_from: undefined,
                  date_to: undefined,
                };
                setSearchQuery("");
                setFilters(emptyFilters);
                updateUrlParams(emptyFilters, "");
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
          updateUrlParams(newFilters);
        }}
      />
    </Layout>
  );
}
