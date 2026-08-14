import { useAppContext } from "#/hooks/useAppContext";
import { createFileRoute } from "@tanstack/react-router";
import { GeneralPage } from "./page-components/GeneralPage";
import { LGAElectionSupervisorPage } from "./page-components/LGAElectionSupervisorPage";
import { PollingAgentPage } from "./page-components/PollingAgentPage";
import { StateElectionSupervisorPage } from "./page-components/StateElectionSupervisorPage";
import { WardElectionSupervisorPage } from "./page-components/WardElectionSupervisorPage";

export const Route = createFileRoute("/_authenticated/_home/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { selectedSupervisorAssignment, selectedAssignment } = useAppContext();

  if (selectedSupervisorAssignment) {
    if (selectedSupervisorAssignment.type === "state") {
      return <StateElectionSupervisorPage />;
    }
    if (selectedSupervisorAssignment.type === "lga") {
      return <LGAElectionSupervisorPage />;
    }
    if (selectedSupervisorAssignment.type === "ward") {
      return <WardElectionSupervisorPage />;
    }
  }

  if (selectedAssignment) {
    return <PollingAgentPage />;
  }

  return <GeneralPage />;
}
