import { createFileRoute } from "@tanstack/react-router";
import { ProfilePageComponent } from "#/components/profile/profile-page";
import { getPageHeader } from "#/lib/shared/meta";

export const Route = createFileRoute("/_authenticated/profile/$username")({
  head: ({ params }) =>
    getPageHeader({
      title: `${params.username ? `${params.username} Profile` : "Profile"} `,
      description: `View profile and political history for ${params.username || "Chukwu Stanley"} on Free9ja.`,
    }),
  component: ProfilePageComponent,
});
