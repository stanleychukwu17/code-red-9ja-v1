import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { userProfileQueryOptions } from "../$username";

export const Route = createFileRoute(
  "/_authenticated/profile/$username/home",
)({
  component: ProfileHomeTabComponent,
});

function ProfileHomeTabComponent() {
  const { username } = Route.useParams();
  const { data: profileRes } = useQuery(userProfileQueryOptions(username));
  const displayName = profileRes?.data?.name || username;

  return (
    <div className="py-12 text-center text-c-60 border border-dashed border-border rounded-2xl bg-hover-5">
      <h3 className="text-lg font-bold text-c-100">
        {displayName} (@{username})
      </h3>
      <p className="mt-2 text-sm text-c-50 max-w-md mx-auto">
        Overview and profile activities.
      </p>
    </div>
  );
}
