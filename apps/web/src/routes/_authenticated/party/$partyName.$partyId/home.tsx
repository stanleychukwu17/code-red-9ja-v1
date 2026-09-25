import { createFileRoute } from "@tanstack/react-router";
import { PartyLeadersCard, type PartyLeader } from "#/components/party";

export const Route = createFileRoute(
  "/_authenticated/party/$partyName/$partyId/home",
)({
  component: PartyHomeTabComponent,
});

const DEFAULT_NATIONAL_LEADERS_1: PartyLeader[] = [
  {
    id: "l1",
    name: "Chris Martins Otse",
    role: "National Chairman",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: "l2",
    name: "Chris Martins Otse",
    role: "National Chairman",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: "l3",
    name: "Chris Martins Otse",
    role: "National Chairman",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
  },
];

const DEFAULT_NATIONAL_LEADERS_2: PartyLeader[] = [
  {
    id: "l4",
    name: "Chris Martins Otse",
    role: "National Chairman",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: "l5",
    name: "Chris Martins Otse",
    role: "National Chairman",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: "l6",
    name: "Chris Martins Otse",
    role: "National Chairman",
    avatar:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=200&auto=format&fit=crop",
  },
];

function PartyHomeTabComponent() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-16">
      <PartyLeadersCard
        title="National leaders"
        leaders={DEFAULT_NATIONAL_LEADERS_1}
        accentColor="#A3E635"
      />
      <PartyLeadersCard
        title="National leaders"
        leaders={DEFAULT_NATIONAL_LEADERS_2}
        accentColor="#A3E635"
      />
    </div>
  );
}
