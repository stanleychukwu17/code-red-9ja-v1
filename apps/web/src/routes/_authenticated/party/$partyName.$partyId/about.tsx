import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/party/$partyName/$partyId/about",
)({
  component: PartyAboutTabComponent,
});

function PartyAboutTabComponent() {
  const { partyName } = Route.useParams();

  return (
    <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
      <h3 className="text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
        About {partyName}
      </h3>
      <p className="mt-2 text-sm max-w-md mx-auto">
        Party manifesto, founding ideology, leadership constitution, and key objectives of {partyName.toUpperCase()}.
      </p>
    </div>
  );
}
