import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FollowersList } from "#/components/profile/profile-page";
import { userProfileQueryOptions } from "../$username";
import { formatNumber } from "@repo/ui/lib/number";

export const Route = createFileRoute(
  "/_authenticated/profile/$username/followers",
)({
  component: ProfileFollowersTabComponent,
});

function ProfileFollowersTabComponent() {
  const { username } = Route.useParams();
  const { data: profileRes } = useQuery(userProfileQueryOptions(username));
  const count = profileRes?.data?.followers_count ? formatNumber(profileRes.data.followers_count) : "0";

  return <FollowersList count={count} />;
}
