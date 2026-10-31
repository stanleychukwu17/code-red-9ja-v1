import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Filter, Loader2, Search, Users, UserX } from "lucide-react";
import { useState } from "react";
import { useDebounceValue, useIntersectionObserver } from "usehooks-ts";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogPadding } from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { getPageHeader } from "#/lib/shared/meta";
import { searchCitizensList, type SearchedUserItem } from "#/lib/server/citizens";
import { SelectCountry } from "@repo/ui/components/selects/country-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectParty } from "@repo/ui/components/selects/party-select";
import { getAllCountries, getStates } from "#/lib/server/countries";
import { getParties } from "#/lib/server/parties";
import { cn } from "@repo/ui/lib/utils";
import { UserSearchResultItem } from "@/components/search/UserSearchResultItem";

/**
 * Route definition for citizen discovery search (/search).
 * Protected by the parent _authenticated layout.
 */
export const Route = createFileRoute("/_authenticated/search")({
  head: () => getPageHeader({
    title: "Search Citizens",
    description: "Search and discover registered citizens across Nigeria on Free9ja.",
  }),
  component: RouteComponent,
});

function RouteComponent() {
  // ---------------------------------------------------------------------------
  // 1. Search Bar State
  // ---------------------------------------------------------------------------
  const [query, setQuery] = useState("");
  // Debounce user keystrokes by 350ms to minimize unnecessary network requests while typing
  const [debouncedQuery] = useDebounceValue(query, 350);

  // ---------------------------------------------------------------------------
  // 2. Active (Applied) Filter State
  // These represent the filters actively applied to the search query.
  // ---------------------------------------------------------------------------
  const [selectedCountryId, setSelectedCountryId] = useState<number | string | undefined>(161); // Default to Nigeria (ID 161)
  const [selectedStateId, setSelectedStateId] = useState<number | string | undefined>(undefined);
  const [selectedPartyId, setSelectedPartyId] = useState<number | string | undefined>(undefined);
  const [isPoliticianOnly, setIsPoliticianOnly] = useState(false);
  const [isVerifiedOnly, setIsVerifiedOnly] = useState(false);

  // Controls the visibility of the Filter Citizens modal dialog
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // 3. Draft Filter State (Inside Filter Dialog)
  // Maintains local modifications inside the modal until the user clicks "Apply Filters".
  // This prevents intermediate API queries while browsing options.
  // ---------------------------------------------------------------------------
  const [draftCountryId, setDraftCountryId] = useState<number | string | undefined>(161);
  const [draftStateId, setDraftStateId] = useState<number | string | undefined>(undefined);
  const [draftPartyId, setDraftPartyId] = useState<number | string | undefined>(undefined);
  const [draftPoliticianOnly, setDraftPoliticianOnly] = useState(false);
  const [draftVerifiedOnly, setDraftVerifiedOnly] = useState(false);

  /**
   * Synchronizes the draft dialog state with the currently applied filters upon opening.
   */
  const handleOpenFilterDialog = () => {
    setDraftCountryId(selectedCountryId);
    setDraftStateId(selectedStateId);
    setDraftPartyId(selectedPartyId);
    setDraftPoliticianOnly(isPoliticianOnly);
    setDraftVerifiedOnly(isVerifiedOnly);
    setIsFilterDialogOpen(true);
  };

  /**
   * Commits the draft filter choices to active state and closes the dialog.
   */
  const handleApplyFilters = () => {
    setSelectedCountryId(draftCountryId);
    setSelectedStateId(draftStateId);
    setSelectedPartyId(draftPartyId);
    setIsPoliticianOnly(draftPoliticianOnly);
    setIsVerifiedOnly(draftVerifiedOnly);
    setIsFilterDialogOpen(false);
  };

  /**
   * Resets all draft filters within the modal to their default unselected state.
   */
  const handleClearFilters = () => {
    setDraftCountryId(161);
    setDraftStateId(undefined);
    setDraftPartyId(undefined);
    setDraftPoliticianOnly(false);
    setDraftVerifiedOnly(false);
  };

  // ---------------------------------------------------------------------------
  // 4. Data Queries
  // ---------------------------------------------------------------------------

  // Strip leading '@' symbols so searching "@stanley" matches username "stanley"
  const normalizedQuery = debouncedQuery.trim().replace(/^@/, "");

  // Require a search string with at least 3 characters — filters alone won't trigger the backend query
  const hasActiveFilters = normalizedQuery.length >= 3;

  // Items per page
  const PAGE_LIMIT = 20;

  // Search active citizens via backend GET /api/v1/users/search with cursor-based pagination
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching } = useInfiniteQuery({
    queryKey: ["citizens-search", normalizedQuery, selectedCountryId, selectedStateId, selectedPartyId, isPoliticianOnly, isVerifiedOnly],

    // pageParam is the cursor value passed in from getNextPageParam below
    queryFn: ({ pageParam }) =>
      searchCitizensList({
        data: {
          q: normalizedQuery || undefined,
          countryId: selectedCountryId ? Number(selectedCountryId) : undefined,
          stateId: selectedStateId ? Number(selectedStateId) : undefined,
          partyId: selectedPartyId ? Number(selectedPartyId) : undefined,
          isPolitician: isPoliticianOnly ? true : undefined,
          isVerified: isVerifiedOnly ? true : undefined,
          limit: PAGE_LIMIT,
          cursor: pageParam || undefined,
        },
      }),

    // First page starts with no cursor (empty string = beginning)
    initialPageParam: "",

    // Derive the cursor for the next page from the last fetched page's meta
    // (Matches backend RespondSuccess which places meta at root: lastPage.meta)
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.meta ?? (lastPage as any)?.data?.meta;
      if (meta?.has_more) {
        return meta.next_cursor || undefined;
      }
      return undefined;
    },

    // Only fire when the user has typed a search query
    enabled: hasActiveFilters,

    refetchOnWindowFocus: false,
  });

  // Flatten all pages into a single list of citizens
  const users: SearchedUserItem[] = data ? data.pages.flatMap((page) => page.data?.users || []) : [];

  // Intersection observer sentinel: auto-fetches the next page when user scrolls to bottom
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  React.useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Count active non-default filters to display in the header filter badge
  const activeFiltersCount =
    (selectedCountryId && selectedCountryId !== 161 ? 1 : 0) +
    (selectedStateId ? 1 : 0) +
    (selectedPartyId ? 1 : 0) +
    (isPoliticianOnly ? 1 : 0) +
    (isVerifiedOnly ? 1 : 0);

  return (
    <div className="flex-1 px-4 pb-12 pt-6 md:px-12 md:pt-7">
      <div className="mx-auto flex w-full max-w-155 flex-col gap-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[34px] font-bold tracking-[-0.04em] text-c-100">
              Search Citizens
            </h1>
            <p className="text-sm text-c-50 mt-1">
              Find registered voters, verified agents, and politicians
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenFilterDialog}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition border cursor-pointer",
              activeFiltersCount > 0
                ? "bg-primary text-white border-primary"
                : "bg-hover-5 text-c-80 border-border hover:bg-hover-7",
            )}
          >
            <Filter className="size-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 ? (
              <span className="flex size-4.5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-primary">
                {activeFiltersCount}
              </span>
            ) : null}
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex h-13 items-center gap-3 rounded-2xl bg-sidebar-softer px-4 transition">
          <Search className="size-5 text-c-50 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or @username..."
            className="w-full bg-transparent text-base text-c-90 outline-none placeholder:text-c-40"
          />
          {isFetching ? (
            <Loader2 className="size-4 animate-spin text-primary shrink-0" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs font-semibold text-c-50 hover:text-c-90 shrink-0 cursor-pointer transition-colors"
            >
              Clear
            </button>
          ) : null}
        </div>

        {/* Filter Dialog (same design as Admin Users Filter) */}
        {isFilterDialogOpen && (
          <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
            <DialogContent
              className="max-w-110 p-0 rounded-2xl border-none shadow-2xl overflow-hidden flex flex-col max-h-[85vh] bg-background"
              onPointerDownOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader title="Filter Citizens" />

              <DialogPadding className="flex-1 overflow-y-auto space-y-7 pb-6 pt-5 min-h-0">
                {/* Residence Country */}
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-semibold text-c-90 text-[15px] shrink-0">
                    Residence Country
                  </h4>
                  <div className="flex-1 max-w-50">
                    <SelectCountry
                      selectedId={draftCountryId}
                      update={(item) => {
                        setDraftCountryId(item.id);
                        setDraftStateId(undefined);
                      }}
                      fetchCountries={getAllCountries}
                      errorMsg={undefined}
                    />
                  </div>
                </div>

                <div className="h-px bg-border w-full" />

                {/* Residence State */}
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-semibold text-c-90 text-[15px] shrink-0">
                    Residence State
                  </h4>
                  <div className="flex-1 max-w-50">
                    <SelectState
                      selectedId={draftStateId}
                      update={(item) => setDraftStateId(item.id)}
                      countryOriginalId={
                        draftCountryId ? Number(draftCountryId) : 161
                      }
                      fetchStates={getStates}
                      disabled={!draftCountryId}
                      errorMsg={undefined}
                    />
                  </div>
                </div>

                <div className="h-px bg-border w-full" />

                {/* Political Party */}
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-semibold text-c-90 text-[15px] shrink-0">
                    Political Party
                  </h4>
                  <div className="flex-1 max-w-50">
                    <SelectParty
                      selectedId={draftPartyId}
                      update={(item) => setDraftPartyId(item.id)}
                      fetchParties={getParties}
                      errorMsg={undefined}
                    />
                  </div>
                </div>

                <div className="h-px bg-border w-full" />

                {/* Citizen Roles & Badges */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-c-90 text-[15px]">Citizen Status</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="size-4.5 rounded border-border text-success focus:ring-success accent-success cursor-pointer shrink-0"
                        checked={draftPoliticianOnly}
                        onChange={(e) => setDraftPoliticianOnly(e.target.checked)}
                      />
                      <span className="text-[14px] text-c-80 group-hover:text-c-100 transition">
                        Politicians Only
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="size-4.5 rounded border-border text-success focus:ring-success accent-success cursor-pointer shrink-0"
                        checked={draftVerifiedOnly}
                        onChange={(e) => setDraftVerifiedOnly(e.target.checked)}
                      />
                      <span className="text-[14px] text-c-80 group-hover:text-c-100 transition">
                        Verified Citizens Only
                      </span>
                    </label>
                  </div>
                </div>
              </DialogPadding>

              <DialogFooter className="flex-row items-center justify-between gap-3 px-6 py-4 bg-background border-t border-border mt-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="2xl"
                  onClick={handleClearFilters}
                  className="flex-1 text-c-60 hover:text-c-100 hover:bg-hover-5"
                >
                  Clear All
                </Button>
                <Button
                  type="button"
                  variant="black"
                  size="2xl"
                  className="flex-1"
                  onClick={handleApplyFilters}
                >
                  Apply Filters
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Results section */}
        <section className="flex flex-col gap-1.5">
          {!hasActiveFilters ? (
            /* Initial state prompting citizen to search */
            <div className="py-16 flex flex-col items-center justify-center text-center text-c-50 gap-3">
              <div className="size-14 rounded-full bg-sidebar-softer flex items-center justify-center">
                <Users className="size-7 text-c-50" />
              </div>
              <p className="text-base font-semibold text-c-90">
                Discover Nigerian Citizens
              </p>
              <p className="text-[13px] text-c-50 max-w-sm">
                Type at least 3 characters of a name or username above to search for active citizens, politicians, and party members.
              </p>
            </div>
          ) : isLoading ? (
            /* Loading state */
            <div className="py-16 flex flex-col items-center justify-center text-center text-c-50 gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-sm font-medium text-c-60">Searching citizens...</p>
            </div>
          ) : users.length > 0 ? (
            <>
              {users.map((person) => (
                <UserSearchResultItem key={person.id} person={person} />
              ))}

              {/* Infinite scroll sentinel */}
              {hasNextPage && (
                <div
                  ref={sentinelRef}
                  className="py-6 flex items-center justify-center gap-2 text-c-50 text-[13px]"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Loading more citizens...</span>
                    </>
                  ) : (
                    <span>Scroll down for more</span>
                  )}
                </div>
              )}

              {/* End-of-results message when all pages are loaded */}
              {!hasNextPage && users.length > 0 && (
                <p className="py-4 text-center text-[12px] text-c-40">
                  Showing all {users.length} result{users.length !== 1 ? "s" : ""}
                </p>
              )}
            </>
          ) : (
            /* No matching users state */
            <div className="py-16 flex flex-col items-center justify-center text-center text-c-50 gap-2">
              <UserX className="size-8 text-c-50" />
              <p className="text-[15px] font-medium text-c-90">
                No citizens found
              </p>
              <p className="text-[13px] text-c-50">
                Try adjusting your search query or filters
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
