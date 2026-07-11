import * as React from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { UsersTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getPartyMembersTabs } from "./-data";
import { PartyMembersActions } from "#/components/party-members/PartyMembersActions";
import { UserFormDialog } from "@repo/ui/components/custom/UserFormDialog";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useIntersectionObserver } from "usehooks-ts";
import { useAuth } from "#/hooks/useAppContext";

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
  "/_authenticated/$partyShortName/party-members/",
)({
  head: () => getPageHeader({ title: "Party members" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const { user, party } = useAuth();
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
    queryKey: ["party-members", partyId],
    queryFn: async ({ pageParam }) => {
      const res = await getUsersList({
        data: {
          role: "partymember",
          party_id: partyId,
          limit: 20,
          cursor: pageParam,
        },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to load party members");
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => {
      if (lastPage && lastPage.meta && lastPage.meta.has_more) {
        return lastPage.meta.next_cursor || "";
      }
      return undefined;
    },
    enabled: partyId !== undefined,
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
  const partyMembers = data
    ? data.pages.flatMap((page) => page.data?.users || [])
    : [];

  return (
    <Layout>
      <PageHeader
        title="Party members"
        activeTab="all"
        tabs={getPartyMembersTabs(partyShortName)}
      />
      <PageSearchLayer
        ariaLabel="Search party members"
        placeholder="Search"
        rightComponent={
          <>
            <PartyMembersActions />
            <AddButton onClick={() => setIsFormOpen(true)} />
          </>
        }
      />

      {isLoading && partyMembers.length === 0 ? (
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error
            ? error.message
            : "Failed to load party members"}
        </div>
      ) : partyMembers.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No party members found.
        </div>
      ) : (
        <>
          <UsersTable items={partyMembers} refetch={refetch} />

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
        defaultRole="partymember"
        defaultRoleLevel="member"
        getAllCountries={getAllCountries}
        getStates={getStates}
        getCities={getCities}
        getParties={getParties}
        getPresignedUploadURL={getPresignedUploadURL}
        confirmFileUpload={confirmFileUpload}
        registerCandidate={registerCandidate}
        updateUser={updateUser}
      />
    </Layout>
  );
}
