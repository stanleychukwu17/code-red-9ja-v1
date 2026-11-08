import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/group/$partyId/$groupId/",
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/group/$partyId/$groupId/home",
      params: {
        partyId: params.partyId,
        groupId: params.groupId,
      },
    });
  },
  component: () => null,
});
