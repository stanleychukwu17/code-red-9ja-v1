import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/party/$partyName/$partyId/groups",
)({
  component: PartyGroupsTabComponent,
});

function PartyGroupsTabComponent() {
  const { partyName } = Route.useParams();

  return (
    <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
      <h3 className="text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
        {partyName} Groups & Wings
      </h3>
      <p className="mt-2 text-sm max-w-md mx-auto">
        Youth wings, women caucuses, and grassroots movements affiliated with {partyName.toUpperCase()}.
      </p>
    </div>
  );
}
