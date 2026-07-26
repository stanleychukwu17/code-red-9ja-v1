import { createFileRoute } from "@tanstack/react-router";
import { UpdatePollingUnitFlow } from "./components/UpdatePollingUnitSteps";

export const Route = createFileRoute("/_authenticated/update-polling-unit/")({
  component: UpdatePollingUnitFlow,
});
