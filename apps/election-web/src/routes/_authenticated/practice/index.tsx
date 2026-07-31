import { useAuth } from "#/hooks/useAuth";
import { createFileRoute } from "@tanstack/react-router";
import { PollingAgentPracticePage } from "./page-components/PollingAgentPracticePage";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
export const Route = createFileRoute("/_authenticated/practice/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { selectedSupervisorAssignment, selectedAssignment } = useAuth();

  if (selectedSupervisorAssignment) {
    if (selectedSupervisorAssignment.type === "state") {
      return <>State Supervisor</>;
    }
    if (selectedSupervisorAssignment.type === "lga") {
      return <>LGA Supervisor</>;
    }
    if (selectedSupervisorAssignment.type === "ward") {
      return <>Ward Supervisor</>;
    }
  }

  if (selectedAssignment) {
    return (
      <NuqsAdapter>
        <PollingAgentPracticePage />
      </NuqsAdapter>
    );
  }

  return <>Regular User</>;
}
