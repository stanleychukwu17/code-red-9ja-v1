import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PartyHistoryTimeline } from "#/components/profile/profile-page";
import { userProfileQueryOptions } from "../$username";

export const Route = createFileRoute(
  "/_authenticated/profile/$username/timeline",
)({
  component: ProfileTimelineTabComponent,
});

function ProfileTimelineTabComponent() {
  const { username } = Route.useParams();
  const { data: profileRes } = useQuery(userProfileQueryOptions(username));
  const events = profileRes?.data?.timeline ?? [];

  return (
    <div className="space-y-4">
      <PartyHistoryTimeline events={events} />
    </div>
  );
}
