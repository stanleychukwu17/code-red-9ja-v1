import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/party/$partyName/$partyId/",
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/party/$partyName/$partyId/home",
      params: {
        partyName: params.partyName,
        partyId: params.partyId,
      },
    });
  },
  component: () => null,
});
