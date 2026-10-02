import { createFileRoute, Outlet } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getPartyProfile } from "@/lib/server/parties";
import { PARTY_PRESETS } from "#/components/parties/party-constants";
import { PartyHeaderLayout, PartyNavTabs } from "#/components/party";
import { getPageHeader } from "#/lib/shared/meta";

// 1. Define shared query options with staleTime: Infinity
export const partyProfileQueryOptions = (partyId: string, partyName: string) => queryOptions({
  queryKey: ["partyProfile", partyId, partyName],
  queryFn: () =>
    getPartyProfile({
      data: { partyId: Number(partyId), shortName: partyName },
    }),
  staleTime: Infinity,
  gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24h
});

export const Route = createFileRoute("/_authenticated/party/$partyName/$partyId")({
  head: ({ params }) => {
    return getPageHeader({
      title: `${params.partyName.toUpperCase()} Profile`,
      description: `View party details for ${params.partyName}`,
    });
  },
  component: PartyLayoutComponent,
});

function PartyLayoutComponent() {
  const { partyName, partyId } = Route.useParams();

  const { data: profileRes } = useQuery(
    partyProfileQueryOptions(partyId, partyName)
  );

  const partyDetails = profileRes?.success ? profileRes.data.data : null;

  const partyUpper = (partyDetails?.short_name || partyName).toUpperCase();
  const preset = PARTY_PRESETS[partyUpper];

  const displayName = partyDetails?.name || preset?.chairman?.name || "Peoples Democratic Party";
  const displayShortName = partyUpper;

  const bannerImage =
    partyDetails?.cover_image ||
    partyDetails?.background_image ||
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
        logo={partyDetails?.logo || ""}
        shortName={displayShortName}
        fullName={displayName}
        followersDisplay="100k"
        followersValue={100}
        totalMembers="300,000"
        chapterMembers="200,000"
      >
        {/* Inner navigation bar embedded within the header layout */}
        <div className="mt-0">
          <PartyNavTabs partyName={partyName} partyId={partyId} />
        </div>
      </PartyHeaderLayout>

      {/* Child tab routes render in Outlet */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Outlet />
      </main>
    </div>
  );
}
