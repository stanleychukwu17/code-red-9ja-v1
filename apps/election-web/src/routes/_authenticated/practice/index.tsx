import { useAssignments } from "#/hooks/useAssignments";
import { createFileRoute } from "@tanstack/react-router";
import { PollingAgentPracticePage } from "./page-components/PollingAgentPracticePage";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
export const Route = createFileRoute("/_authenticated/practice/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { supervisorAssignment, pollingUnitAssignment } = useAssignments();

  if (supervisorAssignment) {
    if (supervisorAssignment.type === "state") {
      return <>State Supervisor</>;
    }
    if (supervisorAssignment.type === "lga") {
      return <>LGA Supervisor</>;
    }
    if (supervisorAssignment.type === "ward") {
      return <>Ward Supervisor</>;
    }
  }

  if (pollingUnitAssignment) {
    return (
      <NuqsAdapter>
        <PollingAgentPracticePage />
      </NuqsAdapter>
    );
  }

  return (
    <NuqsAdapter>
      <PollingAgentPracticePage />
    </NuqsAdapter>
  );
}
