/**
 * @file Suspended Party Members Page
 * @description Master roster of all suspended members belonging to the current political party.
 * Provides infinite scroll member listing, debounced search, and member reactivation actions.
 */

import * as React from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
} from "@repo/ui/components/custom/AdminLayouts";
import { UsersTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getPartyAdminsTabs } from "./-data";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useIntersectionObserver, useDebounceValue } from "usehooks-ts";
import { useUserParty } from "#/hooks/useUserParty";
import { getSuspendedPartyMembers } from "#/lib/server/parties";

import { QUERY_KEYS } from "#/lib/config";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/party-members/suspended",
)({
  head: () => getPageHeader({ title: "Suspended Users - Party members" }),
  component: RouteComponent,
});

function RouteComponent() {
  // Route params & search state
  const { partyShortName } = Route.useParams();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500);

  // Current authenticated user's party context
  const { party } = useUserParty();
  const partyId = party?.id;

  // Paginated query to fetch suspended party members using cursor-based pagination
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } = useInfiniteQuery({
    queryKey: QUERY_KEYS.partyMembers.suspended(partyId),
    queryFn: async ({ pageParam }) => {
      if (!partyId) {
        return { success: true, data: { suspended_users: [] } };
      }
      const res = await getSuspendedPartyMembers({
        data: {
          partyId,
          limit: 30,
          cursor: pageParam || undefined,
        },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to load suspended party members");
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => {
      if (lastPage?.data?.meta?.has_more) {
        return lastPage.data.meta.next_cursor || "";
      }
      return undefined;
    },
    enabled: partyId !== undefined,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  // Intersection observer sentinel for auto-fetching next page when scrolled into view
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  // Trigger loading next page when scrolling reaches the bottom sentinel
  React.useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten nested pages from infinite query into a single list
  const rawMembers = data
    ? data.pages.flatMap((page) => page.data?.suspended_users || [])
    : [];

  // Normalize suspended records to the shape expected by UsersTable and apply client-side search filtering
  const members = React.useMemo(() => {
    const list = rawMembers.map((item: any) => ({
      id: item.user_id,
      fake_id: item.fake_id || item.user_id,
      username: item.username,
      first_name: item.first_name,
      last_name: item.last_name,
      avatar: item.avatar,
      role_level: item.role_level || "member",
      party_id: item.party_id || partyId,
      status: "suspended",
      account_status: "suspended",
      created_at: item.suspended_at || item.created_at,
      state_name: item.state_name,
      country_name: item.country_name,
      party_basic_info: {
        logo: item.party_logo,
        name: item.party_name,
      },
    }));

    if (!debouncedSearchQuery.trim()) return list;

    // Filter members by full name or username matching search input
    const q = debouncedSearchQuery.toLowerCase().trim();
    return list.filter((m: any) => {
      const fullName = `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase();
      const uname = (m.username || "").toLowerCase();
      return fullName.includes(q) || uname.includes(q);
    });
  }, [rawMembers, partyId, debouncedSearchQuery]);

  return (
    <Layout>
      {/* Navigation header with party tabs */}
      <PageHeader
        title="Party members"
        activeTab="suspended"
        tabs={getPartyAdminsTabs(partyShortName)}
      />
      {/* Search input field */}
      <PageSearchLayer
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        ariaLabel="Search suspended members"
        placeholder="Search suspended users"
      />

      {/* Initial loading state */}
      {isLoading && members.length === 0 ? (
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        /* Error message display */
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error
            ? error.message
            : "Failed to load suspended users"}
        </div>
      ) : members.length === 0 ? (
        /* Empty results state */
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No suspended members found.
        </div>
      ) : (
        /* Data table & infinite scroll sentinel */
        <>
          <UsersTable items={members} partyId={partyId} refetch={refetch} />

          {/* Bottom sentinel for infinite scrolling */}
          {hasNextPage && (
            <div
              ref={sentinelRef}
              className="py-6 flex items-center justify-center text-c-50 text-[14px]"
            >
              {isFetchingNextPage ? (
                <Loader2 className="size-5 animate-spin mr-2" />
              ) : null}
              {isFetchingNextPage
                ? "Loading more suspended users..."
                : "Scroll down to load more"}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
