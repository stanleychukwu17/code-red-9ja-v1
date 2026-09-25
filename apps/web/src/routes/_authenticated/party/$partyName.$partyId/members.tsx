import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/party/$partyName/$partyId/members",
)({
  component: PartyMembersTabComponent,
});

function PartyMembersTabComponent() {
  const { partyName } = Route.useParams();

  return (
    <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
      <h3 className="text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
        {partyName} Members Directory
      </h3>
      <p className="mt-2 text-sm max-w-md mx-auto">
        Registered party members and membership verification portal for {partyName.toUpperCase()}.
      </p>
    </div>
  );
}
