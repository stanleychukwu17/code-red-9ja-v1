import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/party/$partyName/$partyId/social-links",
)({
  component: PartySocialLinksTabComponent,
});

function PartySocialLinksTabComponent() {
  const { partyName } = Route.useParams();

  return (
    <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
      <h3 className="text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
        {partyName} Official Channels
      </h3>
      <p className="mt-2 text-sm max-w-md mx-auto">
        Verified social media channels and official press contacts for {partyName.toUpperCase()}.
      </p>
    </div>
  );
}
