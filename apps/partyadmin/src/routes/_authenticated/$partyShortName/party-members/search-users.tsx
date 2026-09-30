/**
 * @file Search Users Across App Page
 * @description Roster allowing party administrators to search and filter through
 * all platform users across the application, with infinite scroll, debounced search,
 * and scoped multi-criteria filters.
 */

import * as React from "react";
import { Layout, PageHeader, PageSearchLayer, FilterButton } from "@repo/ui/components/custom/AdminLayouts";
import { UsersTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getPartyAdminsTabs } from "./-data";
import { AdminUsersSearchFilterDialog, type UsersFilters } from "#/components/dialogs/AdminUsersSearchFilterDialog";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useIntersectionObserver, useDebounceValue } from "usehooks-ts";
import { useUserParty } from "#/hooks/useUserParty";

// Server Functions
import { searchUsers } from "#/lib/server/users";

export const Route = createFileRoute("/_authenticated/$partyShortName/party-members/search-users")({
  head: () => getPageHeader({ title: "Search users across app" }),
  component: RouteComponent,
});

/**
 * Search Users Page Component
 * Handles global user querying across the entire platform without party_id restrictions.
 * Requires at least 3 characters in the search query before triggering an API request.
 */
function RouteComponent() {
  const { partyShortName } = Route.useParams();

  // Dialog & search state controls
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Debounce the input query to prevent spamming the backend during typing
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500);

  // Active filter criteria (location, verification badges, roles, etc.)
  const [filters, setFilters] = React.useState<UsersFilters>({
    roles: [],
    statuses: [],
    verificationTypes: [],
    stateIds: [],
  });

  // Query conditions: require at least 3 characters before hitting backend
  const trimmedQuery = debouncedSearchQuery.trim();
  const hasSearch = trimmedQuery.length > 2;

  // Infinite query for pagination - only enabled when a valid search query is present
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } = useInfiniteQuery({
    queryKey: ["all-app-users", trimmedQuery, filters],
    queryFn: async ({ pageParam }) => {
      const res = await searchUsers({
        data: {
          limit: 30,
          cursor: pageParam,
          search: trimmedQuery,
          countryId: filters.countryId || undefined,
          stateIds: filters.stateIds.length > 0 ? filters.stateIds : undefined,
        },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to load users");
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => {
      // Keyset cursor pagination check from backend response metadata
      if (lastPage && lastPage.meta && lastPage.meta.has_more) {
        return lastPage.meta.next_cursor || "";
      }
      return undefined;
    },
    enabled: hasSearch, // Prevents loading initial records until user searches
    refetchOnWindowFocus: false,
  });

  // Intersection observer sentinel for auto-loading next page on scroll
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  // Trigger next page fetch when sentinel enters the viewport
  React.useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten paginated pages into a single flat array of user records
  const allUsers = data
    ? data.pages.flatMap((page) => page.data?.users || [])
    : [];

  const { party } = useUserParty();
  const partyId = party?.id;

  return (
    <Layout>
      {/* Tab bar header navigation */}
      <PageHeader
        title="Party members"
        activeTab="search-users"
        tabs={getPartyAdminsTabs(partyShortName)}
      />

      {/* Search bar with filter action trigger */}
      <PageSearchLayer
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        ariaLabel="Search all app users"
        placeholder="Search users by username, name, or email..."
        rightComponent={
          <FilterButton onClick={() => setIsFilterOpen(true)} />
        }
      />

      {/* 1. Initial State: No search query entered yet */}
      {!hasSearch ? (
        <div className="w-full p-16 text-center bg-card rounded-2xl border border-border flex flex-col items-center justify-center">
          <div className="size-12 rounded-full bg-c-10 flex items-center justify-center mb-3">
            <Search className="size-6 text-c-60" />
          </div>
          <h4 className="text-base font-semibold text-c-90">
            Search users across the app
          </h4>
          <p className="text-sm text-c-60 mt-1 max-w-sm">
            Enter a name, username, or keyword in the search bar above to look up users across the platform.
          </p>
        </div>
      ) : isLoading && allUsers.length === 0 ? (
        /* 2. Loading State: Fetching matching records */
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        /* 3. Error State */
        <div className="w-full p-6 text-center text-destructive font-medium">
          {error instanceof Error ? error.message : "Failed to load users"}
        </div>
      ) : allUsers.length === 0 ? (
        /* 4. Empty Results: No matching records for the typed keyword */
        <div className="w-full p-12 text-center text-c-40 font-medium bg-card rounded-2xl border border-border">
          No users found matching "{trimmedQuery}".
        </div>
      ) : (
        /* 5. Results State: Render table & infinite scroll sentinel */
        <>
          <UsersTable items={allUsers} partyId={partyId} refetch={refetch} />

          {/* Sentinel element triggering infinite pagination */}
          {hasNextPage && (
            <div
              ref={sentinelRef}
              className="py-6 flex items-center justify-center text-c-50 text-[14px]"
            >
              {isFetchingNextPage ? (
                <Loader2 className="size-5 animate-spin mr-2" />
              ) : null}
              {isFetchingNextPage
                ? "Loading more..."
                : "Scroll down to load more"}
            </div>
          )}
        </>
      )}

      {/* Search criteria modal filter dialog */}
      <AdminUsersSearchFilterDialog
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        initialFilters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
        }}
      />
    </Layout>
  );
}
