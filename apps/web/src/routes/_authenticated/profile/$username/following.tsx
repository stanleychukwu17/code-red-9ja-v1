import { createFileRoute } from "@tanstack/react-router";
import {
  resolveProfile,
  FollowingList,
} from "#/components/profile/profile-page";

export const Route = createFileRoute(
  "/_authenticated/profile/$username/following",
)({
  component: ProfileFollowingTabComponent,
});

function ProfileFollowingTabComponent() {
  const { username } = Route.useParams();
  const profile = resolveProfile(username);

  return <FollowingList count={profile.followingCount} />;
}
