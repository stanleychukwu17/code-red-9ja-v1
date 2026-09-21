/**
 * @file Party Admins Roster Page
 * @description Roster displaying party administrators belonging to the current political party.
 * Provides infinite scroll administrator listing, debounced search, scoped multi-criteria filters,
 * administrator creation modal (`UserFormDialog`), and server actions.
 */

import * as React from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { UsersTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getPartyAdminsTabs } from "./-data";
import { UserFormDialog } from "@repo/ui/components/custom/UserFormDialog";
import {
  AdminUsersSearchFilterDialog,
  type UsersFilters,
} from "#/components/dialogs/AdminUsersSearchFilterDialog";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useIntersectionObserver, useDebounceValue } from "usehooks-ts";
import { useUser } from "#/hooks/useUser";
import { useUserParty } from "#/hooks/useUserParty";

// Server Functions
import { getAllCountries, getStates, getCities } from "#/lib/server/countries";
import {
  getParties,
  getPresignedUploadURL,
  confirmFileUpload,
} from "#/lib/server/parties";
import { registerCandidate } from "#/lib/server/auth/auth";
import { updateUser, getUsersList } from "#/lib/server/users";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/party-members/party-admin",
)({
  head: () => getPageHeader({ title: "Party admins" }),
  component: RouteComponent,
});

/**
 * Party Admins Page Component
 * Handles infinite pagination of party admins, debounced search,
 * filtering dialog, observer sentinel triggers, and user creation dialog lifecycle.
 */
function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500);
  const [filters, setFilters] = React.useState<UsersFilters>({
    roles: [],
    statuses: [],
    verificationTypes: [],
    stateIds: [],
  });

  const user = useUser();
  const { party } = useUserParty();
  const partyId = party?.id ?? user?.party?.id ?? (user as any)?.party_id;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["party-members", "party-admin", partyId, debouncedSearchQuery, filters],
    queryFn: async ({ pageParam }) => {
      const res = await getUsersList({
        data: {
          party_id: partyId,
          limit: 30,
          cursor: pageParam,
          search: debouncedSearchQuery || undefined,
          roles:
            filters.roles.length > 0
              ? filters.roles
              : ["party_admin", "super_party_admin"],
          statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
          verificationTypes:
            filters.verificationTypes.length > 0
              ? filters.verificationTypes
              : undefined,
          countryId: filters.countryId || undefined,
          stateIds: filters.stateIds.length > 0 ? filters.stateIds : undefined,
        },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to load party admins");
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => {
      if (lastPage && lastPage.meta && lastPage.meta.has_more) {
        return lastPage.meta.next_cursor || "";
      }
      return undefined;
    },
    enabled: partyId !== undefined,
    refetchOnWindowFocus: false,
  });

  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  // Infinite Scroll Trigger
  React.useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten to raw UserType array
  const partyAdmins = data
    ? data.pages.flatMap((page) => page.data?.users || [])
    : [];

  return (
    <Layout>
      <PageHeader
        title="Party members"
        activeTab="party-admin"
        tabs={getPartyAdminsTabs(partyShortName)}
      />
      <PageSearchLayer
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        ariaLabel="Search party admins"
        placeholder="Search"
        rightComponent={
          <>
            <FilterButton onClick={() => setIsFilterOpen(true)} />
            <AddButton onClick={() => setIsFormOpen(true)} />
          </>
        }
      />

      {isLoading && partyAdmins.length === 0 ? (
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error
            ? error.message
            : "Failed to load party admins"}
        </div>
      ) : partyAdmins.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No party admins found.
        </div>
      ) : (
        <>
          <UsersTable items={partyAdmins} refetch={refetch} />

          {/* Sentinel element for infinite scroll */}
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

      <UserFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => refetch()}
        partyShortName={partyShortName}
        getAllCountries={getAllCountries}
        getStates={getStates}
        getCities={getCities}
        getParties={getParties}
        getPresignedUploadURL={getPresignedUploadURL}
        confirmFileUpload={confirmFileUpload}
        registerCandidate={registerCandidate}
        updateUser={updateUser}
      />

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
