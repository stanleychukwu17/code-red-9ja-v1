import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { Search, Users, Calendar, ShieldCheck, Loader2, ArrowRight, X } from "lucide-react";
import { Input } from "@repo/ui/components/input";
import { Button } from "@repo/ui/components/button";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import { VerificationBadge } from "@repo/ui/components/custom/verification-badge";
import { getPartyMembers, type PartyMemberItem } from "#/lib/server/parties";
import { partyProfileQueryOptions } from "../$partyName.$partyId";
import { APP_URL, QUERY_KEYS } from "#/lib/config";

export const Route = createFileRoute("/_authenticated/party/$partyName/$partyId/members")({
  component: PartyMembersTabComponent,
});

/**
 * Member Card Component
 * Renders individual citizen member tile with avatar, name, verification badge,
 * chapter position badge, join date, and link to profile.
 */
function MemberCard({ member }: { member: PartyMemberItem }) {
  const fullName = [member.first_name, member.last_name].filter(Boolean).join(" ") || member.username || "Member";
  const profileUrl = member.username ? APP_URL.profile(member.username) : "#";

  const joinDate = member.joined_at
    ? new Date(member.joined_at).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : null;

  const initials = (
    (member.first_name?.[0] || "") + (member.last_name?.[0] || member.username?.[0] || "")
  ).toUpperCase() || "M";

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-md">
      {/* Top Header: Avatar + Identity */}
      <div className="flex items-start gap-3.5">
        <Link
          to={profileUrl}
          className="size-13 rounded-full shrink-0 overflow-hidden border border-border/70 bg-muted flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
        >
          {member.avatar ? (
            <img
              src={member.avatar}
              alt={fullName}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-sm font-bold text-muted-foreground">
              {initials}
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={profileUrl}
              className="truncate text-[15px] font-semibold text-foreground hover:text-primary transition-colors"
            >
              {fullName}
            </Link>
            {member.is_verified && (
              <VerificationBadge className="size-4 shrink-0" />
            )}
          </div>

          {member.username && (
            <Link
              to={profileUrl}
              className="block truncate text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            >
              @{member.username}
            </Link>
          )}

          {/* Chapter Position / Membership Status Badge */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {member.position_name ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                {member.position_name}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                Party Member
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Footer: Join Date + View Profile Link */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        {joinDate ? (
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5 shrink-0 text-muted-foreground/70" />
            <span>Joined {joinDate}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground/70" />
            <span>Active Member</span>
          </div>
        )}

        <Link
          to={profileUrl}
          className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary-accent transition-colors"
        >
          <span>Profile</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Skeleton Loader Component
 */
function MemberCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={`skeleton-${i}`}
          className="rounded-2xl border border-border/50 bg-card/60 p-5 animate-pulse"
        >
          <div className="flex items-start gap-3.5">
            <div className="size-13 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
              <div className="h-5 w-20 bg-muted rounded-full mt-2" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/40 flex justify-between">
            <div className="h-3 w-24 bg-muted rounded" />
            <div className="h-3 w-12 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PartyMembersTabComponent() {
  const { partyName, partyId } = Route.useParams();
  const search = Route.useSearch() as { chapterId?: number };
  const chapterId = search?.chapterId;

  // Retrieve chapter metadata from cached parent profile query
  const { data: profileRes } = useQuery(
    partyProfileQueryOptions(partyId, partyName, chapterId),
  );

  const activeChapterType = profileRes?.success ? profileRes.data.chapter_type || "national" : "national";
  const activeChapterGeoName = profileRes?.success ? profileRes.data.chapter_geo_name : undefined;

  // Construct readable chapter title
  const chapterTitle = React.useMemo(() => {
    switch (activeChapterType) {
      case "ward":
        return activeChapterGeoName ? `${activeChapterGeoName} Ward Chapter` : "Ward Chapter";
      case "lga":
        return activeChapterGeoName ? `${activeChapterGeoName} LGA Chapter` : "LGA Chapter";
      case "state":
        return activeChapterGeoName ? `${activeChapterGeoName} State Chapter` : "State Chapter";
      case "zonal":
        return activeChapterGeoName ? `${activeChapterGeoName} Zonal Chapter` : "Zonal Chapter";
      default:
        return "National Chapter";
    }
  }, [activeChapterType, activeChapterGeoName]);

  // Search input and debounce
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 300);

  // Infinite query to fetch paginated chapter members
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: QUERY_KEYS.partyMembers.byChapter(partyId, chapterId, debouncedSearchQuery),
    queryFn: async ({ pageParam }) => {
      const res = await getPartyMembers({
        data: {
          partyId: Number(partyId),
          chapterId: chapterId ? Number(chapterId) : undefined,
          search: debouncedSearchQuery || undefined,
          cursor: pageParam ? Number(pageParam) : undefined,
          limit: 24,
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to load party members");
      }
      return res.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage?.meta?.has_more && lastPage?.meta?.next_cursor) {
        return lastPage.meta.next_cursor;
      }
      return undefined;
    },
    enabled: Boolean(partyId),
  });

  // Flattened member list across pages
  const allMembers = React.useMemo(() => {
    return data?.pages.flatMap((page) => page.members) ?? [];
  }, [data]);

  const totalMemberCount = data?.pages?.[0]?.total_count ?? 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Header Accent with Chapter Context */}
      <div>
        <div className="relative inline-block">
          <h2 className="relative text-xl sm:text-2xl font-bold tracking-tight text-foreground z-2 capitalize">
            {chapterTitle} Members
          </h2>
          <HeaderAccent />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Directory of registered party members and officials enrolled in the {chapterTitle} of {partyName.toUpperCase()}.
        </p>
      </div>

      {/* Control Layer: Search bar and member statistics */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members by name or @username..."
            className="pl-10 pr-9 py-2 rounded-xl text-sm border-border bg-card shadow-xs focus-visible:ring-1"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Member Count Indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground self-start sm:self-center">
          <Users className="size-4 text-primary" />
          <span>
            {totalMemberCount > 0 ? (
              <>
                <strong className="font-semibold text-foreground">
                  {totalMemberCount.toLocaleString()}
                </strong>{" "}
                total enrolled
              </>
            ) : (
              "No registered members"
            )}
          </span>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive">
          <p className="font-semibold text-sm">Failed to load chapter members</p>
          <p className="text-xs text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "An unexpected error occurred"}
          </p>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && <MemberCardsSkeleton />}

      {/* Member Cards Grid */}
      {!isLoading && !isError && allMembers.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allMembers.map((member) => (
              <MemberCard key={`member-${member.membership_id}`} member={member} />
            ))}
          </div>

          {/* Load More Pagination */}
          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="secondary"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-2 rounded-xl text-sm font-medium"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Loading more...
                  </>
                ) : (
                  "Load more members"
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && allMembers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 py-16 px-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
            <Users className="size-7" />
          </div>
          <h4 className="text-base font-semibold text-foreground">
            {searchQuery ? "No matching members found" : "No members registered yet"}
          </h4>
          <p className="mt-1.5 text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? `No members found matching "${searchQuery}" in ${chapterTitle}. Try searching with another name or username.`
              : `There are currently no active registered members in ${chapterTitle}. As citizens join, they will appear here.`}
          </p>
          {searchQuery && (
            <Button
              variant="secondary"
              onClick={() => setSearchQuery("")}
              className="mt-4 text-xs h-8 px-3 rounded-lg"
            >
              Clear search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
