import { createFileRoute, Outlet } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getPartyProfile } from "@/lib/server/parties";
import { PARTY_PRESETS } from "#/components/parties/party-constants";
import { PartyHeaderLayout, PartyNavTabs } from "#/components/party";
import { getPageHeader } from "#/lib/shared/meta";

export type PartySearch = {
  chapterId?: number;
};

// 1. Define shared query options with staleTime: Infinity
export const partyProfileQueryOptions = (partyId: string, partyName: string, chapterId?: number) => queryOptions({
  queryKey: ["partyProfile", partyId, partyName, chapterId],
  queryFn: () =>
    getPartyProfile({
      data: { partyId: Number(partyId), shortName: partyName, chapterId },
    }),
  staleTime: Infinity,
  gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24h
});

export const Route = createFileRoute("/_authenticated/party/$partyName/$partyId")({
  validateSearch: (search: Record<string, unknown>): PartySearch => {
    const rawChapterId = search?.chapterId;
    const parsed = Number(rawChapterId);
    return {
      chapterId: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
    };
  },

  head: ({ params }) => {
    return getPageHeader({
      title: `${params.partyName.toUpperCase()} Profile`,
      description: `View party details for ${params.partyName}`,
    });
  },

  component: PartyLayoutComponent,
});


function PartyLayoutComponent() {
  // Extract route params (party ID & short name) and optional active chapter filter from query string
  const { partyName, partyId } = Route.useParams();
  const { chapterId } = Route.useSearch();

  // Query full party profile and chapter metadata (cached with infinite staleTime for snappy navigation)
  const { data: profileRes } = useQuery(
    partyProfileQueryOptions(partyId, partyName, chapterId)
  );

  console.log(profileRes);

  // Extract core party attributes and authenticated user affiliation state
  const partyDetails = profileRes?.success ? profileRes.data.data : null;
  const isChapterMember = profileRes?.success ? Boolean(profileRes.data?.is_chapter_member) : false;
  const isFollowing = profileRes?.success ? Boolean(profileRes.data?.is_following) : false;

  // Resolve active chapter tier (e.g. 'national', 'state', 'lga', 'ward')
  const chapterType = profileRes?.success
    ? profileRes.data.chapter_type || profileRes.data.chapter?.chapter_type
    : undefined;

  // Active chapter membership count: members enrolled specifically in this chapter
  const rawChapterMemberCount = profileRes?.success
    ? profileRes.data?.chapter_member_count
    : undefined;
  const chapterMemberCountDisplay =
    rawChapterMemberCount !== undefined && rawChapterMemberCount !== null
      ? Number(rawChapterMemberCount).toLocaleString()
      : "0";

  // National membership count: total verified party members nationwide
  const rawTotalMemberCount = profileRes?.success
    ? (profileRes.data?.national_member_count ?? profileRes.data?.total_members)
    : undefined;
  const totalMemberCountDisplay =
    rawTotalMemberCount !== undefined && rawTotalMemberCount !== null
      ? Number(rawTotalMemberCount).toLocaleString()
      : "0";

  // National follower count: total followers of the party's national chapter (formatted as e.g. '850', '1.2k', '2.5M')
  const rawFollowersCount = profileRes?.success
    ? profileRes.data?.national_followers_count
    : undefined;
  const followersCount =
    rawFollowersCount !== undefined && rawFollowersCount !== null ? Number(rawFollowersCount) : 0;
  const followersDisplay =
    followersCount >= 1_000_000
      ? `${(followersCount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
      : followersCount >= 1_000
        ? `${(followersCount / 1_000).toFixed(1).replace(/\.0$/, "")}k`
        : followersCount.toLocaleString();

  // Party branding, colors, preset themes, and hero banner fallback resolution
  const partyUpper = (partyDetails?.short_name || partyName).toUpperCase();
  const preset = PARTY_PRESETS[partyUpper];

  // party name and short name
  const displayName = partyDetails?.name || "Nigerian Party";
  const displayShortName = partyUpper;

  // banner image and focal position
  const coverPositionY = partyDetails?.cover_position_y ?? preset?.coverPositionY ?? 50;
  const bannerImage =
    partyDetails?.cover_image ||
    preset?.coverImage ||
    "https://images.unsplash.com/photo-1624383045192-cf512eb9d78c?q=80&w=1600&auto=format&fit=crop";

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* 
        Parent layout covering cover image, avatar, identity, member+follow buttons, 
        and follower statistics, encapsulating the inner navigation tabs.
      */}
      <PartyHeaderLayout
        coverImage={bannerImage}
        coverPositionY={coverPositionY}
        logo={partyDetails?.logo || null}
        shortName={displayShortName}
        fullName={displayName}
        isVerified={Boolean(partyDetails?.is_verified)}
        verifications={partyDetails?.verifications}
        chapterName={profileRes?.success ? profileRes.data.chapter?.name : undefined}
        chapterLevel={chapterType}
        chapterType={chapterType}
        followersDisplay={followersDisplay}
        followersValue={followersCount}
        totalMembers={totalMemberCountDisplay}
        chapterMembers={chapterMemberCountDisplay}
        isChapterMemberInitial={isChapterMember}
        isFollowingInitial={isFollowing}
      >
        {/* Inner navigation bar embedded within the header layout */}
        <div className="mt-0">
          <PartyNavTabs partyName={partyName} partyId={partyId} chapterId={chapterId} />
        </div>
      </PartyHeaderLayout>

      {/* Child tab routes render in Outlet */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Outlet />
      </main>
    </div>
  );
}
