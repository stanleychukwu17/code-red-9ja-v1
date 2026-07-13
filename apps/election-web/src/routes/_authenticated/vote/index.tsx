import { createFileRoute } from "@tanstack/react-router";
import { VoteFlow } from "./components/VoteSteps";

export const Route = createFileRoute("/_authenticated/vote/")({
  component: VoteFlow,
});
