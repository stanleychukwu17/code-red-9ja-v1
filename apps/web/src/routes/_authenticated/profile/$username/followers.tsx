import { createFileRoute } from "@tanstack/react-router";
import {
  resolveProfile,
  FollowersList,
} from "#/components/profile/profile-page";

export const Route = createFileRoute(
  "/_authenticated/profile/$username/followers",
)({
  component: ProfileFollowersTabComponent,
});

function ProfileFollowersTabComponent() {
  const { username } = Route.useParams();
  const profile = resolveProfile(username);

  return <FollowersList count={profile.followersCount} />;
}
