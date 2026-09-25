import { createFileRoute, redirect } from "@tanstack/react-router";
import { ProfilePageComponent } from "#/components/profile/profile-page";
import { getPageHeader } from "#/lib/shared/meta";
import { APP_URL } from "#/lib/config";

export const Route = createFileRoute("/_authenticated/profile/")({
  head: () =>
    getPageHeader({
      title: "My Profile ",
      description: "View your personal profile and civic activity on Free9ja.",
    }),
  beforeLoad: ({ context }) => {
    // If authenticated user has a known username, redirect to their canonical profile URL
    const username = context?.userDetails?.username;
    if (username) {
      throw redirect({
        to: APP_URL.profile(username),
      });
    }
  },
  component: ProfilePageComponent,
});
