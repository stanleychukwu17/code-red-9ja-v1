/**
 * @file Blocked Party Members Page
 * @description Master roster of all users blocked by the current political party.
 * Provides infinite scroll user listing, debounced search, and unblocking actions.
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
import { getBlockedPartyMembers } from "#/lib/server/parties";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/party-members/blocked",
)({
  head: () => getPageHeader({ title: "Blocked Users - Party members" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500);

  const { party } = useUserParty();
  const partyId = party?.id;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["party-members", "blocked", partyId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!partyId) {
        return { success: true, data: { items: [], total: 0 } };
      }
      const res = await getBlockedPartyMembers({
        data: {
          partyId,
          limit: 30,
          offset: pageParam,
        },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to load blocked users");
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const currentCount = allPages.flatMap(
        (page) => page.data?.items || [],
      ).length;
      const total = lastPage?.data?.total || 0;
      if (currentCount < total) {
        return currentCount;
      }
      return undefined;
    },
    enabled: partyId !== undefined,
    refetchOnWindowFocus: false,
  });

  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  React.useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten and map blocked items to UsersTable format
  const rawMembers = data
    ? data.pages.flatMap((page) => page.data?.items || [])
    : [];

  const members = React.useMemo(() => {
    const list = rawMembers.map((item: any) => ({
      id: item.blocked_user_id || item.user_id,
      fake_id: item.fake_id || item.blocked_user_id || item.user_id,
      username: item.blocked_username || item.username,
      first_name: item.blocked_first_name || item.first_name,
      last_name: item.blocked_last_name || item.last_name,
      avatar: item.blocked_avatar || item.avatar,
      role_level: "blocked",
      party_id: partyId,
      status: "blocked",
      account_status: "blocked",
      created_at: item.blocked_at || item.created_at,
    }));

    if (!debouncedSearchQuery.trim()) return list;

    const q = debouncedSearchQuery.toLowerCase().trim();
    return list.filter((m: any) => {
      const fullName = `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase();
      const uname = (m.username || "").toLowerCase();
      return fullName.includes(q) || uname.includes(q);
    });
  }, [rawMembers, partyId, debouncedSearchQuery]);

  return (
    <Layout>
      <PageHeader
        title="Party members"
        activeTab="blocked"
        tabs={getPartyAdminsTabs(partyShortName)}
      />
      <PageSearchLayer
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        ariaLabel="Search blocked users"
        placeholder="Search blocked users"
      />

      {isLoading && members.length === 0 ? (
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error
            ? error.message
            : "Failed to load blocked users"}
        </div>
      ) : members.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No blocked users found.
        </div>
      ) : (
        <>
          <UsersTable items={members} partyId={partyId} refetch={refetch} />

          {hasNextPage && (
            <div
              ref={sentinelRef}
              className="py-6 flex items-center justify-center text-c-50 text-[14px]"
            >
              {isFetchingNextPage ? (
                <Loader2 className="size-5 animate-spin mr-2" />
              ) : null}
              {isFetchingNextPage
                ? "Loading more blocked users..."
                : "Scroll down to load more"}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
