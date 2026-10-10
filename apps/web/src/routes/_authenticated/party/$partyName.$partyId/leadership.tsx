import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/party/$partyName/$partyId/leadership",
)({
  component: PartyLeadershipTabComponent,
});

function PartyLeadershipTabComponent() {
  const { partyName } = Route.useParams();

  return (
    <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
      <h3 className="text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
        {partyName} Leadership
      </h3>
      <p className="mt-2 text-sm max-w-md mx-auto">
        National and executive leadership structure for {partyName.toUpperCase()}.
      </p>
    </div>
  );
}
