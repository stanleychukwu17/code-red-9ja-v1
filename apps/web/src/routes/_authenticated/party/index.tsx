import { createFileRoute, redirect } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";

export const Route = createFileRoute("/_authenticated/party/")({
  beforeLoad: ({ context }) => {
    const party = context?.userDetails?.party;

    if (party?.short_name && party?.id) {
      throw redirect({
        to: APP_URL.party(party.short_name.toLowerCase(), String(party.id)),
      });
    }

    throw redirect({
      to: APP_URL.parties,
    });
  },
  component: () => null,
});
