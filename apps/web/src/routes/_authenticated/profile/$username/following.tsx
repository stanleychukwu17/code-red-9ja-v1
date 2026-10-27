import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FollowingList } from "#/components/profile/profile-page";
import { userProfileQueryOptions } from "../$username";
import { formatNumber } from "@repo/ui/lib/number";

export const Route = createFileRoute(
  "/_authenticated/profile/$username/following",
)({
  component: ProfileFollowingTabComponent,
});

function ProfileFollowingTabComponent() {
  const { username } = Route.useParams();
  const { data: profileRes } = useQuery(userProfileQueryOptions(username));
  const count = profileRes?.data?.following_count ? formatNumber(profileRes.data.following_count) : "0";

  return <FollowingList count={count} />;
}
