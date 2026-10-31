import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { partyProfileQueryOptions } from "@/lib/server/parties";
import { PartyHeaderLayout, PartyNavTabs } from "#/components/party";
import { getPageHeader } from "#/lib/shared/meta";

export { partyProfileQueryOptions };

export type PartySearch = {
  chapterId?: number;
};


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

  errorComponent: ({ error }) => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
      <div className="rounded-lg bg-destructive/10 p-6 text-destructive">
        <h2 className="text-lg font-semibold">Error Loading Party Profile</h2>
        <p className="mt-2 text-sm">{error?.message || "Failed to load party profile"}</p>
      </div>
    </div>
  ),

  component: PartyLayoutComponent,
});


function PartyLayoutComponent() {
  // Extract route params (party ID & short name) and optional active chapter filter from query string
  const { partyName, partyId } = Route.useParams();
  const { chapterId } = Route.useSearch();

  // Query full party profile and chapter metadata (cached with infinite staleTime for snappy navigation)
  const { data: profileRes, error } = useQuery(
    partyProfileQueryOptions(partyId, partyName, chapterId)
  );

  if (error) {
    throw error;
  }

  if (profileRes && !profileRes.success) {
    throw new Error(profileRes.message || "Failed to load party profile");
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* 
        Parent layout covering cover image, avatar, identity, member+follow buttons, 
        and follower statistics, encapsulating the inner navigation tabs.
      */}
      <PartyHeaderLayout
        partyId={partyId}
        partyName={partyName}
        chapterId={chapterId}
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
