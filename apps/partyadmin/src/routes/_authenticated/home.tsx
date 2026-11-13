/**
 * @file Authenticated Home Redirect Route
 * @description Handles direct navigation to /home.
 * Redirects party-affiliated administrators to their scoped tenant dashboard (/:partyShortName/home),
 * or redirects platform administrators to /parties to select an active political party to manage.
 */

import { createFileRoute, redirect } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";
import { getUserDetailsCookie } from "#/lib/server/auth/auth";

export const Route = createFileRoute("/_authenticated/home")({
  beforeLoad: async ({ context }) => {
    const userDetails = (context as any)?.userDetails || (await getUserDetailsCookie());
    const userParty = userDetails?.party?.short_name;

    if (userParty) {
      throw redirect({
        to: APP_URL.partyHome,
        params: { partyShortName: userParty },
      });
    }

    // Platform / Super Admins without a specific party must choose a party
    throw redirect({ to: APP_URL.parties });
  },
  component: () => null,
});
