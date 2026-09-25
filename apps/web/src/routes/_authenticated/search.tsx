import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import React from "react";
import {
  Ban,
  Copy,
  Ellipsis,
  Filter,
  Flag,
  Loader2,
  Search,
  Share2,
  User,
  Users,
  UserX,
  VolumeX,
} from "lucide-react";
import { useState } from "react";
import { useDebounceValue, useIntersectionObserver } from "usehooks-ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { getPageHeader } from "#/lib/shared/meta";
import { searchCitizensList, type SearchedUserItem } from "#/lib/server/citizens";
import { SelectCountry } from "@repo/ui/components/selects/country-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectParty } from "@repo/ui/components/selects/party-select";
import { VerificationBadge } from "@repo/ui/components/custom/verification-badge";
import { getAllCountries, getStates } from "#/lib/server/countries";
import { getParties } from "#/lib/server/parties";
import { cn } from "@repo/ui/lib/utils";

/**
 * Route definition for citizen discovery search (/search).
 * Protected by the parent _authenticated layout.
 */
export const Route = createFileRoute("/_authenticated/search")({
  head: () =>
    getPageHeader({
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

// =============================================================================
// Helper Functions for Postgres / SQL Null Value Serialization
// =============================================================================

/**
 * Safely extracts a string from either a plain string or a Go/sqlc `sql.NullString` object.
 * Returns an empty string if null, undefined, or marked invalid.
 */
function resolveText(val?: { String: string; Valid: boolean } | string): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val.Valid ? val.String : "";
}

/**
 * Safely extracts a boolean from either a boolean primitive or a Go/sqlc `sql.NullBool` object.
 * Returns false if null, undefined, or marked invalid.
 */
function resolveBool(val?: { Bool: boolean; Valid: boolean } | boolean): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === "boolean") return val;
  return val.Valid ? val.Bool : false;
}

// =============================================================================
// User Search Result Item Component
// =============================================================================

/**
 * Displays an individual citizen search result row with avatar, name, verification badge,
 * handle, state of residence, political party badge, and an action dropdown.
 */
function UserSearchResultItem({ person }: { person: SearchedUserItem }) {
  const navigate = useNavigate();

  const firstName = resolveText(person.first_name);
  const lastName = resolveText(person.last_name);
  const fullName = `${firstName} ${lastName}`.trim() || "Citizen";
  const username = resolveText(person.username) || `user_${person.id}`;
  const avatar = resolveText(person.avatar);
  const isPolitician = resolveBool(person.is_politician);
  const isVerified = resolveBool(person.is_verified);
  const stateName = person.state_name || "";
  const partyInfo = person.party_basic_info;

  const partyLogo = partyInfo?.logo;
  const verifications = person.verifications || [];

  const handleGoToProfile = () => {
    navigate({
      to: `/profile/${encodeURIComponent(username)}`,
    });
  };

  return (
    <div className="group flex items-center justify-between gap-4 py-2.5 px-3 rounded-2xl transition hover:bg-sidebar-softer">
      <div
        onClick={handleGoToProfile}
        className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer"
      >
        <div className="relative shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt={fullName}
              className="size-14 rounded-full object-cover"
            />
          ) : (
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}
          {partyLogo ? (
            <img
              src={partyLogo}
              alt={partyInfo?.name || partyInfo?.short_name || "Party Logo"}
              title={partyInfo?.name || partyInfo?.short_name || "Party"}
              className="absolute -bottom-1 -right-1 size-5.5 rounded-full object-cover border-2 border-background shadow-sm"
            />
          ) : null}
        </div>

        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-c-100 truncate group-hover:text-primary transition-colors">
              {fullName}
            </p>
            {isVerified && verifications.length > 0 ? (
              <p className="inline-flex items-center gap-px shrink-0">
                {verifications.map((v) => (
                  <VerificationBadge
                    key={`${v.id}-${v.verification_type_id}`}
                    id={v.verification_type_id}
                    title={v.verification_title}
                    className="size-4 shrink-0"
                  />
                ))}
              </p>
            ) : null}
            {isPolitician ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                Politician
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-[13px] text-c-50 truncate">
            <span>@{username}</span>
            {stateName ? (
              <>
                <span className="inline-block size-1 rounded-full bg-c-30" />
                <span className="truncate">{stateName}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Action ellipsis dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full text-c-50 hover:text-c-90 hover:bg-hover-5 opacity-100 md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100 transition-all shrink-0 cursor-pointer"
            aria-label={`Options for ${fullName}`}
          >
            <Ellipsis className="size-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 rounded-2xl p-1.5 shadow-xl border border-border bg-popover text-popover-foreground"
        >
          <DropdownMenuItem
            onClick={handleGoToProfile}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-c-80 hover:text-c-100 hover:bg-hover-5"
          >
            <User className="size-4 text-c-50" />
            <span>View Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-c-80 hover:text-c-100 hover:bg-hover-5">
            <Share2 className="size-4 text-c-50" />
            <span>Share Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                navigator.clipboard.writeText(
                  `${window.location.origin}/profile/${encodeURIComponent(username)}`,
                );
              }
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-c-80 hover:text-c-100 hover:bg-hover-5"
          >
            <Copy className="size-4 text-c-50" />
            <span>Copy Link</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1 bg-border" />
          <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-c-80 hover:text-c-100 hover:bg-hover-5">
            <VolumeX className="size-4 text-c-50" />
            <span>Mute User</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-destructive hover:bg-destructive/10"
          >
            <Ban className="size-4 text-destructive" />
            <span>Block User</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-destructive hover:bg-destructive/10"
          >
            <Flag className="size-4 text-destructive" />
            <span>Report User</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
