import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/candidate-results",
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$partyShortName/election-race",
      params: { partyShortName: params.partyShortName },
    });
  },
});
