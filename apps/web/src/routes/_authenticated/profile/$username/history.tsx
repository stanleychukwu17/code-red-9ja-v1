import { createFileRoute } from "@tanstack/react-router";
import {
  resolveProfile,
  PartyHistoryTimeline,
} from "#/components/profile/profile-page";

export const Route = createFileRoute(
  "/_authenticated/profile/$username/history",
)({
  component: ProfileHistoryTabComponent,
});

function ProfileHistoryTabComponent() {
  const { username } = Route.useParams();
  const profile = resolveProfile(username);

  return (
    <div className="space-y-4">
      <PartyHistoryTimeline events={profile.timeline} />
    </div>
  );
}
