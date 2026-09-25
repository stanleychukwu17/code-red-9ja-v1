import { createFileRoute, redirect } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";

export const Route = createFileRoute("/_authenticated/profile/$username/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: APP_URL.profile(params.username, "home"),
    });
  },
  component: () => null,
});
