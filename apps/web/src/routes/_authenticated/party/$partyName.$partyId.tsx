import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPartyProfile } from "@/lib/server/parties";
import { PARTY_PRESETS } from "#/components/parties/party-constants";
import { PartyEventsCard, PartyHeaderLayout, PartyNavTabs } from "#/components/party";

export const Route = createFileRoute(
  "/_authenticated/party/$partyName/$partyId",
)({
  component: PartyLayoutComponent,
});

function PartyLayoutComponent() {
  const { partyName, partyId } = Route.useParams();

  const { data: profileRes } = useQuery({
    queryKey: ["partyProfile", partyId, partyName],
    queryFn: () =>
      getPartyProfile({
        data: { partyId: Number(partyId), shortName: partyName },
      }),
  });

  const partyDetails = profileRes?.success ? profileRes.data.data : null;

  const partyUpper = (partyDetails?.short_name || partyName).toUpperCase();
  const preset = PARTY_PRESETS[partyUpper];

  const displayName =
    partyDetails?.name || preset?.chairman?.name || "Peoples Democratic Party";
  const displayShortName = partyUpper;

  const bannerImage =
    partyDetails?.cover_image ||
    partyDetails?.background_image ||
    preset?.coverImage ||
    "https://images.unsplash.com/photo-1624383045192-cf512eb9d78c?q=80&w=1600&auto=format&fit=crop";

  const logoImage =
    partyDetails?.logo ||
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop";

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* 
        Parent layout covering cover image, avatar, identity, member+follow buttons, 
        and follower statistics, encapsulating the inner navigation tabs.
      */}
      <PartyHeaderLayout
        coverImage={bannerImage}
        logo={logoImage}
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
