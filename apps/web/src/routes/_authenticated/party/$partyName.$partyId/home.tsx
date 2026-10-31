import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PartyEventsCard, PartyLeadersCard } from "#/components/party";
import { getPartyHome } from "@/lib/server/parties";

export type PartyHomeSearch = {
  chapterId?: number;
};

export const Route = createFileRoute("/_authenticated/party/$partyName/$partyId/home")({
  validateSearch: (search: Record<string, unknown>): PartyHomeSearch => {
    const rawChapterId = search?.chapterId;
    const parsed = Number(rawChapterId);
    const chapterId = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;

    return { chapterId };
  },

  component: PartyHomeTabComponent,
});

function PartyHomeTabComponent() {
  const { partyId, partyName } = Route.useParams();
  const { chapterId } = Route.useSearch();

  // Query party home data (leadership cards, upcoming events, etc.)
  const { data: homeRes, isLoading } = useQuery({
    queryKey: ["partyHome", partyId, chapterId],
    queryFn: () => getPartyHome({ data: { partyId, chapterId } }),
    staleTime: Infinity,
  });

  const homeData = homeRes?.success ? homeRes.data : null;
  const nationalLeaders = homeData?.national_leaders ?? [];
  const dynamicLeaders = homeData?.dynamic_leaders?.leaders ?? [];
  const dynamicTitle = homeData?.dynamic_leaders?.title || "Key state leaders";

  const nationalLeadershipHref = `/party/${partyName}/${partyId}/leadership`;
  const dynamicLeadershipHref = `/party/${partyName}/${partyId}/leadership${chapterId ? `?chapterId=${chapterId}` : ""}`;
  const eventsHref = `/party/${partyName}/${partyId}/events${chapterId ? `?chapterId=${chapterId}` : ""}`;
  const upcomingEvents = homeData?.upcoming_events ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 gap-8 pb-16">
      {/* Card 1: National Executive Leaders (Chairman, Deputy Chairman, Secretary) */}
      <PartyLeadersCard
        title="National leaders"
        leaders={nationalLeaders}
        isLoading={isLoading}
        href={nationalLeadershipHref}
      />

      {/* Card 2: Dynamic Leaders (Key State Chairs if National, or Active Chapter Leaders) */}
      <PartyLeadersCard
        title={dynamicTitle}
        leaders={dynamicLeaders}
        isLoading={isLoading}
        href={dynamicLeadershipHref}
      />

      {/* Card 3: Upcoming Events */}
      <PartyEventsCard
        title="Upcoming events"
        events={upcomingEvents}
        isLoading={isLoading}
        href={eventsHref}
      />
    </div>
  );
}
